import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get('company_id')

    if (!company_id) {
      return NextResponse.json(
        { error: "company_id가 필요합니다" }, 
        { status: 400 }
      )
    }

    console.log(`사용 가능한 연도 조회: company_id=${company_id}`)

    // 실제 인터뷰가 존재하는 연도들을 조회
    const { data: interviews, error } = await supabase
      .from('interviewees')
      .select('session_date')
      .eq('company_id', company_id)
      .not('interview_detail', 'is', null)
      .not('session_date', 'is', null)

    if (error) {
      console.error("연도 조회 오류:", error)
      return NextResponse.json(
        { error: "데이터베이스 조회 실패", details: error.message },
        { status: 500 }
      )
    }

    // 연도 추출 및 정렬
    const yearsSet = new Set<string>()
    
    interviews?.forEach(interview => {
      if (interview.session_date) {
        const year = new Date(interview.session_date).getFullYear().toString()
        yearsSet.add(year)
      }
    })

    // 연도를 내림차순으로 정렬 (최신년도가 먼저)
    const availableYears = Array.from(yearsSet).sort((a, b) => parseInt(b) - parseInt(a))

    console.log(`사용 가능한 연도들: ${availableYears.join(', ')}`)

    return NextResponse.json({
      years: availableYears,
      totalInterviews: interviews?.length || 0
    })

  } catch (error) {
    console.error("연도 API 오류:", error)
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다", details: "연도 조회 중 오류 발생" },
      { status: 500 }
    )
  }
} 