import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'

// 이미지 파일 업로드 및 persona_combinations 테이블 업데이트
export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({
        error: '인증이 필요합니다',
        success: false
      }, { status: 401 })
    }

    // Supabase 클라이언트 초기화
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 사용자 프로필 조회
    const userProfile = await getAuthenticatedUserProfile(authHeader, supabase)
    
    // 권한 확인 제거 - 모든 사용자가 페르소나 이미지 업로드 가능
    // if (userProfile.role !== 'super_admin' && userProfile.role !== 'company_admin') {
    //   return NextResponse.json({
    //     error: '권한이 없습니다',
    //     success: false
    //   }, { status: 403 })
    // }

    // FormData 파싱
    const formData = await req.formData()
    const imageFile = formData.get('image') as File
    const combinationKey = formData.get('combinationKey') as string

    if (!imageFile || !combinationKey) {
      return NextResponse.json({
        error: '이미지 파일과 조합 키가 필요합니다',
        success: false
      }, { status: 400 })
    }

    // 파일 유효성 검사
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json({
        error: '이미지 파일만 업로드 가능합니다',
        success: false
      }, { status: 400 })
    }

    // 파일 크기 검사 (5MB 제한)
    if (imageFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({
        error: '파일 크기는 5MB 이하로 제한됩니다',
        success: false
      }, { status: 400 })
    }

    // 파일명 생성 (company_id + combination_key + timestamp + extension)
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${userProfile.companyId}/${combinationKey}_${Date.now()}.${fileExt}`
    
    // Supabase Storage에 파일 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('persona-images')
      .upload(fileName, imageFile, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({
        error: '이미지 업로드에 실패했습니다',
        success: false
      }, { status: 500 })
    }

    // 업로드된 파일의 공개 URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from('persona-images')
      .getPublicUrl(fileName)

    // persona_combinations 테이블의 해당 조합 찾기 및 업데이트
    const { data: combination, error: findError } = await supabase
      .from('persona_combinations')
      .select('id')
      .eq('company_id', userProfile.companyId)
      .eq('persona_code', combinationKey)
      .single()

    if (findError || !combination) {
      // 업로드된 파일 삭제
      await supabase.storage.from('persona-images').remove([fileName])
      
      return NextResponse.json({
        error: '해당하는 페르소나 조합을 찾을 수 없습니다',
        success: false
      }, { status: 404 })
    }

    // thumbnail 필드 업데이트
    const { error: updateError } = await supabase
      .from('persona_combinations')
      .update({
        thumbnail: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', combination.id)

    if (updateError) {
      console.error('Database update error:', updateError)
      // 업로드된 파일 삭제
      await supabase.storage.from('persona-images').remove([fileName])
      
      return NextResponse.json({
        error: '데이터베이스 업데이트에 실패했습니다',
        success: false
      }, { status: 500 })
    }

    return NextResponse.json({
      imageUrl: publicUrl,
      success: true
    })

  } catch (error) {
    console.error('Upload image error:', error)
    return NextResponse.json({
      error: '이미지 업로드 중 오류가 발생했습니다',
      success: false
    }, { status: 500 })
  }
}