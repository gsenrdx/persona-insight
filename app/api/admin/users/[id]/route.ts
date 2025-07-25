import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'

// 권한 체크 함수
async function checkSuperAdminAccess(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return { hasAccess: false, error: '인증 토큰이 없습니다' }
    }

    const { userId, companyId } = await getAuthenticatedUserProfile(authorization, supabaseAdmin)
    
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return { hasAccess: false, error: '사용자 정보를 찾을 수 없습니다' }
    }

    if (profile.role !== 'super_admin') {
      return { hasAccess: false, error: '접근 권한이 없습니다' }
    }

    return { hasAccess: true, userId, companyId }
  } catch (error) {
    console.error('Super admin access check error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    return { hasAccess: false, error: `인증 확인 중 오류가 발생했습니다: ${errorMessage}` }
  }
}

// DELETE: 사용자 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const accessCheck = await checkSuperAdminAccess(request)
  if (!accessCheck.hasAccess) {
    return NextResponse.json({ error: accessCheck.error }, { status: 403 })
  }

  try {
    const { id } = params

    // 자기 자신을 삭제하려는지 확인
    if (id === accessCheck.userId) {
      return NextResponse.json({ error: '자기 자신은 삭제할 수 없습니다' }, { status: 400 })
    }

    // 사용자가 존재하는지 확인
    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
    }

    // 사용자와 관련된 데이터 확인 (필요시 추가)
    // 예: 프로젝트 소유자인지, 인터뷰 데이터가 있는지 등

    // 사용자 삭제
    const { error } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: '사용자 삭제에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ message: '사용자가 성공적으로 삭제되었습니다' })
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
} 