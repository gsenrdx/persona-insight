import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    const requestId = `sync-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    console.log(`=== 페르소나 동기화 시작 [${requestId}] ===`)
    console.log('company_id:', company_id)
    console.log('project_id:', project_id)
    console.log('요청된 페르소나들:', personas.map(p => ({ id: p.id, type: p.persona_type })))
    console.log('요청된 페르소나 ID들:', personas.filter(p => p.id).map(p => p.id))

    // 비활성화 로직 제거 - 순수하게 ID 기반으로만 처리

    // 5. 각 페르소나 처리 (ID 기반)
    const upsertOperations = personas.map(async (persona: PersonaData) => {
      // 좌표 범위 계산 (x_segments_count, y_segments_count가 있는 경우)
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
        // 좌표 범위 추가 (있는 경우만)
        ...(xBounds && { x_min: xBounds.min, x_max: xBounds.max }),
        ...(yBounds && { y_min: yBounds.min, y_max: yBounds.max }),
        // criteria_configuration_id 추가 (있는 경우만)
        ...(criteria_configuration_id && { criteria_configuration_id }),
        active: true, // 새로 저장되는 것들은 모두 활성화
        updated_at: new Date().toISOString()
      }

      if (persona.id) {
        // ID가 있으면 기존 페르소나 업데이트
        console.log(`페르소나 ${persona.persona_type} 업데이트: ID ${persona.id}`)
        
        // 기존 데이터의 AI 생성 필드들 보존
        const { data: existing } = await supabase
          .from('personas')
          .select('persona_summary, persona_style, painpoints, needs, insight, insight_quote')
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
            insight_quote: existing?.insight_quote || ''
          })
          .eq('id', persona.id)
          .select()

        if (error) {
          console.error(`페르소나 ${persona.persona_type} 업데이트 오류:`, error)
          throw error
        }

        console.log(`페르소나 ${persona.persona_type} 업데이트 결과:`, updateResult?.length || 0, '행 영향받음')
        
        if (!updateResult || updateResult.length === 0) {
          console.error(`페르소나 ${persona.persona_type} (ID: ${persona.id}) 업데이트 실패 - 해당 ID가 존재하지 않음`)
        }
      } else {
        // ID가 없으면 새로 생성
        console.log(`페르소나 ${persona.persona_type} 새로 생성 (ID가 없음)`)
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
            created_at: new Date().toISOString()
          }])
          .select()

        if (error) {
          console.error(`페르소나 ${persona.persona_type} 생성 오류:`, error)
          throw error
        }
        
        console.log(`페르소나 ${persona.persona_type} 생성 완료:`, insertResult?.[0]?.id)
      }
    })

    // 6. 모든 upsert 작업 실행
    await Promise.all(upsertOperations)

    const created = personas.filter(p => !p.id).length
    const updated = personas.filter(p => p.id).length

    console.log(`=== 페르소나 동기화 완료 [${requestId}]: 생성 ${created}개, 업데이트 ${updated}개 ===`)

    return NextResponse.json({ 
      success: true,
      message: '페르소나 동기화가 완료되었습니다',
      summary: {
        created,
        updated
      }
    })

  } catch (error: any) {
    console.error('페르소나 동기화 오류:', error)
    return NextResponse.json({ 
      error: '페르소나 동기화 중 오류가 발생했습니다',
      details: error.message,
      success: false
    }, { status: 500 })
  }
}