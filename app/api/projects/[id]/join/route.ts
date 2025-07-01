import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const body = await request.json()
    const { user_id } = body
    
    // Authorization 헤더에서 사용자 토큰 가져오기
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        error: '인증 토큰이 필요합니다',
        success: false
      }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // 토큰으로 사용자 정보 확인
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user || user.id !== user_id) {
      return NextResponse.json({
        error: '인증되지 않은 사용자입니다',
        success: false
      }, { status: 401 })
    }

    // 프로젝트 정보 확인
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, visibility, company_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({
        error: '프로젝트를 찾을 수 없습니다',
        success: false
      }, { status: 404 })
    }

    // 공개 프로젝트가 아닌 경우 거부
    if (project.visibility !== 'public') {
      return NextResponse.json({
        error: '비공개 프로젝트에는 직접 참여할 수 없습니다',
        success: false
      }, { status: 403 })
    }

    // 사용자가 같은 회사인지 확인
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', user_id)
      .single()

    if (profileError || !userProfile || userProfile.company_id !== project.company_id) {
      return NextResponse.json({
        error: '다른 회사의 프로젝트에는 참여할 수 없습니다',
        success: false
      }, { status: 403 })
    }

    // 이미 멤버인지 확인
    const { data: existingMember } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user_id)
      .single()

    if (existingMember) {
      return NextResponse.json({
        error: '이미 프로젝트 멤버입니다',
        success: false
      }, { status: 400 })
    }

    // 프로젝트 멤버로 추가
    const { data: newMember, error: insertError } = await supabaseAdmin
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: user_id,
        role: 'member',
        joined_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({
        error: '프로젝트 참여에 실패했습니다',
        details: insertError.message,
        success: false
      }, { status: 500 })
    }

    // 프로젝트 정보를 다시 조회해서 반환 (user_role 포함)
    const { data: updatedProject } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        project_members(count)
      `)
      .eq('id', projectId)
      .single()
    
    const projectWithRole = {
      ...updatedProject,
      user_role: 'member' as const,
      member_count: updatedProject?.project_members?.[0]?.count || 1
    }

    return NextResponse.json({
      data: {
        member: newMember,
        project: projectWithRole
      },
      success: true
    })

  } catch (error) {
    return NextResponse.json({
      error: '서버 오류가 발생했습니다',
      success: false
    }, { status: 500 })
  }
}