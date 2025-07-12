import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from "@/types/supabase"

export const runtime = 'nodejs'
export const maxDuration = 300 // 5분 타임아웃

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, userName } = body
  
  if (!projectId) {
    return new Response('projectId가 필요합니다.', { status: 400 })
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
    // 1. 프로젝트 정보 조회
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        purpose,
        target_audience,
        research_method,
        start_date,
        end_date,
        company:companies!projects_company_id_fkey (
          id,
          name,
          description
        )
      `)
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return new Response(JSON.stringify({
        error: '프로젝트 정보 조회 실패',
        message: projectError?.message || '프로젝트를 찾을 수 없습니다.'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 2. 프로젝트의 모든 완료된 인터뷰 조회 (삭제된 인터뷰 제외)
    const { data: interviews, error: interviewsError } = await supabase
      .from('interviews')
      .select(`
        id,
        title,
        key_takeaways,
        primary_pain_points,
        primary_needs,
        ai_persona_match,
        created_at,
        updated_at
      `)
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (interviewsError) {
      return new Response(JSON.stringify({
        error: '인터뷰 조회 실패',
        message: interviewsError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!interviews || interviews.length === 0) {
      return new Response(JSON.stringify({
        error: '분석된 인터뷰가 없습니다',
        message: '프로젝트에 완료된 인터뷰가 없습니다.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 3. 프로젝트 메타데이터를 XML 태그로 구성
    const projectMetadata = `
<project_info>
  <name>${project.name}</name>
  <description>${project.description || ''}</description>
  <purpose>${project.purpose || ''}</purpose>
  <target_audience>${project.target_audience || ''}</target_audience>
  <research_method>${project.research_method || ''}</research_method>
  <start_date>${project.start_date || ''}</start_date>
  <end_date>${project.end_date || ''}</end_date>
  <company_name>${project.company?.name || ''}</company_name>
  <company_description>${project.company?.description || ''}</company_description>
</project_info>

<interviews_summary>
  <total_count>${interviews.length}</total_count>
  <date_range>
    <earliest>${interviews[interviews.length - 1]?.created_at || ''}</earliest>
    <latest>${interviews[0]?.created_at || ''}</latest>
  </date_range>
</interviews_summary>

<insights_data>
  <key_takeaways>
    ${interviews.map(interview => 
      interview.key_takeaways?.map(takeaway => `<takeaway>${takeaway}</takeaway>`).join('') || ''
    ).join('')}
  </key_takeaways>
  
  <pain_points>
    ${interviews.map(interview => 
      interview.primary_pain_points?.map(pp => `<pain_point>${pp.description}</pain_point>`).join('') || ''
    ).join('')}
  </pain_points>
  
  <needs>
    ${interviews.map(interview => 
      interview.primary_needs?.map(need => `<need>${need.description}</need>`).join('') || ''
    ).join('')}
  </needs>
  
  <personas>
    ${interviews.map(interview => 
      interview.ai_persona_match?.name_ko ? `<persona>${interview.ai_persona_match.name_ko}</persona>` : ''
    ).join('')}
  </personas>
</insights_data>
    `.trim()

    // 4. MISO API 호출
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
            context: projectMetadata,
            preprocess_type: 'insight_summary'
          },
          mode: 'blocking',
          user: userName || 'system'
        }),
        signal: controller.signal
      }
    ).finally(() => clearTimeout(timeoutId))
    
    if (!workflowResponse.ok) {
      const errorMessage = await workflowResponse.text().catch(() => '')
      
      return new Response(JSON.stringify({
        error: 'MISO API 오류',
        message: errorMessage || '외부 API 호출에 실패했습니다.',
        status: workflowResponse.status
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 5. 응답 파싱
    const workflowResult = await workflowResponse.json()
    const outputs = workflowResult.data?.outputs || {}
    const summaryText = outputs.result || ''

    if (!summaryText) {
      return new Response(JSON.stringify({
        error: '요약 생성 실패',
        message: 'MISO API에서 요약 결과를 받을 수 없습니다.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 6. 프로젝트 요약 저장/업데이트
    const { error: upsertError } = await supabase
      .from('project_summaries')
      .upsert({
        project_id: projectId,
        summary_text: summaryText,
        interview_count_at_creation: interviews.length,
        last_interview_id: interviews[0]?.id || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'project_id'
      })

    if (upsertError) {
      return new Response(JSON.stringify({
        error: 'DB 저장 실패',
        message: upsertError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: '프로젝트 요약이 성공적으로 생성되었습니다.',
      summary: summaryText,
      interview_count: interviews.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return new Response(JSON.stringify({
        error: '시간 초과',
        message: '요약 생성 시간이 초과되었습니다. (5분)'
      }), {
        status: 408,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response(JSON.stringify({
      error: '서버 오류',
      message: error.message || '요약 생성 중 오류가 발생했습니다.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}