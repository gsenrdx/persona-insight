import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'

// 서비스 역할 키를 사용하는 Supabase 클라이언트
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // params를 await
    const { id } = await params
    
    // Bearer 토큰 추출 및 사용자 정보 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        error: '인증이 필요합니다',
        success: false
      }, { status: 401 })
    }

    // 캐시된 사용자 프로필 가져오기
    const userProfile = await getAuthenticatedUserProfile(authHeader, supabaseAdmin)
    const { userId, companyId } = userProfile
    
    const { personaDefinitionId } = await request.json()
    
    if (!personaDefinitionId) {
      return NextResponse.json({
        error: 'persona_definition_id가 필요합니다',
        success: false
      }, { status: 400 })
    }

    // 인터뷰 정보와 프로젝트 정보 가져오기
    const { data: interview, error: interviewError } = await supabaseAdmin
      .from('interviews')
      .select(`
        id,
        project_id,
        company_id,
        persona_id,
        ai_persona_match
      `)
      .eq('id', id)
      .single()

    if (interviewError || !interview) {
      return NextResponse.json({
        error: '인터뷰를 찾을 수 없습니다',
        success: false
      }, { status: 404 })
    }

    // 선택한 persona_definition의 id를 confirmed_persona_definition_id에 할당
    const { data: updatedInterview, error: updateError } = await supabaseAdmin
      .from('interviews')
      .update({ 
        confirmed_persona_definition_id: personaDefinitionId
      })
      .eq('id', id)
      .select(`
        *,
        ai_persona_definition:persona_definitions!ai_persona_match (
          id,
          name_ko,
          name_en
        ),
        confirmed_persona_definition:persona_definitions!interviews_confirmed_persona_definition_id_fkey (
          id,
          name_ko,
          name_en
        )
      `)
      .single()

    if (updateError) {
      return NextResponse.json({
        error: `페르소나 할당에 실패했습니다: ${updateError.message}`,
        success: false
      }, { status: 500 })
    }

    return NextResponse.json({
      data: updatedInterview,
      success: true
    })

  } catch (error) {
    return NextResponse.json({
      error: '서버 오류가 발생했습니다',
      success: false
    }, { status: 500 })
  }
}