import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Authorization 헤더 확인
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({
        error: '인증이 필요합니다',
        success: false
      }, { status: 401 })
    }

    const { userId } = await getAuthenticatedUserProfile(authorization, supabaseAdmin)

    // 프로젝트 존재 여부 및 접근 권한 확인
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, visibility, company_id')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({
        error: '프로젝트를 찾을 수 없습니다',
        success: false
      }, { status: 404 })
    }

    // 비공개 프로젝트인 경우 멤버십 확인
    if (project.visibility === 'private') {
      const { data: membership } = await supabaseAdmin
        .from('project_members')
        .select('id')
        .eq('project_id', id)
        .eq('user_id', userId)
        .single()

      if (!membership) {
        return NextResponse.json({
          error: '접근 권한이 없습니다',
          success: false
        }, { status: 403 })
      }
    }

    // 프로젝트 멤버 목록을 프로필 정보와 함께 조회 (RPC 함수 사용)
    const { data: members, error: membersError } = await supabaseAdmin
      .rpc('get_project_members_with_profiles', {
        p_project_id: id
      })

    if (membersError) {
      // 프로젝트 멤버 조회 오류
      
      // RPC 함수가 없는 경우 대체 쿼리 실행
      const { data: membersList, error: fallbackError } = await supabaseAdmin
        .from('project_members')
        .select(`
          *,
          profiles:profiles!project_members_user_id_fkey (
            id,
            name,
            avatar_url
          )
        `)
        .eq('project_id', id)
        .order('created_at', { ascending: true })

      if (fallbackError) {
        // Fallback 쿼리 오류
        return NextResponse.json({
          error: '멤버 목록을 가져오는데 실패했습니다',
          details: fallbackError.message,
          success: false
        }, { status: 500 })
      }

      // Fallback 데이터 변환
      const transformedMembers = (membersList || []).map(member => ({
        ...member,
        profile: {
          id: member.profiles?.id || member.user_id,
          name: member.profiles?.name || 'Unknown User',
          email: '', // 이메일은 auth 테이블에 있어서 별도 조회 필요
          avatar_url: member.profiles?.avatar_url || null
        }
      }))

      // Add cache headers for performance
      const headers = {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }

      return NextResponse.json({
        data: transformedMembers,
        success: true
      }, { headers })
    }

    // RPC 결과를 프론트엔드에서 예상하는 형식으로 변환
    const transformedMembers = (members || []).map((member) => ({
      id: member.id,
      user_id: member.user_id,
      project_id: member.project_id,
      role: member.role,
      joined_at: member.joined_at,
      created_at: member.created_at,
      updated_at: member.updated_at,
      profile: {
        id: member.profile_id || member.user_id,
        name: member.profile_name || 'Unknown User',
        email: member.profile_email || '',
        avatar_url: member.profile_avatar_url || null
      }
    }))

    // Add cache headers for performance
    const headers = {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
    }

    return NextResponse.json({
      data: transformedMembers,
      success: true
    }, { headers })

  } catch (error) {
    // GET /api/projects/[id]/members 오류
    return NextResponse.json({
      error: '서버 오류가 발생했습니다',
      success: false
    }, { status: 500 })
  }
}