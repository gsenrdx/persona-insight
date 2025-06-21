import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { Database } from "@/types/database"
import { Interviewee, Persona } from "@/types/project"

type Profile = Database['public']['Tables']['profiles']['Row']

interface EnrichedInterviewee extends Interviewee {
  personas: Pick<Persona, 'id' | 'persona_type' | 'persona_title' | 'persona_description' | 'active'> | null
  created_by_profile: Pick<Profile, 'id' | 'name'> | null
}

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

    // 먼저 인터뷰 데이터만 가져오기
    let query = supabase
      .from('interviewees')
      .select('*')
      .eq('company_id', company_id)
      .order('session_date', { ascending: false })
      .range(offset, offset + limit - 1)

    // Project filtering
    if (project_id) {
      query = query.eq('project_id', project_id)
    }

    const { data: interviews, error } = await query

    if (error) {
      return NextResponse.json({
        error: "인터뷰 데이터를 가져오는데 실패했습니다",
        details: error.message,
        success: false
      }, { status: 500 })
    }

    // 페르소나와 프로필 데이터 별도 조회
    let enrichedData = interviews

    if (interviews && interviews.length > 0) {
      // persona_ids 수집
      const personaIds = interviews
        .filter(i => i.persona_id)
        .map(i => i.persona_id)
        .filter((id, index, self) => self.indexOf(id) === index)

      // created_by ids 수집
      const createdByIds = interviews
        .filter(i => i.created_by)
        .map(i => i.created_by)
        .filter((id, index, self) => self.indexOf(id) === index)

      // 페르소나 데이터 조회
      let personasMap: Record<string, Pick<Persona, 'id' | 'persona_type' | 'persona_title' | 'persona_description' | 'active'>> = {}
      if (personaIds.length > 0) {
        const { data: personas } = await supabase
          .from('personas')
          .select('id, persona_type, persona_title, persona_description, active')
          .in('id', personaIds)
          .eq('active', true)

        if (personas) {
          personasMap = personas.reduce((acc, p) => {
            acc[p.id] = p
            return acc
          }, {} as typeof personasMap)
        }
      }

      // 프로필 데이터 조회
      let profilesMap: Record<string, Pick<Profile, 'id' | 'name'>> = {}
      if (createdByIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', createdByIds)

        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.id] = p
            return acc
          }, {} as typeof profilesMap)
        }
      }

      // 데이터 결합
      enrichedData = interviews.map((interview): EnrichedInterviewee => ({
        ...interview,
        personas: interview.persona_id ? personasMap[interview.persona_id] || null : null,
        created_by_profile: interview.created_by ? profilesMap[interview.created_by] || null : null
      }))
    }

    // Add cache headers for performance
    const headers = {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600'
    }

    return NextResponse.json({
      data: enrichedData,
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