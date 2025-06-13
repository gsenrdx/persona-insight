import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"

// 프로젝트 마스터 권한 확인 함수
async function checkProjectMaster(projectId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('master_id, company_id')
    .eq('id', projectId)
    .single()

  if (error || !data) {
    return { isAuthorized: false, error: "프로젝트를 찾을 수 없습니다" }
  }

  // 프로젝트 마스터이거나 회사 관리자인지 확인
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, company_id')
    .eq('id', userId)
    .single()

  const isMaster = data.master_id === userId
  const isCompanyAdmin = profile?.role === 'company_admin' || profile?.role === 'super_admin'
  const isInSameCompany = profile?.company_id === data.company_id

  return {
    isAuthorized: isMaster || (isCompanyAdmin && isInSameCompany),
    isMaster,
    isCompanyAdmin
  }
}

// 사용자가 소속된 프로젝트 조회 (공개 프로젝트 + 멤버십이 있는 비공개 프로젝트)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get('company_id')
    const user_id = searchParams.get('user_id')

    // company_id와 user_id가 필수로 제공되어야 함
    if (!company_id || !user_id) {
      return NextResponse.json(
        { error: "company_id와 user_id가 필요합니다" }, 
        { status: 400 }
      )
    }

    // RPC 함수를 사용하여 프로젝트 목록과 멤버 정보 조회
    const { data: rpcData, error: rpcError } = await supabaseAdmin
      .rpc('get_projects_with_members', {
        p_company_id: company_id,
        p_user_id: user_id
      })

    if (!rpcError && rpcData) {
      // RPC 함수 결과를 프론트엔드 형식으로 변환
      const transformedRpcData = rpcData.map((project: any) => ({
        id: project.project_id,
        name: project.project_name,
        description: project.project_description,
        visibility: project.project_visibility,
        join_method: project.project_join_method,
        created_at: project.project_created_at,
        created_by: project.project_created_by,
        company_id,
        is_active: true,
        member_count: Number(project.member_count) || 0,
        interview_count: Number(project.interview_count) || 0,
        persona_count: Number(project.persona_count) || 0,
        top_members: project.top_members || [],
        membership: project.user_membership || null
      }))

      return NextResponse.json({ data: transformedRpcData })
    }

    // RPC 함수 실패 시 기존 방식으로 fallback
    console.error("RPC 함수 오류:", rpcError)
    
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        project_members!inner(
          id,
          role,
          joined_at,
          user_id
        ),
        interviewees(count),
        personas(count)
      `)
      .eq('company_id', company_id)
      .eq('is_active', true)
      .or(
        `visibility.eq.public,and(visibility.eq.private,project_members.user_id.eq.${user_id})`
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Supabase 조회 오류:", error)
      
      // fallback: 기본 쿼리로 회사의 모든 프로젝트 조회 (멤버십 정보 없이)
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from('projects')
        .select(`
          *,
          project_members(count),
          interviewees(count),
          personas(count)
        `)
        .eq('company_id', company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (fallbackError) {
        console.error("Fallback 조회도 실패:", fallbackError)
        return NextResponse.json(
          { error: "프로젝트 데이터를 가져오는데 실패했습니다" }, 
          { status: 500 }
        )
      }

      // fallback 데이터 변환
      const transformedFallbackData = (fallbackData || []).map((project: any) => ({
        ...project,
        member_count: project.project_members?.[0]?.count || 0,
        interview_count: project.interviewees?.[0]?.count || 0,
        persona_count: project.personas?.[0]?.count || 0,
        project_members: undefined,
        interviewees: undefined,
        personas: undefined
      }))

      return NextResponse.json({ data: transformedFallbackData })
    }

    // 데이터 변환: 멤버십 정보와 통계 정보를 프로젝트 객체에 직접 포함
    const transformedData = data.map((project: any) => {
      const membership = project.project_members?.find((pm: any) => pm.user_id === user_id)
      
      // 프로젝트 멤버 수 계산
      const memberCount = project.project_members?.length || 0
      
      // 인터뷰 및 페르소나 수 계산
      const interviewCount = project.interviewees?.[0]?.count || 0
      const personaCount = project.personas?.[0]?.count || 0
      
      return {
        ...project,
        membership,
        member_count: memberCount,
        interview_count: interviewCount,
        persona_count: personaCount,
        project_members: undefined, // 중복 데이터 제거
        interviewees: undefined, // 중복 데이터 제거
        personas: undefined // 중복 데이터 제거
      }
    })

    return NextResponse.json({ data: transformedData })
  } catch (error) {
    console.error("API route error:", error)
    
    return NextResponse.json(
      { error: "프로젝트 데이터를 가져오는데 실패했습니다" }, 
      { status: 500 }
    )
  }
}

// 새로운 프로젝트 생성
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const {
      name,
      description,
      visibility = 'public',
      join_method = 'open',
      password,
      user_id,
      company_id,
      purpose,
      target_audience,
      research_method,
      start_date,
      end_date
    } = body

    // 필수 필드 검증
    if (!name || !user_id || !company_id) {
      return NextResponse.json(
        { error: "name, user_id, company_id는 필수 입력 사항입니다" },
        { status: 400 }
      )
    }

    // 사용자 프로필 조회 (권한 확인)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, company_id')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다" },
        { status: 404 }
      )
    }

    // 회사 멤버인지 확인
    if (profile.company_id !== company_id) {
      return NextResponse.json(
        { error: "해당 회사의 멤버가 아닙니다" },
        { status: 403 }
      )
    }

    // 프로젝트 생성
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert({
        name,
        description: description || '',
        visibility,
        join_method,
        password: join_method === 'password' ? password : null,
        created_by: user_id,
        company_id,
        purpose: purpose || null,
        target_audience: target_audience || null,
        research_method: research_method || null,
        start_date: start_date || null,
        end_date: end_date || null,
        is_active: true
      })
      .select()
      .single()

    if (projectError) {
      console.error('프로젝트 생성 실패:', projectError)
      return NextResponse.json(
        { error: "프로젝트 생성에 실패했습니다" },
        { status: 500 }
      )
    }

    // 프로젝트 생성자를 owner로 project_members에 추가
    const { error: memberError } = await supabaseAdmin
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: user_id,
        role: 'owner',
        joined_at: new Date().toISOString()
      })

    if (memberError) {
      console.error('프로젝트 멤버 추가 실패:', memberError)
      // 프로젝트는 생성되었지만 멤버 추가에 실패한 경우
      // 롤백하지 않고 경고만 로그
    }

    return NextResponse.json({
      message: "프로젝트가 성공적으로 생성되었습니다",
      data: project
    })

  } catch (error) {
    console.error('프로젝트 생성 API 오류:', error)
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}