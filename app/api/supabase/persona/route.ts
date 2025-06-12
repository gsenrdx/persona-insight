import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// 모든 페르소나 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const persona_type = searchParams.get('type')
    const company_id = searchParams.get('company_id')
    const project_id = searchParams.get('project_id')

    // company_id가 필수로 제공되어야 함
    if (!company_id) {
      return NextResponse.json(
        { error: "company_id가 필요합니다" }, 
        { status: 400 }
      )
    }

    let query = supabase
      .from('personas')
      .select(`
        id,
        persona_type,
        persona_title,
        persona_description,
        thumbnail,
        created_at
      `)
      .eq('company_id', company_id)
      .order('created_at', { ascending: false })

    // 프로젝트 필터링 추가 (project_id가 있으면 해당 프로젝트, 없으면 회사 레벨)
    if (project_id) {
      query = query.eq('project_id', project_id)
    } else {
      query = query.is('project_id', null)
    }

    // 특정 타입 필터링
    if (persona_type) {
      query = query.eq('persona_type', persona_type)
    }

    const { data, error } = await query

    if (error) {
      console.error("Supabase 조회 오류:", error)
      return NextResponse.json(
        { error: "페르소나 데이터를 가져오는데 실패했습니다" }, 
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("API route error:", error)
    
    return NextResponse.json(
      { error: "페르소나 데이터를 가져오는데 실패했습니다" }, 
      { status: 500 }
    )
  }
}

// 새로운 페르소나 추가
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // 필수 필드 검증
    const requiredFields = [
      'persona_type', 'persona_description', 'persona_summary', 
      'persona_style', 'painpoints', 'needs', 'insight', 'insight_quote'
    ]
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} 필드가 필요합니다` }, 
          { status: 400 }
        )
      }
    }

    // 동일한 타입이 이미 존재하는지 확인
    const { data: existingPersona } = await supabase
      .from('personas')
      .select('id')
      .eq('persona_type', body.persona_type)
      .single()

    if (existingPersona) {
      return NextResponse.json(
        { error: `${body.persona_type} 타입의 페르소나가 이미 존재합니다` }, 
        { status: 409 }
      )
    }
    
    const { data, error } = await supabase
      .from('personas')
      .insert([body])
      .select()

    if (error) {
      console.error("Supabase 삽입 오류:", error)
      return NextResponse.json(
        { error: "페르소나 데이터 저장에 실패했습니다" }, 
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data[0] }, { status: 201 })
  } catch (error) {
    console.error("POST API route error:", error)
    
    return NextResponse.json(
      { error: "페르소나 데이터 저장에 실패했습니다" }, 
      { status: 500 }
    )
  }
}

// 페르소나 업데이트
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json(
        { error: "ID가 필요합니다" }, 
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('personas')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error("Supabase 업데이트 오류:", error)
      return NextResponse.json(
        { error: "페르소나 데이터 업데이트에 실패했습니다" }, 
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "해당 ID의 페르소나를 찾을 수 없습니다" }, 
        { status: 404 }
      )
    }

    return NextResponse.json({ data: data[0] })
  } catch (error) {
    console.error("PUT API route error:", error)
    
    return NextResponse.json(
      { error: "페르소나 데이터 업데이트에 실패했습니다" }, 
      { status: 500 }
    )
  }
}

// 페르소나 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: "ID가 필요합니다" }, 
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('personas')
      .delete()
      .eq('id', id)
      .select()

    if (error) {
      console.error("Supabase 삭제 오류:", error)
      return NextResponse.json(
        { error: "페르소나 데이터 삭제에 실패했습니다" }, 
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "해당 ID의 페르소나를 찾을 수 없습니다" }, 
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "페르소나가 성공적으로 삭제되었습니다" })
  } catch (error) {
    console.error("DELETE API route error:", error)
    
    return NextResponse.json(
      { error: "페르소나 데이터 삭제에 실패했습니다" }, 
      { status: 500 }
    )
  }
} 