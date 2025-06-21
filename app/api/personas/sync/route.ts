import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Sync personas with matrix positions and dataset IDs

interface PersonaData {
  id?: string // 기존 페르소나 ID (있으면 업데이트, 없으면 생성)
  persona_type: string
  persona_title: string
  persona_description: string
  thumbnail: string | null
  matrix_position: {
    xIndex: number
    yIndex: number
    coordinate: string
  }
}

// 좌표 범위 계산 함수
function calculateCoordinateBounds(index: number, segmentCount: number): { min: number, max: number } {
  const segmentSize = 100 / segmentCount
  const min = index * segmentSize
  const max = (index + 1) * segmentSize
  return { min, max }
}

// Get existing MISO dataset ID for persona
async function getPersonaDatasetId(persona: PersonaData): Promise<string | null> {
  if (persona.id) {
    const { data: existingPersona, error: personaError } = await supabase
      .from('personas')
      .select('miso_dataset_id')
      .eq('id', persona.id)
      .single()

    if (personaError) {
      return null
    } else if (existingPersona?.miso_dataset_id) {
      return existingPersona.miso_dataset_id
    }
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const { company_id, project_id, personas, criteria_configuration_id, x_segments_count, y_segments_count } = await req.json()
    
    if (!company_id || !personas || !Array.isArray(personas)) {
      return NextResponse.json({
        error: 'company_id와 personas 배열이 필요합니다',
        success: false
      }, { status: 400 })
    }


    // Process each persona
    const upsertOperations = personas.map(async (persona: PersonaData) => {
      // Get existing MISO dataset ID if available
      let personaDatasetId: string | null = null
      try {
        personaDatasetId = await getPersonaDatasetId(persona)
      } catch (error: any) {
        // Ignore dataset retrieval errors
      }

      // Calculate coordinate bounds if segment counts provided
      let xBounds, yBounds
      if (x_segments_count && y_segments_count) {
        xBounds = calculateCoordinateBounds(persona.matrix_position.xIndex, x_segments_count)
        yBounds = calculateCoordinateBounds(persona.matrix_position.yIndex, y_segments_count)
      }

      const personaData = {
        company_id,
        project_id: project_id || null,
        persona_type: persona.persona_type,
        persona_title: persona.persona_title,
        persona_description: persona.persona_description,
        thumbnail: persona.thumbnail,
        matrix_position: persona.matrix_position,
        ...(xBounds && { x_min: xBounds.min, x_max: xBounds.max }),
        ...(yBounds && { y_min: yBounds.min, y_max: yBounds.max }),
        ...(criteria_configuration_id && { criteria_configuration_id }),
        ...(personaDatasetId && { miso_dataset_id: personaDatasetId }),
        active: true,
        updated_at: new Date().toISOString()
      }

      if (persona.id) {
        // Update existing persona
        const { data: existing } = await supabase
          .from('personas')
          .select('persona_summary, persona_style, painpoints, needs, insight, insight_quote, miso_dataset_id')
          .eq('id', persona.id)
          .single()
        
        const { data: updateResult, error } = await supabase
          .from('personas')
          .update({
            ...personaData,
            // AI 생성 필드들은 기존 값 보존
            persona_summary: existing?.persona_summary || '',
            persona_style: existing?.persona_style || '',
            painpoints: existing?.painpoints || '',
            needs: existing?.needs || '',
            insight: existing?.insight || '',
            insight_quote: existing?.insight_quote || '',
            miso_dataset_id: existing?.miso_dataset_id || personaDatasetId
          })
          .eq('id', persona.id)
          .select()

        if (error) {
          throw error
        }
      } else {
        // Create new persona
        const { data: insertResult, error } = await supabase
          .from('personas')
          .insert([{
            ...personaData,
            // 새로 생성하는 경우 AI 필드들은 빈 값
            persona_summary: '',
            persona_style: '',
            painpoints: '',
            needs: '',
            insight: '',
            insight_quote: '',
            miso_dataset_id: personaDatasetId,
            created_at: new Date().toISOString()
          }])
          .select()

        if (error) {
          throw error
        }
      }
    })

    // Execute all upsert operations
    await Promise.all(upsertOperations)

    const created = personas.filter(p => !p.id).length
    const updated = personas.filter(p => p.id).length

    return NextResponse.json({ 
      success: true,
      message: '페르소나 동기화가 완료되었습니다',
      summary: {
        created,
        updated
      }
    })

  } catch (error: any) {
    return NextResponse.json({ 
      error: '페르소나 동기화 중 오류가 발생했습니다',
      details: error.message,
      success: false
    }, { status: 500 })
  }
}