import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getAuthenticatedUserProfile } from "@/lib/utils/auth-cache"

// 프로젝트 권한 확인 함수
async function checkProjectAccess(projectId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select(`
      *,
      project_members!inner(
        id,
        role,
        joined_at,
        user_id
      )
    `)
    .eq('id', projectId)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return { hasAccess: false, error: "프로젝트를 찾을 수 없습니다", project: null }
  }

  // 사용자의 프로필 정보 조회
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, company_id')
    .eq('id', userId)
    .single()

  if (!profile) {
    return { hasAccess: false, error: "사용자 정보를 찾을 수 없습니다", project: null }
  }

  // 권한 확인
  const isOwner = data.created_by === userId
  const isMaster = data.master_id === userId
  const isCompanyAdmin = profile.role === 'company_admin' || profile.role === 'super_admin'
  const isInSameCompany = profile.company_id === data.company_id
  const isMember = data.project_members?.some((pm) => pm.user_id === userId)
  
  // 공개 프로젝트: 같은 회사 구성원은 모두 접근 가능
  // 비공개 프로젝트: 멤버, 생성자, 마스터, 회사 관리자만 접근 가능
  const hasAccess = isInSameCompany && (
    data.visibility === 'public' ||
    isOwner ||
    isMaster ||
    isCompanyAdmin ||
    isMember
  )

  // 멤버십 정보를 프로젝트에 포함
  const membership = data.project_members?.find((pm) => pm.user_id === userId)
  const projectData = {
    ...data,
    membership,
    project_members: undefined // 중복 데이터 제거
  }

  return { 
    hasAccess, 
    project: projectData,
    isOwner,
    isMaster,
    isCompanyAdmin
  }
}

// 단일 프로젝트 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authorization 헤더 확인
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({
        error: "인증이 필요합니다",
        success: false
      }, { status: 401 })
    }

    const { userId } = await getAuthenticatedUserProfile(authorization, supabaseAdmin)

    const resolvedParams = await params
    const projectId = resolvedParams.id

    // 프로젝트 접근 권한 확인
    const accessCheck = await checkProjectAccess(projectId, userId)
    
    if (!accessCheck.hasAccess) {
      return NextResponse.json({
        error: accessCheck.error || "프로젝트에 접근할 권한이 없습니다",
        success: false
      }, { status: 403 })
    }

    // Add cache headers for performance
    const headers = {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300'
    }

    return NextResponse.json({
      data: accessCheck.project,
      success: true
    }, { headers })
  } catch (error) {
    // GET API route 오류
    
    return NextResponse.json({
      error: "프로젝트 정보를 가져오는데 실패했습니다",
      success: false
    }, { status: 500 })
  }
}

// 프로젝트 수정
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { ...updateData } = body
    const resolvedParams = await params
    const projectId = resolvedParams.id
    
    // Authorization 헤더 확인
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({
        error: "인증이 필요합니다",
        success: false
      }, { status: 401 })
    }

    const { userId } = await getAuthenticatedUserProfile(authorization, supabaseAdmin)

    // 프로젝트 접근 권한 확인
    const accessCheck = await checkProjectAccess(projectId, userId)
    
    if (!accessCheck.hasAccess) {
      return NextResponse.json({
        error: "프로젝트를 찾을 수 없습니다",
        success: false
      }, { status: 404 })
    }

    // 수정 권한 확인 (생성자, 마스터, 회사 관리자만)
    if (!accessCheck.isOwner && !accessCheck.isMaster && !accessCheck.isCompanyAdmin) {
      return NextResponse.json({
        error: "프로젝트 수정 권한이 없습니다",
        success: false
      }, { status: 403 })
    }

    // 마스터 위임의 경우 현재 마스터만 가능
    if (updateData.master_id && !accessCheck.isMaster) {
      return NextResponse.json({
        error: "마스터 권한 위임은 현재 마스터만 할 수 있습니다",
        success: false
      }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('projects')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()

    if (error) {
      // Supabase 업데이트 오류
      return NextResponse.json({
        error: `프로젝트 업데이트에 실패했습니다: ${error.message}`,
        success: false
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        error: "프로젝트 업데이트에 실패했습니다",
        success: false
      }, { status: 404 })
    }

    return NextResponse.json({
      data: data[0],
      success: true
    })
  } catch (error) {
    // PUT API route 오류
    
    return NextResponse.json({
      error: "프로젝트 업데이트에 실패했습니다",
      success: false
    }, { status: 500 })
  }
}

// PATCH 메서드도 PUT과 동일하게 처리
export const PATCH = PUT

// 프로젝트 삭제 (비활성화)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const projectId = resolvedParams.id
    
    // Authorization 헤더 확인
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({
        error: "인증이 필요합니다",
        success: false
      }, { status: 401 })
    }

    const { userId } = await getAuthenticatedUserProfile(authorization, supabaseAdmin)

    // 프로젝트 접근 권한 확인
    const accessCheck = await checkProjectAccess(projectId, userId)
    
    if (!accessCheck.hasAccess) {
      return NextResponse.json({
        error: "프로젝트를 찾을 수 없습니다",
        success: false
      }, { status: 404 })
    }

    // 삭제 권한 확인 (생성자, 회사 관리자만)
    if (!accessCheck.isOwner && !accessCheck.isCompanyAdmin) {
      return NextResponse.json({
        error: "프로젝트 삭제 권한이 없습니다",
        success: false
      }, { status: 403 })
    }

    // 실제 삭제 대신 비활성화
    const { data, error } = await supabaseAdmin
      .from('projects')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()

    if (error) {
      // Supabase 업데이트 오류
      return NextResponse.json({
        error: "프로젝트 삭제에 실패했습니다",
        success: false
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        error: "프로젝트 삭제에 실패했습니다",
        success: false
      }, { status: 404 })
    }

    return NextResponse.json({
      message: "프로젝트가 성공적으로 삭제되었습니다",
      success: true
    })
  } catch (error) {
    // DELETE API route 오류
    
    return NextResponse.json({
      error: "프로젝트 삭제에 실패했습니다",
      success: false
    }, { status: 500 })
  }
}