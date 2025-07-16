import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getAuthenticatedUserProfile } from "@/lib/utils/auth-cache"
import { ProjectWithStats, TransformedProject, ProjectWithAggregates, Project, ProjectMember } from "@/types/project"

// 사용자가 소속된 프로젝트 조회 (공개 프로젝트 + 멤버십이 있는 비공개 프로젝트)
export async function GET(request: Request) {
  try {
    // 인증 처리 (캐시 적용)
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({
        error: "인증이 필요합니다",
        success: false
      }, { status: 401 })
    }

    const { userId, companyId } = await getAuthenticatedUserProfile(authorization, supabaseAdmin)
    
    // URL 파라미터로 오버라이드 가능 (서버 컴포넌트 지원)
    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get('company_id') || companyId
    const user_id = searchParams.get('user_id') || userId

    // RPC 함수를 사용하여 프로젝트 목록과 멤버 정보 조회
    // TODO: personas 테이블이 삭제되어 RPC 함수가 실패하므로 일단 비활성화
    /*
    const { data: rpcData, error: rpcError } = await supabaseAdmin
      .rpc('get_projects_with_members', {
        p_company_id: company_id,
        p_user_id: user_id
      })

    if (!rpcError && rpcData) {
      // RPC 함수 결과를 프론트엔드 형식으로 변환
      const transformedRpcData = rpcData.map((project): TransformedProject => ({
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
        membership: project.user_membership || null,
        user_role: project.user_membership?.role || null
      }))

      return NextResponse.json({
        data: transformedRpcData,
        success: true
      })
    }
    */

    // RPC 함수 실패 시 기존 방식으로 fallback
    // RPC 함수 오류
    
    // 두 개의 쿼리로 분리: 공개 프로젝트 + 사용자가 멤버인 비공개 프로젝트
    const [publicProjects, privateProjects] = await Promise.all([
      // 공개 프로젝트
      supabaseAdmin
        .from('projects')
        .select(`
          *,
          project_members(id, role, joined_at, user_id),
          interviews(count)
        `)
        .eq('company_id', company_id)
        .eq('is_active', true)
        .eq('visibility', 'public'),
      
      // 사용자가 멤버인 비공개 프로젝트
      supabaseAdmin
        .from('projects')
        .select(`
          *,
          project_members!inner(id, role, joined_at, user_id),
          interviews(count)
        `)
        .eq('company_id', company_id)
        .eq('is_active', true)
        .eq('visibility', 'private')
        .eq('project_members.user_id', user_id)
    ])

    const combinedData = [
      ...(publicProjects.data || []),
      ...(privateProjects.data || [])
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // 최신순 정렬

    const combinedError = publicProjects.error || privateProjects.error
    
    const { data, error } = { data: combinedData, error: combinedError }

    if (error) {
      // Supabase 조회 오류
      
      // fallback: 기본 쿼리로 회사의 모든 프로젝트 조회 (멤버십 정보 없이)
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from('projects')
        .select(`
          *,
          project_members(count),
          interviews(count)
        `)
        .eq('company_id', company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (fallbackError) {
        // Fallback 조회 실패
        return NextResponse.json({
          error: "프로젝트 데이터를 가져오는데 실패했습니다",
          success: false
        }, { status: 500 })
      }

      // fallback 데이터 변환
      const transformedFallbackData = (fallbackData || []).map((project) => ({
        ...project,
        member_count: project.project_members?.[0]?.count || 0,
        interview_count: project.interviews?.[0]?.count || 0,
        persona_count: 0, // TODO: 새로운 구조에서는 인터뷰를 통해 간접적으로 계산
        project_members: undefined,
        interviews: undefined
      }))

      return NextResponse.json({
        data: transformedFallbackData,
        success: true
      })
    }

    // 데이터 변환: 멤버십 정보와 통계 정보를 프로젝트 객체에 직접 포함
    const transformedData = data.map((project) => {
      const membership = project.project_members?.find((pm) => pm.user_id === user_id)
      
      // 프로젝트 멤버 수 계산
      const memberCount = project.project_members?.length || 0
      
      // 인터뷰 수 계산
      const interviewCount = project.interviews?.[0]?.count || 0
      // 페르소나 수는 인터뷰에 할당된 고유 페르소나 조합 수로 계산 (나중에 별도 쿼리로 처리)
      const personaCount = 0 // TODO: 새로운 구조에서는 인터뷰를 통해 간접적으로 계산
      
      return {
        ...project,
        membership,
        user_role: membership?.role || null, // 현재 사용자의 역할 추가
        member_count: memberCount,
        interview_count: interviewCount,
        persona_count: personaCount,
        project_members: undefined, // 중복 데이터 제거
        interviews: undefined // 중복 데이터 제거
      }
    })

    // 성능 최적화: 캐시 헤더 추가 (1분간 캐시)
    const headers = {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
    }

    return NextResponse.json({
      data: transformedData,
      success: true
    }, { headers })
  } catch (error) {
    // API route 오류
    
    return NextResponse.json({
      error: "프로젝트 데이터를 가져오는데 실패했습니다",
      success: false
    }, { status: 500 })
  }
}

// 새로운 프로젝트 생성
export async function POST(request: Request) {
  try {
    // 인증 처리 (캐시 적용)
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({
        error: "인증이 필요합니다",
        success: false
      }, { status: 401 })
    }

    const { userId, companyId } = await getAuthenticatedUserProfile(authorization, supabaseAdmin)
    
    const body = await request.json()
    
    const {
      name,
      description,
      visibility = 'public',
      join_method = 'open',
      password,
      purpose,
      target_audience,
      research_method,
      start_date,
      end_date
    } = body

    // 필수 필드 검증
    if (!name) {
      return NextResponse.json({
        error: "name은 필수 입력 사항입니다",
        success: false
      }, { status: 400 })
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
        created_by: userId,
        company_id: companyId,
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
      // 프로젝트 생성 실패
      return NextResponse.json({
        error: "프로젝트 생성에 실패했습니다",
        success: false
      }, { status: 500 })
    }

    // 프로젝트 생성자를 owner로 project_members에 추가
    const { error: memberError } = await supabaseAdmin
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: userId,
        role: 'owner',
        joined_at: new Date().toISOString()
      })

    if (memberError) {
      // 프로젝트 멤버 추가 실패
      // 프로젝트는 생성되었지만 멤버 추가에 실패한 경우
      // 롤백하지 않고 경고만 로그
    }

    return NextResponse.json({
      message: "프로젝트가 성공적으로 생성되었습니다",
      data: project,
      success: true
    })

  } catch (error) {
    // 프로젝트 생성 API 오류
    return NextResponse.json({
      error: "서버 오류가 발생했습니다",
      success: false
    }, { status: 500 })
  }
}