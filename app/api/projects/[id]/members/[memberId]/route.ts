import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: projectId, memberId } = await params
    const body = await request.json()
    const { role } = body
    
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
    if (authError || !user) {
      return NextResponse.json({
        error: '인증되지 않은 사용자입니다',
        success: false
      }, { status: 401 })
    }

    // 현재 사용자의 프로젝트 권한 확인
    const { data: currentUserMember, error: memberError } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !currentUserMember) {
      return NextResponse.json({
        error: '프로젝트에 대한 권한이 없습니다',
        success: false
      }, { status: 403 })
    }

    // 관리자 또는 소유자만 역할 변경 가능
    if (currentUserMember.role !== 'owner' && currentUserMember.role !== 'admin') {
      return NextResponse.json({
        error: '역할을 변경할 권한이 없습니다',
        success: false
      }, { status: 403 })
    }

    // 대상 멤버 확인
    const { data: targetMember, error: targetError } = await supabaseAdmin
      .from('project_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('project_id', projectId)
      .single()

    if (targetError || !targetMember) {
      return NextResponse.json({
        error: '멤버를 찾을 수 없습니다',
        success: false
      }, { status: 404 })
    }

    // 소유자는 역할 변경 불가
    if (targetMember.role === 'owner') {
      return NextResponse.json({
        error: '소유자의 역할은 변경할 수 없습니다',
        success: false
      }, { status: 400 })
    }

    // 유효한 역할인지 확인
    if (role !== 'admin' && role !== 'member') {
      return NextResponse.json({
        error: '유효하지 않은 역할입니다',
        success: false
      }, { status: 400 })
    }

    // 역할 업데이트
    const { data: updatedMember, error: updateError } = await supabaseAdmin
      .from('project_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', memberId)
      .eq('project_id', projectId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({
        error: '역할 변경에 실패했습니다',
        details: updateError.message,
        success: false
      }, { status: 500 })
    }

    return NextResponse.json({
      data: updatedMember,
      success: true
    })

  } catch (error) {
    return NextResponse.json({
      error: '서버 오류가 발생했습니다',
      success: false
    }, { status: 500 })
  }
}