import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface PersonaData {
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

export async function POST(req: NextRequest) {
  try {
    const { company_id, project_id, personas } = await req.json()
    
    if (!company_id || !personas || !Array.isArray(personas)) {
      return NextResponse.json(
        { error: 'company_id와 personas 배열이 필요합니다' },
        { status: 400 }
      )
    }

    // 1. 기존 페르소나들 조회 (persona_type으로 매칭)
    let existingPersonasQuery = supabase
      .from('personas')
      .select('*')
      .eq('company_id', company_id)

    if (project_id) {
      existingPersonasQuery = existingPersonasQuery.eq('project_id', project_id)
    } else {
      existingPersonasQuery = existingPersonasQuery.is('project_id', null)
    }

    const { data: existingPersonas, error: fetchError } = await existingPersonasQuery

    if (fetchError) {
      console.error('기존 페르소나 조회 오류:', fetchError)
      return NextResponse.json(
        { error: '기존 페르소나 조회에 실패했습니다' },
        { status: 500 }
      )
    }

    const existingPersonaMap = new Map(
      (existingPersonas || []).map(p => [p.persona_type, p])
    )

    // 2. 새로운 페르소나 타입들
    const newPersonaTypes = new Set(personas.map((p: PersonaData) => p.persona_type))

    // 3. 삭제할 페르소나들 (기존에 있지만 새 목록에 없는 것들)
    const personasToDelete = (existingPersonas || []).filter(
      existing => !newPersonaTypes.has(existing.persona_type)
    )

    // 4. 삭제할 페르소나들이 있으면 연결된 인터뷰 확인
    if (personasToDelete.length > 0) {
      const deleteIds = personasToDelete.map(p => p.id)
      
      const { data: linkedInterviews, error: linkError } = await supabase
        .from('interviewees')
        .select('id, interviewee_fake_name')
        .in('persona_id', deleteIds)
        .limit(5) // 최대 5개만 확인

      if (linkError) {
        console.error('연결된 인터뷰 확인 오류:', linkError)
      }

      if (linkedInterviews && linkedInterviews.length > 0) {
        return NextResponse.json({
          error: '삭제하려는 페르소나에 연결된 인터뷰가 있습니다',
          details: {
            linkedInterviews: linkedInterviews.length,
            examples: linkedInterviews.map(i => i.interviewee_fake_name || `인터뷰 ${i.id.slice(0, 8)}`),
            personasToDelete: personasToDelete.map(p => p.persona_type)
          }
        }, { status: 409 })
      }

      // 5. 연결된 인터뷰가 없으면 페르소나 삭제
      const { error: deleteError } = await supabase
        .from('personas')
        .delete()
        .in('id', deleteIds)

      if (deleteError) {
        console.error('페르소나 삭제 오류:', deleteError)
        return NextResponse.json(
          { error: '페르소나 삭제에 실패했습니다' },
          { status: 500 }
        )
      }

    }

    // 6. 새로운/업데이트할 페르소나들 처리
    const upsertOperations = personas.map(async (persona: PersonaData) => {
      const existingPersona = existingPersonaMap.get(persona.persona_type)
      
      const personaData = {
        company_id,
        project_id: project_id || null,
        persona_type: persona.persona_type,
        persona_title: persona.persona_title,
        persona_description: persona.persona_description,
        thumbnail: persona.thumbnail,
        matrix_position: persona.matrix_position,
        // 기본값들 - 실제 페르소나 반영 시 업데이트됨
        persona_summary: existingPersona?.persona_summary || '',
        persona_style: existingPersona?.persona_style || '',
        painpoints: existingPersona?.painpoints || '',
        needs: existingPersona?.needs || '',
        insight: existingPersona?.insight || '',
        insight_quote: existingPersona?.insight_quote || '',
        updated_at: new Date().toISOString()
      }

      if (existingPersona) {
        // 업데이트
        const { error } = await supabase
          .from('personas')
          .update(personaData)
          .eq('id', existingPersona.id)

        if (error) {
          console.error(`페르소나 ${persona.persona_type} 업데이트 오류:`, error)
          throw error
        }

      } else {
        // 새로 생성
        const { error } = await supabase
          .from('personas')
          .insert([{
            ...personaData,
            created_at: new Date().toISOString()
          }])

        if (error) {
          console.error(`페르소나 ${persona.persona_type} 생성 오류:`, error)
          throw error
        }

      }
    })

    // 7. 모든 upsert 작업 실행
    await Promise.all(upsertOperations)

    return NextResponse.json({ 
      success: true,
      message: '페르소나 동기화가 완료되었습니다',
      summary: {
        created: personas.filter((p: PersonaData) => !existingPersonaMap.has(p.persona_type)).length,
        updated: personas.filter((p: PersonaData) => existingPersonaMap.has(p.persona_type)).length,
        deleted: personasToDelete.length
      }
    })

  } catch (error: any) {
    console.error('페르소나 동기화 오류:', error)
    return NextResponse.json(
      { 
        error: '페르소나 동기화 중 오류가 발생했습니다',
        details: error.message 
      },
      { status: 500 }
    )
  }
}