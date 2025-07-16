import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // Extract user information from Authorization header
    const authorization = req.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json(
        { error: '인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    // Extract user information from JWT token
    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '인증에 실패했습니다' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('avatar') as File

    if (!file) {
      return NextResponse.json(
        { error: '파일이 필요합니다' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return NextResponse.json(
        { error: 'JPG, PNG, WebP 형식의 이미지만 업로드 가능합니다' },
        { status: 400 }
      )
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: '파일 크기는 5MB 이하여야 합니다' },
        { status: 400 }
      )
    }

    // Get current profile to check for existing avatar
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json(
        { error: '프로필을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // Delete existing avatar if exists
    if (profile.avatar_url) {
      try {
        // Extract file path from URL
        const url = new URL(profile.avatar_url)
        const pathSegments = url.pathname.split('/')
        const bucketIndex = pathSegments.findIndex(segment => segment === 'interview-files')
        if (bucketIndex !== -1 && bucketIndex < pathSegments.length - 1) {
          const filePath = pathSegments.slice(bucketIndex + 1).join('/')
          await supabase.storage
            .from('interview-files')
            .remove([filePath])
        }
      } catch (error) {
        // Ignore errors when deleting old avatar
        console.error('Error deleting old avatar:', error)
      }
    }

    // Generate unique file path
    const timestamp = new Date().getTime()
    const fileExtension = file.name.split('.').pop()
    const filePath = `avatars/${user.id}/${timestamp}.${fileExtension}`

    // Upload file to Supabase Storage
    const fileBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('interview-files')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: `파일 업로드에 실패했습니다: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('interview-files')
      .getPublicUrl(filePath)

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      // Delete uploaded file if profile update fails
      await supabase.storage
        .from('interview-files')
        .remove([filePath])
      
      return NextResponse.json(
        { error: `프로필 업데이트에 실패했습니다: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '프로필 사진이 업데이트되었습니다',
      avatar_url: publicUrl
    })

  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json(
      { error: `업로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Extract user information from Authorization header
    const authorization = req.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json(
        { error: '인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    // Extract user information from JWT token
    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '인증에 실패했습니다' },
        { status: 401 }
      )
    }

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json(
        { error: '프로필을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (!profile.avatar_url) {
      return NextResponse.json(
        { error: '삭제할 프로필 사진이 없습니다' },
        { status: 400 }
      )
    }

    // Delete file from storage
    try {
      // Extract file path from URL
      const url = new URL(profile.avatar_url)
      const pathSegments = url.pathname.split('/')
      const bucketIndex = pathSegments.findIndex(segment => segment === 'interview-files')
      if (bucketIndex !== -1 && bucketIndex < pathSegments.length - 1) {
        const filePath = pathSegments.slice(bucketIndex + 1).join('/')
        await supabase.storage
          .from('interview-files')
          .remove([filePath])
      }
    } catch (error) {
      // Continue even if file deletion fails
      console.error('Error deleting avatar file:', error)
    }

    // Update profile to remove avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error (DELETE):', updateError)
      return NextResponse.json(
        { error: `프로필 업데이트에 실패했습니다: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '프로필 사진이 삭제되었습니다'
    })

  } catch (error) {
    console.error('Avatar delete error:', error)
    return NextResponse.json(
      { error: `삭제 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}