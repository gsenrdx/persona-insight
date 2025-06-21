import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Get and delete specific interview by ID

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({
        error: "인터뷰 ID가 필요합니다",
        success: false
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('interviewees')
      .select(`
        *,
        personas:persona_id!left(
          id,
          persona_type,
          persona_title,
          persona_description
        )
      `)
      .eq('id', id)
      .eq('personas.active', true)
      .single()

    if (error) {
      return NextResponse.json({
        error: "인터뷰 데이터를 가져오는데 실패했습니다",
        success: false
      }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({
        error: "해당 인터뷰를 찾을 수 없습니다",
        success: false
      }, { status: 404 })
    }

    // Get creator profile information
    let createdByProfile = null
    if (data.created_by) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', data.created_by)
        .single()

      if (!profileError && profile) {
        createdByProfile = profile
      }
    }

    const responseData = {
      ...data,
      created_by_profile: createdByProfile
    }

    // Add cache headers for performance (interview data is immutable)
    const headers = {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200'
    }

    return NextResponse.json({
      data: responseData,
      success: true
    }, { headers })
  } catch (error) {
    return NextResponse.json({
      error: "인터뷰 데이터를 가져오는데 실패했습니다",
      success: false
    }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({
        error: "인터뷰 ID가 필요합니다",
        success: false
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('interviewees')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({
        error: "인터뷰 삭제에 실패했습니다",
        success: false
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    return NextResponse.json({
      error: "인터뷰 삭제에 실패했습니다",
      success: false
    }, { status: 500 })
  }
}