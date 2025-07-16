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
    
    const { personaCombinationId } = await request.json()
    
    if (!personaCombinationId) {
      return NextResponse.json({
        error: 'persona_combination_id가 필요합니다',
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
        persona_combination_id
      `)
      .eq('id', id)
      .single()

    if (interviewError || !interview) {
      return NextResponse.json({
        error: '인터뷰를 찾을 수 없습니다',
        success: false
      }, { status: 404 })
    }

    // 선택한 persona_combination의 id를 persona_combination_id에 할당
    const { data: updatedInterview, error: updateError } = await supabaseAdmin
      .from('interviews')
      .update({ 
        persona_combination_id: personaCombinationId
      })
      .eq('id', id)
      .select(`
        *,
        persona_combination:persona_combinations(id, persona_code, type_ids, title, description)
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