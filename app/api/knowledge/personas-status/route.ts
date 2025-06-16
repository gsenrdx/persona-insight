import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface PersonaKnowledgeStatus {
  persona_id: string
  persona_type: string
  persona_title: string
  miso_dataset_id: string | null
  dataset_status: 'connected' | 'not_found' | 'no_dataset' | 'error'
  error_message?: string
}

export async function POST(req: NextRequest) {
  try {
    const { company_id, project_id, criteria_configuration_id } = await req.json()

    if (!company_id) {
      return NextResponse.json({
        error: 'company_id가 필요합니다',
        success: false
      }, { status: 400 })
    }

    const requestId = `personas-status-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    console.log(`=== 페르소나 Knowledge 연동 상태 조회 시작 [${requestId}] ===`)
    console.log('company_id:', company_id)
    console.log('project_id:', project_id)
    console.log('criteria_configuration_id:', criteria_configuration_id)

    // 1. 페르소나 목록 조회
    let query = supabase
      .from('personas')
      .select('id, persona_type, persona_title, miso_dataset_id')
      .eq('company_id', company_id)
      .eq('active', true)

    if (project_id) {
      query = query.eq('project_id', project_id)
    }

    if (criteria_configuration_id) {
      query = query.eq('criteria_configuration_id', criteria_configuration_id)
    }

    const { data: personas, error: personasError } = await query

    if (personasError) {
      console.error(`[${requestId}] 페르소나 조회 오류:`, personasError)
      return NextResponse.json({
        error: '페르소나 조회에 실패했습니다',
        details: personasError.message,
        success: false
      }, { status: 500 })
    }

    if (!personas || personas.length === 0) {
      return NextResponse.json({
        success: true,
        message: '조회된 페르소나가 없습니다',
        personas_status: []
      })
    }

    console.log(`[${requestId}] 조회된 페르소나 수: ${personas.length}`)

    // 2. MISO API 설정 확인
    const misoApiKey = process.env.MISO_KNOWLEDGE_API_KEY
    const misoApiUrl = process.env.MISO_API_URL
    const misoApiOwnerId = process.env.MISO_API_OWNER_ID

    if (!misoApiKey || !misoApiUrl) {
      console.error(`[${requestId}] MISO API 설정 오류`)
      return NextResponse.json({
        error: 'MISO API 설정이 올바르지 않습니다',
        success: false
      }, { status: 500 })
    }

    console.log(`[${requestId}] MISO API 소유자 ID: ${misoApiOwnerId || 'not set'}`)

    // 3. 각 페르소나의 데이터셋 상태 확인
    const statusPromises = personas.map(async (persona): Promise<PersonaKnowledgeStatus> => {
      if (!persona.miso_dataset_id) {
        return {
          persona_id: persona.id,
          persona_type: persona.persona_type,
          persona_title: persona.persona_title,
          miso_dataset_id: null,
          dataset_status: 'no_dataset'
        }
      }

      try {
        // MISO API로 특정 데이터셋의 문서 목록을 조회하여 데이터셋 존재 여부 확인
        const misoResponse = await fetch(`${misoApiUrl}/ext/v1/datasets/${persona.miso_dataset_id}/docs`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${misoApiKey}`,
            'Content-Type': 'application/json'
          }
        })

        if (!misoResponse.ok) {
          if (misoResponse.status === 404) {
            return {
              persona_id: persona.id,
              persona_type: persona.persona_type,
              persona_title: persona.persona_title,
              miso_dataset_id: persona.miso_dataset_id,
              dataset_status: 'not_found',
              error_message: '데이터셋을 찾을 수 없습니다'
            }
          }
          throw new Error(`MISO API 호출 실패: ${misoResponse.status}`)
        }

        const docsResponse = await misoResponse.json()
        
        return {
          persona_id: persona.id,
          persona_type: persona.persona_type,
          persona_title: persona.persona_title,
          miso_dataset_id: persona.miso_dataset_id,
          dataset_status: 'connected'
        }

      } catch (error: any) {
        console.error(`[${requestId}] 페르소나 ${persona.persona_type} 데이터셋 상태 확인 오류:`, error)
        return {
          persona_id: persona.id,
          persona_type: persona.persona_type,
          persona_title: persona.persona_title,
          miso_dataset_id: persona.miso_dataset_id,
          dataset_status: 'error',
          error_message: error.message
        }
      }
    })

    const personasStatus = await Promise.all(statusPromises)

    console.log(`=== 페르소나 Knowledge 연동 상태 조회 완료 [${requestId}] ===`)
    console.log('연동 상태 요약:', {
      connected: personasStatus.filter(p => p.dataset_status === 'connected').length,
      not_found: personasStatus.filter(p => p.dataset_status === 'not_found').length,
      no_dataset: personasStatus.filter(p => p.dataset_status === 'no_dataset').length,
      error: personasStatus.filter(p => p.dataset_status === 'error').length
    })

    return NextResponse.json({
      success: true,
      message: '페르소나 Knowledge 연동 상태를 성공적으로 조회했습니다',
      personas_status: personasStatus,
      summary: {
        total: personasStatus.length,
        connected: personasStatus.filter(p => p.dataset_status === 'connected').length,
        not_connected: personasStatus.filter(p => p.dataset_status !== 'connected').length
      }
    })

  } catch (error: any) {
    const requestId = `personas-status-error-${Date.now()}`
    console.error(`페르소나 Knowledge 연동 상태 조회 오류 [${requestId}]:`, error)

    return NextResponse.json({
      error: '페르소나 Knowledge 연동 상태 조회 중 오류가 발생했습니다',
      details: error.message,
      success: false
    }, { status: 500 })
  }
}