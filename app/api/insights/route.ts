import { NextResponse } from "next/server"
import { InsightsService } from "@/lib/services/insights"
import { getAuthenticatedUserProfile } from "@/lib/utils/auth-cache"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function GET(request: Request) {
  try {
    // 인증 처리 (캐시 적용)
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({
        error: "인증이 필요합니다",
        details: "Authorization 헤더를 제공해주세요."
      }, { status: 401 })
    }

    const { userId, companyId } = await getAuthenticatedUserProfile(authorization, supabaseAdmin)
    
    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get('company_id') || companyId
    const project_id = searchParams.get('project_id')
    const year = searchParams.get('year') || new Date().getFullYear().toString()

    if (!/^\d{4}$/.test(year)) {
      return NextResponse.json(
        { error: "올바르지 않은 연도 형식입니다", details: "YYYY 형식의 연도를 입력해주세요." }, 
        { status: 400 }
      )
    }

    // Service call
    const result = await InsightsService.getInsights(
      company_id,
      year,
      project_id || undefined
    )

    // Response formatting with cache headers
    const headers = {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800'
    }

    return NextResponse.json(result, { headers })

  } catch (error) {
    return NextResponse.json(
      { 
        error: "서버 내부 오류", 
        details: `예외 상세: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        year: parseInt(new URL(request.url).searchParams.get('year') || new Date().getFullYear().toString()),
        intervieweeCount: 0,
        insights: []
      }, 
      { status: 500 }
    )
  }
} 