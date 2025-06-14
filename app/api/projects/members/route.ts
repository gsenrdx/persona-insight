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

    // 프로젝트 정보 조회
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('company_id')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({
        error: "프로젝트를 찾을 수 없습니다",
        success: false
      }, { status: 404 })
    }

    // 회사 구성원 목록 조회
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, role, avatar_url')
      .eq('company_id', project.company_id)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error("Supabase 조회 오류:", error)
      return NextResponse.json({
        error: "구성원 목록을 가져오는데 실패했습니다",
        success: false
      }, { status: 500 })
    }

    return NextResponse.json({
      data,
      success: true
    })
  } catch (error) {
    console.error("API route error:", error)
    
    return NextResponse.json({
      error: "구성원 목록을 가져오는데 실패했습니다",
      success: false
    }, { status: 500 })
  }
}