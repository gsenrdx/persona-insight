import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// CRUD operations for interview data with persona relationships

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get('company_id')
    const project_id = searchParams.get('project_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // company_id is required
    if (!company_id) {
      return NextResponse.json({
        error: "company_id가 필요합니다",
        success: false
      }, { status: 400 })
    }

    let query = supabase
      .from('interviewees')
      .select(`
        *,
        personas:persona_id!inner(
          id,
          persona_type,
          persona_title,
          persona_description
        )
      `)
      .eq('company_id', company_id)
      .eq('personas.active', true)
      .order('session_date', { ascending: false })
      .range(offset, offset + limit - 1)

    // Project filtering
    if (project_id) {
      query = query.eq('project_id', project_id)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({
        error: "인터뷰 데이터를 가져오는데 실패했습니다",
        success: false
      }, { status: 500 })
    }

    // Collect unique created_by IDs
    const createdByIds = data
      ?.filter(interview => interview.created_by)
      ?.map(interview => interview.created_by)
      ?.filter((id, index, arr) => arr.indexOf(id) === index)

    let profilesData: { id: string; name: string }[] = []
    if (createdByIds && createdByIds.length > 0) {
      // Batch query profiles for performance
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', createdByIds)

      if (!profilesError && profiles) {
        profilesData = profiles
      }
    }

    // Map profile data to interviews
    const dataWithProfiles = data?.map(interview => ({
      ...interview,
      created_by_profile: interview.created_by 
        ? profilesData.find(profile => profile.id === interview.created_by) || null
        : null
    }))

    // Add cache headers for performance
    const headers = {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600'
    }

    return NextResponse.json({
      data: dataWithProfiles,
      success: true
    }, { headers })
  } catch (error) {
    return NextResponse.json({
      error: "인터뷰 데이터를 가져오는데 실패했습니다",
      success: false
    }, { status: 500 })
  }
}

// Create new interview
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('interviewees')
      .insert([body])
      .select()

    if (error) {
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
    return NextResponse.json({
      error: "인터뷰 데이터 저장에 실패했습니다",
      success: false
    }, { status: 500 })
  }
}

// Update interview data
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
    return NextResponse.json({
      error: "인터뷰 데이터 업데이트에 실패했습니다",
      success: false
    }, { status: 500 })
  }
}