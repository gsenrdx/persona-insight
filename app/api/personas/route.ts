import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// CRUD operations for personas with pagination and filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const persona_type = searchParams.get('type')
    const company_id = searchParams.get('company_id')
    const project_id = searchParams.get('project_id')
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = (page - 1) * limit

    // company_id 또는 project_id 중 하나가 필요
    if (!company_id && !project_id) {
      return NextResponse.json({
        error: "company_id 또는 project_id가 필요합니다",
        success: false
      }, { status: 400 })
    }

    // Single query with count and data
    let query = supabase
      .from('personas')
      .select(`
        id,
        persona_type,
        persona_title,
        persona_description,
        persona_summary,
        thumbnail,
        persona_style,
        painpoints,
        needs,
        insight,
        insight_quote,
        created_at,
        project_id,
        company_id,
        persona_age:persona_summary,
        persona_gender:persona_style,
        persona_job:persona_description,
        persona_intro:persona_summary,
        persona_image:thumbnail
      `, { count: 'exact' })
      .eq('active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Company or Project filtering
    if (project_id) {
      query = query.eq('project_id', project_id)
    } else if (company_id) {
      query = query.eq('company_id', company_id)
    }

    // Type filtering
    if (persona_type) {
      query = query.eq('persona_type', persona_type)
    }

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({
        error: "페르소나 데이터를 가져오는데 실패했습니다",
        success: false
      }, { status: 500 })
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    // Add cache headers
    const headers = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'X-Total-Count': String(count || 0),
      'X-Total-Pages': String(totalPages),
      'X-Current-Page': String(page),
      'X-Page-Size': String(limit)
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPreviousPage
      },
      success: true
    }, { headers })
  } catch (error) {
    return NextResponse.json({
      error: "페르소나 데이터를 가져오는데 실패했습니다",
      success: false
    }, { status: 500 })
  }
}

// Create new persona
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const requiredFields = [
      'persona_type', 'persona_description', 'persona_summary', 
      'persona_style', 'painpoints', 'needs', 'insight', 'insight_quote'
    ]
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          error: `${field} 필드가 필요합니다`,
          success: false
        }, { status: 400 })
      }
    }

    // Check if persona type already exists
    const { data: existingPersona } = await supabase
      .from('personas')
      .select('id')
      .eq('persona_type', body.persona_type)
      .single()

    if (existingPersona) {
      return NextResponse.json({
        error: `${body.persona_type} 타입의 페르소나가 이미 존재합니다`,
        success: false
      }, { status: 409 })
    }
    
    const { data, error } = await supabase
      .from('personas')
      .insert([body])
      .select()

    if (error) {
      return NextResponse.json({
        error: "페르소나 데이터 저장에 실패했습니다",
        success: false
      }, { status: 500 })
    }

    return NextResponse.json({
      data: data[0],
      success: true
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({
      error: "페르소나 데이터 저장에 실패했습니다",
      success: false
    }, { status: 500 })
  }
}

// Update persona
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
      .from('personas')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({
        error: "페르소나 데이터 업데이트에 실패했습니다",
        success: false
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        error: "해당 ID의 페르소나를 찾을 수 없습니다",
        success: false
      }, { status: 404 })
    }

    return NextResponse.json({
      data: data[0],
      success: true
    })
  } catch (error) {
    return NextResponse.json({
      error: "페르소나 데이터 업데이트에 실패했습니다",
      success: false
    }, { status: 500 })
  }
}

// Delete persona
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({
        error: "ID가 필요합니다",
        success: false
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('personas')
      .delete()
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({
        error: "페르소나 데이터 삭제에 실패했습니다",
        success: false
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        error: "해당 ID의 페르소나를 찾을 수 없습니다",
        success: false
      }, { status: 404 })
    }

    return NextResponse.json({
      message: "페르소나가 성공적으로 삭제되었습니다",
      success: true
    })
  } catch (error) {
    return NextResponse.json({
      error: "페르소나 데이터 삭제에 실패했습니다",
      success: false
    }, { status: 500 })
  }
}