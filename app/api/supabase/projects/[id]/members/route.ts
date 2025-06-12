import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authorization 헤더에서 사용자 토큰 가져오기
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증 토큰이 필요합니다' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // 토큰으로 사용자 정보 확인
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다' }, { status: 401 })
    }

    // 프로젝트 존재 여부 및 접근 권한 확인
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, visibility, company_id')
      .eq('id', params.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 })
    }

    // 비공개 프로젝트인 경우 멤버십 확인
    if (project.visibility === 'private') {
      const { data: membership } = await supabaseAdmin
        .from('project_members')
        .select('id')
        .eq('project_id', params.id)
        .eq('user_id', user.id)
        .single()

      if (!membership) {
        return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 })
      }
    }

    // 프로젝트 멤버 목록을 프로필 정보와 함께 조회 (RPC 함수 사용)
    const { data: members, error: membersError } = await supabaseAdmin
      .rpc('get_project_members_with_profiles', {
        p_project_id: params.id
      })

    if (membersError) {
      console.error('Error fetching project members:', membersError)
      
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
        .eq('project_id', params.id)
        .order('created_at', { ascending: true })

      if (fallbackError) {
        console.error('Fallback query error:', fallbackError)
        return NextResponse.json({ 
          error: '멤버 목록을 가져오는데 실패했습니다',
          details: fallbackError.message 
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

      return NextResponse.json({ 
        data: transformedMembers
      })
    }

    // RPC 결과를 프론트엔드에서 예상하는 형식으로 변환
    const transformedMembers = (members || []).map((member: any) => ({
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

    return NextResponse.json({ 
      data: transformedMembers
    })

  } catch (error) {
    console.error('Error in GET /api/supabase/projects/[id]/members:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}