import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

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
        personas:persona_id(
          id,
          persona_type,
          persona_title,
          persona_description
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error("Supabase 오류:", error)
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

    // 작성자 정보 조회
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

    return NextResponse.json({
      data: responseData,
      success: true
    })
  } catch (error) {
    console.error("API route error:", error)
    
    return NextResponse.json({
      error: "인터뷰 데이터를 가져오는데 실패했습니다",
      success: false
    }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

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
      console.error("Supabase 삭제 오류:", error)
      return NextResponse.json({
        error: "인터뷰 삭제에 실패했습니다",
        success: false
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error("DELETE API route error:", error)
    
    return NextResponse.json({
      error: "인터뷰 삭제에 실패했습니다",
      success: false
    }, { status: 500 })
  }
}