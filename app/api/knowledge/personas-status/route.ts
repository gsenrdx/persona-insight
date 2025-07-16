import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Check MISO dataset connection status for personas

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
    const { company_id, project_id } = await req.json()

    if (!company_id) {
      return NextResponse.json({
        error: 'company_id가 필요합니다',
        success: false
      }, { status: 400 })
    }


    // Query personas
    let query = supabase
      .from('personas')
      .select('id, persona_type, persona_title, miso_dataset_id')
      .eq('company_id', company_id)
      .eq('active', true)

    if (project_id) {
      query = query.eq('project_id', project_id)
    }

    const { data: personas, error: personasError } = await query

    if (personasError) {
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


    // Check MISO API configuration
    const misoApiKey = process.env.MISO_KNOWLEDGE_API_KEY
    const misoApiUrl = process.env.MISO_API_URL

    if (!misoApiKey || !misoApiUrl) {
      return NextResponse.json({
        error: 'MISO API 설정이 올바르지 않습니다',
        success: false
      }, { status: 500 })
    }


    // Check dataset status for each persona
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
        // Check dataset existence via MISO API
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
          throw new Error(`MISO API call failed: ${misoResponse.status}`)
        }

        await misoResponse.json()
        
        return {
          persona_id: persona.id,
          persona_type: persona.persona_type,
          persona_title: persona.persona_title,
          miso_dataset_id: persona.miso_dataset_id,
          dataset_status: 'connected'
        }

      } catch (error: any) {
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
    return NextResponse.json({
      error: '페르소나 Knowledge 연동 상태 조회 중 오류가 발생했습니다',
      details: error.message,
      success: false
    }, { status: 500 })
  }
}