import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Download interview files with authorization checks

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const intervieweeId = searchParams.get('id')
  
  if (!intervieweeId) {
    return new NextResponse('인터뷰 ID가 필요합니다.', { status: 400 })
  }

  // Extract user information from Authorization header
  const authorization = req.headers.get('authorization')
  if (!authorization) {
    return new NextResponse('인증 정보가 필요합니다.', { status: 401 })
  }

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Extract user information from JWT token
    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new NextResponse('인증에 실패했습니다.', { status: 401 })
    }

    // Get user's company information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.company_id) {
      return new NextResponse('사용자 정보를 찾을 수 없습니다.', { status: 400 })
    }

    // Get interview information with company authorization check
    const { data: interview, error: interviewError } = await supabase
      .from('interviewees')
      .select('file_path, company_id')
      .eq('id', intervieweeId)
      .eq('company_id', profile.company_id)
      .single()

    if (interviewError || !interview) {
      return new NextResponse('인터뷰를 찾을 수 없습니다.', { status: 404 })
    }

    if (!interview.file_path) {
      return new NextResponse('첨부된 파일이 없습니다.', { status: 404 })
    }

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('interview-files')
      .download(interview.file_path)

    if (downloadError || !fileData) {
      return new NextResponse('파일을 다운로드할 수 없습니다.', { status: 404 })
    }

    // Extract original filename from path
    const originalFileName = interview.file_path.split('/').pop()?.replace(/^\d+_/, '') || 'download'

    // Return file as stream
    const headers = new Headers()
    headers.set('Content-Type', fileData.type || 'application/octet-stream')
    headers.set('Content-Disposition', `attachment; filename="${originalFileName}"`)
    
    return new NextResponse(fileData.stream(), {
      status: 200,
      headers
    })

  } catch (error) {
    return new NextResponse('파일 다운로드 중 오류가 발생했습니다.', { status: 500 })
  }
}