import { NextResponse } from "next/server"
import { ProjectInsightsService } from "@/lib/services/project-insights.service"
import { supabaseAdmin } from '@/lib/supabase-server'
import { getAuthenticatedUserProfile } from "@/lib/utils/auth-cache"

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Get auth header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "인증이 필요합니다", details: "Bearer 토큰을 제공해주세요." },
        { status: 401 }
      )
    }

    // Get authenticated user profile with caching
    let profile: { userId: string; companyId: string }
    try {
      const userProfile = await getAuthenticatedUserProfile(authHeader, supabaseAdmin)
      profile = {
        userId: userProfile.userId,
        companyId: userProfile.companyId
      }
    } catch (error) {
      return NextResponse.json(
        { error: "인증 실패", details: error instanceof Error ? error.message : "인증 정보를 확인할 수 없습니다." },
        { status: 401 }
      )
    }

    // Verify project access
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, company_id')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다", details: "프로젝트가 존재하지 않거나 접근 권한이 없습니다." },
        { status: 404 }
      )
    }

    // Verify user has access to this project's company
    if (project.company_id !== profile.companyId) {
      return NextResponse.json(
        { error: "접근 권한 없음", details: "이 프로젝트에 접근할 권한이 없습니다." },
        { status: 403 }
      )
    }

    // Get all years with interviews for this project
    const { data: yearsData, error: yearsError } = await supabaseAdmin
      .from('interviews')
      .select('interview_date')
      .eq('project_id', id)
      .not('interview_date', 'is', null)
      .order('interview_date', { ascending: false })

    if (yearsError) {
      throw new Error(`연도 데이터 조회 실패: ${yearsError.message}`)
    }

    // Extract unique years
    const years = [...new Set(
      yearsData
        ?.map(item => {
          const date = item.interview_date
          return date ? new Date(date).getFullYear().toString() : null
        })
        .filter(Boolean) || []
    )].sort((a, b) => parseInt(b) - parseInt(a))
    

    // If no years found, return empty result
    if (years.length === 0) {
      return NextResponse.json({
        years: [],
        insights: {},
        summary: {
          totalYears: 0,
          totalInterviews: 0,
          projectId: id
        }
      })
    }

    // Get insights for all years using batch service
    const result = await ProjectInsightsService.getBatchInsights(
      id,
      years
    )

    // Format response
    const response = {
      years,
      insights: result.results,
      summary: {
        ...result.summary,
        projectId: id
      }
    }

    // Response with cache headers
    const headers = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900'
    }

    return NextResponse.json(response, { headers })

  } catch (error) {
    return NextResponse.json(
      { 
        error: "서버 내부 오류", 
        details: `예외 상세: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      }, 
      { status: 500 }
    )
  }
}