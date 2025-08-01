import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get('company_id')
    const project_id = searchParams.get('project_id')

    if (!company_id) {
      return NextResponse.json(
        { error: "company_id가 필요합니다" }, 
        { status: 400 }
      )
    }


    // 실제 인터뷰가 존재하는 연도들을 조회
    let query = supabase
      .from('interviews')
      .select('interview_date')
      .eq('company_id', company_id)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .not('interview_date', 'is', null)

    // 프로젝트 필터링 추가
    if (project_id) {
      query = query.eq('project_id', project_id)
    }

    const { data: interviews, error } = await query

    if (error) {
      return NextResponse.json(
        { error: "데이터베이스 조회 실패", details: error.message },
        { status: 500 }
      )
    }

    // 연도 추출 및 정렬
    const yearsSet = new Set<string>()
    
    interviews?.forEach(interview => {
      if (interview.interview_date) {
        const year = new Date(interview.interview_date).getFullYear().toString()
        yearsSet.add(year)
      }
    })

    // 연도를 내림차순으로 정렬 (최신년도가 먼저)
    const availableYears = Array.from(yearsSet).sort((a, b) => parseInt(b) - parseInt(a))


    // Add cache headers for performance
    const headers = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
    }

    return NextResponse.json({
      years: availableYears,
      totalInterviews: interviews?.length || 0
    }, { headers })

  } catch (error) {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다", details: "연도 조회 중 오류 발생" },
      { status: 500 }
    )
  }
} 