import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserProfile } from "@/lib/utils/auth-cache"
import { Database } from "@/types/database"
import { maskSensitiveDataRefined } from "@/lib/utils/masking-refined"

export const runtime = 'nodejs'
export const maxDuration = 300 // 5분 타임아웃

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text, projectId } = body;
  
  if (!text || !text.trim()) {
    return new Response('텍스트가 제공되지 않았습니다.', { status: 400 });
  }

  if (!projectId || projectId === 'undefined' || projectId === 'null') {
    return new Response('프로젝트 ID가 제공되지 않았습니다.', { status: 400 });
  }

  // 환경변수 확인
  const MISO_API_URL = process.env.MISO_API_URL || 'https://api.holdings.miso.gs'
  const MISO_API_KEY = process.env.MISO_API_KEY
  if (!MISO_API_KEY) {
    return new Response('API 키가 설정되지 않았습니다.', { status: 500 })
  }

  // 인증 확인
  const authorization = req.headers.get('authorization')
  if (!authorization) {
    return new Response('인증 정보가 필요합니다.', { status: 401 })
  }

  // Supabase 초기화
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 사용자 정보 가져오기
  let userProfile
  try {
    userProfile = await getAuthenticatedUserProfile(authorization, supabase)
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : '인증 처리 중 오류가 발생했습니다.', 
      { status: 401 }
    )
  }
  
  const { userId, companyId, userName } = userProfile

  // 텍스트 마스킹
  let maskedContent: string
  try {
    const { maskedText } = maskSensitiveDataRefined(text)
    maskedContent = maskedText
  } catch (error) {
    return new Response('텍스트 처리 중 오류가 발생했습니다.', { status: 500 })
  }

  try {
    // MISO API 호출
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 290000) // 4분 50초 타임아웃
    
    const workflowResponse = await fetch(
      `${MISO_API_URL}/ext/v1/workflows/run`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MISO_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: {
            context: maskedContent,
            preprocess_type: 'interview'
          },
          mode: 'blocking',
          user: userName
        }),
        signal: controller.signal
      }
    ).finally(() => clearTimeout(timeoutId))
    
    if (!workflowResponse.ok) {
      const errorMessage = await workflowResponse.text().catch(() => '')
      return new Response(JSON.stringify({
        error: 'MISO API 오류',
        message: errorMessage || '외부 API 호출에 실패했습니다.'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 응답 파싱
    const workflowResult = await workflowResponse.json()
    const outputs = workflowResult.data?.outputs || {}
    
    // 새로운 포맷 파싱
    const cleanedScript = outputs.cleaned_script || null
    const sessionInfo = outputs.session_info || null
    const intervieweeProfile = outputs.interviewee_profile || null
    const interviewQualityAssessment = outputs.interview_quality_assessment || null
    const keyTakeaways = outputs.key_takeaways || null
    const primaryPainPoints = outputs.primary_pain_points || null
    const primaryNeeds = outputs.primary_needs || null
    const hmwQuestions = outputs.hmw_questions || null
    
    // DB 저장
    const { data: insertedData, error: insertError } = await supabase
      .from('interviews')
      .insert([{
        company_id: companyId,
        project_id: projectId,
        raw_text: maskedContent,
        cleaned_script: cleanedScript,
        session_info: sessionInfo,
        interviewee_profile: intervieweeProfile,
        interview_quality_assessment: interviewQualityAssessment,
        key_takeaways: keyTakeaways,
        primary_pain_points: primaryPainPoints,
        primary_needs: primaryNeeds,
        hmw_questions: hmwQuestions,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('id')

    if (insertError) {
      return new Response(JSON.stringify({
        error: 'DB 저장 실패',
        message: insertError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      interview_id: insertedData?.[0]?.id || null,
      message: '인터뷰 분석이 완료되었습니다.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return new Response(JSON.stringify({
        error: '시간 초과',
        message: '분석 시간이 초과되었습니다.'
      }), {
        status: 408,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response(JSON.stringify({
      error: '서버 오류',
      message: error.message || '분석 중 오류가 발생했습니다.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}