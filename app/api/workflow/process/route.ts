import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from "@/types/database"

export const runtime = 'nodejs'
export const maxDuration = 300 // 5분 타임아웃

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { interviewId, maskedContent, userName, projectId } = body;
  
  if (!interviewId || !maskedContent || !projectId) {
    return new Response('필수 파라미터가 누락되었습니다.', { status: 400 });
  }

  // 환경변수 확인
  const MISO_API_URL = process.env.MISO_API_URL || 'https://api.holdings.miso.gs'
  const MISO_API_KEY = process.env.MISO_API_KEY
  if (!MISO_API_KEY) {
    return new Response('API 키가 설정되지 않았습니다.', { status: 500 })
  }

  // Supabase 초기화
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // 1. 프로젝트 및 회사 정보 조회
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select(`
        id,
        project:projects!interviews_project_id_fkey (
          id,
          name,
          description,
          purpose,
          target_audience,
          research_method,
          company:companies!projects_company_id_fkey (
            id,
            name,
            description
          )
        )
      `)
      .eq('id', interviewId)
      .single()

    if (interviewError || !interview) {
      return new Response(JSON.stringify({
        error: '인터뷰 정보 조회 실패',
        message: interviewError?.message || '인터뷰를 찾을 수 없습니다.'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const project = interview.project
    const company = project?.company

    // 회사 정보는 마스킹하지 않고 그대로 사용
    const companyName = company?.name || ''
    const companyInfo = company?.description || ''
    const interviewObjective = project?.purpose || ''
    const targetAudience = project?.target_audience || ''
    

    // 2. 상태를 processing으로 업데이트
    const { error: statusError } = await supabase
      .from('interviews')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', interviewId)

    if (statusError) {
      return new Response(JSON.stringify({
        error: 'DB 업데이트 실패',
        message: statusError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 2. MISO API 호출
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
            preprocess_type: 'interview',
            company_name: companyName,
            company_info: companyInfo,
            interview_objective: interviewObjective,
            target_audience: targetAudience
          },
          mode: 'blocking',
          user: userName
        }),
        signal: controller.signal
      }
    ).finally(() => clearTimeout(timeoutId))
    
    if (!workflowResponse.ok) {
      const errorMessage = await workflowResponse.text().catch(() => '')
      
      // 실패 상태로 업데이트
      await supabase
        .from('interviews')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', interviewId)

      return new Response(JSON.stringify({
        error: 'MISO API 오류',
        message: errorMessage || '외부 API 호출에 실패했습니다.'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 3. 응답 파싱
    const workflowResult = await workflowResponse.json()
    const outputs = workflowResult.data?.outputs || {}
    
    // 4. DB 업데이트 (성공)
    const { error: updateError } = await supabase
      .from('interviews')
      .update({
        status: 'completed',
        cleaned_script: outputs.cleaned_script || null,
        session_info: outputs.session_info || null,
        interviewee_profile: outputs.interviewee_profile || null,
        interview_quality_assessment: outputs.interview_quality_assessment || null,
        key_takeaways: outputs.key_takeaways || null,
        primary_pain_points: outputs.primary_pain_points || null,
        primary_needs: outputs.primary_needs || null,
        hmw_questions: outputs.hmw_questions || null,
        ai_persona_match: outputs.ai_persona_match || null,
        ai_persona_explanation: outputs.ai_persona_explanation || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', interviewId)

    if (updateError) {
      return new Response(JSON.stringify({
        error: 'DB 업데이트 실패',
        message: updateError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: '인터뷰 처리가 완료되었습니다.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    // 오류 발생 시 상태 업데이트
    await supabase
      .from('interviews')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', interviewId)

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