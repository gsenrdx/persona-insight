import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from "@/types/supabase"

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

  // Supabase 초기화 (서버용 - realtime 완전 비활성화)
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false
      },
      global: {
        fetch: fetch
      }
    }
  )

  try {
    // 0. 처리 시작을 알리기 위해 metadata 업데이트
    await supabase
      .from('interviews')
      .update({
        updated_at: new Date().toISOString(),
        metadata: {
          processing_started_at: new Date().toISOString(),
          processing_attempt: 1
        }
      })
      .eq('id', interviewId)

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
    
    // 기존 섹션 목록 조회
    let existingSectionNames: string[] = []
    if (company?.id) {
      const { data: sections } = await supabase
        .from('script_sections')
        .select('section_name')
        .eq('company_id', company.id)
      
      if (sections && Array.isArray(sections)) {
        existingSectionNames = sections
          .map(s => s.section_name)
          .filter(Boolean) as string[]
      }
    }
    
    // 기존 key_takeaways 목록 조회
    let existingKeyTakeaways: string[] = []
    if (company?.id) {
      const { data: takeaways } = await supabase
        .from('key_takeaways')
        .select('takeaway_text')
        .eq('company_id', company.id)
      
      if (takeaways && Array.isArray(takeaways)) {
        existingKeyTakeaways = takeaways
          .map(t => t.takeaway_text)
          .filter(Boolean) as string[]
      }
    }

    // 2. MISO API 호출 (이미 processing 상태로 생성됨)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 290000) // 4분 50초 타임아웃
    
    // console.log('[MISO-API-START]', { interviewId, contentLength: maskedContent.length })
    
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
            target_audience: targetAudience,
            interview_sections: existingSectionNames.join(', '),
            key_takeaways: existingKeyTakeaways.join(', ')
          },
          mode: 'blocking',
          user: userName
        }),
        signal: controller.signal
      }
    ).finally(() => clearTimeout(timeoutId))
    
    // console.log('[MISO-API-END]', { interviewId, status: workflowResponse.status })
    
    if (!workflowResponse.ok) {
      const errorMessage = await workflowResponse.text().catch(() => '')
      
      // 실패 상태로 업데이트
      await supabase
        .from('interviews')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
          metadata: {
            error: 'MISO API error',
            status: workflowResponse.status,
            message: errorMessage || workflowResponse.statusText
          }
        })
        .eq('id', interviewId)

      // 실패 상태 - 폴링으로 자동 감지됨

      return new Response(JSON.stringify({
        error: 'MISO API 오류',
        message: errorMessage || '외부 API 호출에 실패했습니다.',
        status: workflowResponse.status
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 3. 응답 파싱
    const workflowResult = await workflowResponse.json()
    const outputs = workflowResult.data?.outputs || {}
    
    // 4. 페르소나 코드를 UUID로 매핑
    let personaCombinationId: string | null = null
    if (outputs.ai_persona_match && typeof outputs.ai_persona_match === 'string') {
      const { data: personaCombination } = await supabase
        .from('persona_combinations')
        .select('id')
        .eq('persona_code', outputs.ai_persona_match)
        .eq('company_id', company?.id)
        .single()
      
      if (personaCombination) {
        personaCombinationId = personaCombination.id
      }
    }

    // 5. DB 업데이트 (성공) - 존재하는 컬럼만 업데이트
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
        script_sections: outputs.script_sections || null,
        persona_combination_id: personaCombinationId,
        
        // 디버깅용 로그
        metadata: {
          miso_outputs: Object.keys(outputs),
          ai_persona_match: outputs.ai_persona_match,
          persona_combination_id: personaCombinationId,
          processing_completed_at: new Date().toISOString()
        } as any,
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

    // 6. 스크립트 섹션 저장 (고유 섹션명만)
    if (outputs.script_sections && Array.isArray(outputs.script_sections)) {
      const companyId = company?.id
      
      if (companyId) {
        // 현재 회사의 모든 섹션 조회
        const { data: existingSections } = await supabase
          .from('script_sections')
          .select('section_name')
          .eq('company_id', companyId)
        
        const existingSectionNames = new Set<string>()
        if (existingSections && Array.isArray(existingSections)) {
          existingSections.forEach(s => {
            if (s.section_name) {
              existingSectionNames.add(s.section_name)
            }
          })
        }
        
        // 새로운 섹션만 필터링
        const newSections = outputs.script_sections
          .filter((section: any) => 
            section.sector_name && 
            !existingSectionNames.has(section.sector_name)
          )
          .map((section: any) => ({
            section_name: section.sector_name,
            company_id: companyId,
            project_id: projectId
          }))
        
        // 새로운 섹션이 있으면 삽입
        if (newSections.length > 0) {
          const { error: insertError } = await supabase
            .from('script_sections')
            .insert(newSections)
          
          if (insertError) {
            // 섹션 저장 실패는 전체 프로세스 실패로 처리하지 않음
            // 에러 로깅 후 계속 진행 (운영환경에서는 실제 로깅 시스템 사용)
          }
        }
      }
    }

    // 7. 핵심 요약(key_takeaways) 저장 (고유 값만)
    if (outputs.key_takeaways && Array.isArray(outputs.key_takeaways)) {
      const companyId = company?.id
      
      if (companyId) {
        // 현재 회사의 모든 key_takeaways 조회
        const { data: existingTakeaways } = await supabase
          .from('key_takeaways')
          .select('takeaway_text')
          .eq('company_id', companyId)
        
        const existingTakeawayTexts = new Set<string>()
        if (existingTakeaways && Array.isArray(existingTakeaways)) {
          existingTakeaways.forEach(t => {
            if (t.takeaway_text) {
              existingTakeawayTexts.add(t.takeaway_text)
            }
          })
        }
        
        // 새로운 takeaways만 필터링
        const newTakeaways = outputs.key_takeaways
          .filter((takeaway: string) => 
            takeaway && 
            !existingTakeawayTexts.has(takeaway)
          )
          .map((takeaway: string) => ({
            takeaway_text: takeaway,
            company_id: companyId,
            project_id: projectId
          }))
        
        // 새로운 takeaways가 있으면 삽입
        if (newTakeaways.length > 0) {
          const { error: insertError } = await supabase
            .from('key_takeaways')
            .insert(newTakeaways)
          
          if (insertError) {
            // takeaways 저장 실패는 전체 프로세스 실패로 처리하지 않음
            // 에러 로깅 후 계속 진행 (운영환경에서는 실제 로깅 시스템 사용)
          }
        }
      }
    }

    // 처리 완료 - 폴링으로 자동 감지됨

    return new Response(JSON.stringify({
      success: true,
      message: '인터뷰 처리가 완료되었습니다.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    // 에러 로깅 (개발용 - 운영에서는 실제 로깅 시스템 사용)
    // console.error('Process workflow error:', { name: error.name, message: error.message, interviewId })
    
    // 오류 발생 시 상태 업데이트
    const errorInfo = {
      error: error.name || 'ProcessingError',
      message: error.message || '분석 중 오류가 발생했습니다.',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
    
    await supabase
      .from('interviews')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
        metadata: errorInfo as any
      })
      .eq('id', interviewId)

    // 실패 상태 - 폴링으로 자동 감지됨

    if (error.name === 'AbortError') {
      return new Response(JSON.stringify({
        error: '시간 초과',
        message: '분석 시간이 초과되었습니다. (5분)'
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