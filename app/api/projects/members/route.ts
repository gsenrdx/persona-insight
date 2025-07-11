import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"

// 프로젝트 회사의 구성원 목록 조회 (마스터 위임용)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const project_id = searchParams.get('project_id')

    if (!project_id) {
      return NextResponse.json({
        error: "project_id가 필요합니다",
        success: false
      }, { status: 400 })
    }

    // 단일 쿼리로 프로젝트의 회사 구성원 조회
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select(`
        id,
        companies!inner (
          profiles!inner (
            id,
            name,
            role,
            avatar_url,
            is_active
          )
        )
      `)
      .eq('id', project_id)
      .eq('companies.profiles.is_active', true)
      .single()

    if (error || !data) {
      return NextResponse.json({
        error: "프로젝트를 찾을 수 없습니다",
        success: false
      }, { status: 404 })
    }

    // 프로필 데이터 추출 및 정렬
    const profiles = data.companies && Array.isArray(data.companies) && data.companies[0]?.profiles
      ? data.companies[0].profiles.sort((a, b) => 
          (a.name || '').localeCompare(b.name || '')
        )
      : []

    return NextResponse.json({
      data: profiles,
      success: true
    })
  } catch (error) {
    // API route 오류
    
    return NextResponse.json({
      error: "구성원 목록을 가져오는데 실패했습니다",
      success: false
    }, { status: 500 })
  }
}