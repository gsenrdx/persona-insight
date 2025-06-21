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

export async function POST(req: NextRequest) {
  try {
    const { company_id, project_id, personas, criteria_configuration_id, x_segments_count, y_segments_count } = await req.json()
    
    if (!company_id || !personas || !Array.isArray(personas)) {
      return NextResponse.json({
        error: 'company_id와 personas 배열이 필요합니다',
        success: false
      }, { status: 400 })
    }

    // Separate existing and new personas
    const existingPersonas = personas.filter(p => p.id)
    const newPersonas = personas.filter(p => !p.id)

    // Batch fetch all existing personas data
    let existingPersonasData: Record<string, any> = {}
    if (existingPersonas.length > 0) {
      const existingIds = existingPersonas.map(p => p.id!)
      const { data: existingData, error: fetchError } = await supabase
        .from('personas')
        .select('id, persona_summary, persona_style, painpoints, needs, insight, insight_quote, miso_dataset_id')
        .in('id', existingIds)
      
      if (fetchError) {
        throw fetchError
      }
      
      // Create a map for quick lookup
      existingPersonasData = (existingData || []).reduce((acc, persona) => {
        acc[persona.id] = persona
        return acc
      }, {} as Record<string, any>)
    }

    // Prepare batch update data
    const updateData = existingPersonas.map(persona => {
      const existing = existingPersonasData[persona.id!] || {}
      
      // Calculate coordinate bounds if segment counts provided
      let xBounds, yBounds
      if (x_segments_count && y_segments_count) {
        xBounds = calculateCoordinateBounds(persona.matrix_position.xIndex, x_segments_count)
        yBounds = calculateCoordinateBounds(persona.matrix_position.yIndex, y_segments_count)
      }

      return {
        id: persona.id!,
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
        active: true,
        updated_at: new Date().toISOString(),
        // AI 생성 필드들은 기존 값 보존
        persona_summary: existing.persona_summary || '',
        persona_style: existing.persona_style || '',
        painpoints: existing.painpoints || '',
        needs: existing.needs || '',
        insight: existing.insight || '',
        insight_quote: existing.insight_quote || '',
        miso_dataset_id: existing.miso_dataset_id || null
      }
    })

    // Prepare batch insert data
    const insertData = newPersonas.map(persona => {
      // Calculate coordinate bounds if segment counts provided
      let xBounds, yBounds
      if (x_segments_count && y_segments_count) {
        xBounds = calculateCoordinateBounds(persona.matrix_position.xIndex, x_segments_count)
        yBounds = calculateCoordinateBounds(persona.matrix_position.yIndex, y_segments_count)
      }

      return {
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
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // 새로 생성하는 경우 AI 필드들은 빈 값
        persona_summary: '',
        persona_style: '',
        painpoints: '',
        needs: '',
        insight: '',
        insight_quote: '',
        miso_dataset_id: null
      }
    })

    // Execute batch operations
    const operations = []

    // Batch update existing personas
    if (updateData.length > 0) {
      const updatePromise = supabase
        .from('personas')
        .upsert(updateData, { onConflict: 'id' })
        .select()
      operations.push(updatePromise)
    }

    // Batch insert new personas
    if (insertData.length > 0) {
      const insertPromise = supabase
        .from('personas')
        .insert(insertData)
        .select()
      operations.push(insertPromise)
    }

    // Execute all operations
    const results = await Promise.all(operations)
    
    // Check for errors
    for (const result of results) {
      if (result.error) {
        throw result.error
      }
    }

    return NextResponse.json({ 
      success: true,
      message: '페르소나 동기화가 완료되었습니다',
      summary: {
        created: newPersonas.length,
        updated: existingPersonas.length
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