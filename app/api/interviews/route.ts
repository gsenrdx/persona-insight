import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get('company_id')
    const project_id = searchParams.get('project_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // company_id가 필수로 제공되어야 함
    if (!company_id) {
      return NextResponse.json({
        error: "company_id가 필요합니다",
        success: false
      }, { status: 400 })
    }

    // 성능 최적화: JOIN을 사용하여 N+1 쿼리 문제 해결
    let query = supabase
      .from('interviewees')
      .select(`
        *,
        personas:persona_id!inner(
          id,
          persona_type,
          persona_title,
          persona_description
        ),
        profiles:created_by(
          id,
          name
        )
      `)
      .eq('company_id', company_id)
      .eq('personas.active', true) // 활성화된 페르소나만 조인
      .order('session_date', { ascending: false })
      .range(offset, offset + limit - 1)

    // 프로젝트 필터링 추가
    if (project_id) {
      query = query.eq('project_id', project_id)
    }

    const { data, error } = await query

    if (error) {
      console.error("Supabase 오류:", error)
      return NextResponse.json({
        error: "인터뷰 데이터를 가져오는데 실패했습니다",
        success: false
      }, { status: 500 })
    }

    // 데이터 변환 (프로필 정보를 기존 형식으로 변경)
    const dataWithProfiles = data?.map(interview => ({
      ...interview,
      created_by_profile: interview.profiles || null,
      profiles: undefined // 중복 제거
    }))

    // 성능 최적화: 캐시 헤더 추가 (2분간 캐시)
    const headers = {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600'
    }

    return NextResponse.json({
      data: dataWithProfiles,
      success: true
    }, { headers })
  } catch (error) {
    console.error("API route error:", error)
    
    return NextResponse.json({
      error: "인터뷰 데이터를 가져오는데 실패했습니다",
      success: false
    }, { status: 500 })
  }
}

// 새로운 인터뷰 데이터 추가
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('interviewees')
      .insert([body])
      .select()

    if (error) {
      console.error("Supabase 삽입 오류:", error)
      return NextResponse.json({
        error: "인터뷰 데이터 저장에 실패했습니다",
        success: false
      }, { status: 500 })
    }

    return NextResponse.json({
      data: data[0],
      success: true
    }, { status: 201 })
  } catch (error) {
    console.error("POST API route error:", error)
    
    return NextResponse.json({
      error: "인터뷰 데이터 저장에 실패했습니다",
      success: false
    }, { status: 500 })
  }
}

// 특정 인터뷰 데이터 업데이트
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({
        error: "ID가 필요합니다",
        success: false
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('interviewees')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error("Supabase 업데이트 오류:", error)
      return NextResponse.json({
        error: "인터뷰 데이터 업데이트에 실패했습니다",
        success: false
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        error: "해당 ID의 데이터를 찾을 수 없습니다",
        success: false
      }, { status: 404 })
    }

    return NextResponse.json({
      data: data[0],
      success: true
    })
  } catch (error) {
    console.error("PUT API route error:", error)
    
    return NextResponse.json({
      error: "인터뷰 데이터 업데이트에 실패했습니다",
      success: false
    }, { status: 500 })
  }
}