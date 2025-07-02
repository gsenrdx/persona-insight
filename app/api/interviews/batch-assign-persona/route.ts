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

interface BatchAssignmentRequest {
  assignments: {
    interviewId: string
    personaDefinitionId: string
  }[]
}

export async function POST(request: NextRequest) {
  try {
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
    
    const { assignments }: BatchAssignmentRequest = await request.json()
    
    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({
        error: '할당 정보가 필요합니다',
        success: false
      }, { status: 400 })
    }

    // 결과 추적
    const results = {
      success: 0,
      failed: 0,
      errors: [] as { interviewId: string; error: string }[]
    }

    // AI 추천 반영: ai_persona_match를 confirmed_persona_definition_id로 복사
    const assignmentPromises = assignments.map(async ({ interviewId, personaDefinitionId }) => {
      try {
        // 인터뷰 정보 확인
        const { data: interview, error: interviewError } = await supabaseAdmin
          .from('interviews')
          .select('id, ai_persona_match, confirmed_persona_definition_id')
          .eq('id', interviewId)
          .single()

        if (interviewError || !interview) {
          results.failed++
          results.errors.push({ interviewId, error: '인터뷰를 찾을 수 없습니다' })
          return
        }

        // 이미 할당된 경우 건너뛰기
        if (interview.confirmed_persona_definition_id) {
          results.success++
          return
        }

        // AI 추천이 없는 경우
        if (!interview.ai_persona_match) {
          results.failed++
          results.errors.push({ interviewId, error: 'AI 추천이 없습니다' })
          return
        }

        // ai_persona_match를 confirmed_persona_definition_id로 복사
        const { error: updateError } = await supabaseAdmin
          .from('interviews')
          .update({ confirmed_persona_definition_id: interview.ai_persona_match })
          .eq('id', interviewId)

        if (updateError) {
          results.failed++
          results.errors.push({ interviewId, error: `할당 실패: ${updateError.message}` })
          return
        }

        results.success++
      } catch (error) {
        results.failed++
        results.errors.push({ 
          interviewId, 
          error: error instanceof Error ? error.message : '알 수 없는 오류' 
        })
      }
    })

    // 모든 할당 작업을 병렬로 실행
    await Promise.all(assignmentPromises)

    return NextResponse.json({
      success: true,
      results: {
        totalCount: assignments.length,
        successCount: results.success,
        failedCount: results.failed,
        errors: results.errors
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: '서버 오류가 발생했습니다',
      success: false
    }, { status: 500 })
  }
}