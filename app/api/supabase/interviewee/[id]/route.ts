import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    if (!id) {
      return NextResponse.json(
        { error: "인터뷰 ID가 필요합니다" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('interviewees')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error("Supabase 오류:", error)
      return NextResponse.json(
        { error: "인터뷰 데이터를 가져오는데 실패했습니다" },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: "해당 인터뷰를 찾을 수 없습니다" },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("API route error:", error)
    
    return NextResponse.json(
      { error: "인터뷰 데이터를 가져오는데 실패했습니다" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    if (!id) {
      return NextResponse.json(
        { error: "인터뷰 ID가 필요합니다" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('interviewees')
      .delete()
      .eq('id', id)

    if (error) {
      console.error("Supabase 삭제 오류:", error)
      return NextResponse.json(
        { error: "인터뷰 삭제에 실패했습니다" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE API route error:", error)
    
    return NextResponse.json(
      { error: "인터뷰 삭제에 실패했습니다" },
      { status: 500 }
    )
  }
} 