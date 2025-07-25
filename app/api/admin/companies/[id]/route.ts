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

    // getAuthenticatedUserProfile을 사용하여 인증 및 프로필 정보 조회
    const { userId, companyId } = await getAuthenticatedUserProfile(authorization, supabaseAdmin)
    
    // 사용자 역할 정보 조회
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

// PUT: 회사 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const accessCheck = await checkSuperAdminAccess(request)
  if (!accessCheck.hasAccess) {
    return NextResponse.json({ error: accessCheck.error }, { status: 403 })
  }

  try {
    const { id } = params
    const body = await request.json()
    const { name, description, domains, is_active } = body

    if (!name) {
      return NextResponse.json({ error: '회사명은 필수입니다' }, { status: 400 })
    }

    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .update({
        name,
        description: description || null,
        domains: domains || [],
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: '회사 수정에 실패했습니다' }, { status: 500 })
    }

    if (!company) {
      return NextResponse.json({ error: '회사를 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json(company)
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// DELETE: 회사 삭제
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

    // 회사에 연결된 프로필이 있는지 확인
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('company_id', id)
      .limit(1)

    if (profilesError) {
      return NextResponse.json({ error: '회사 사용자 확인에 실패했습니다' }, { status: 500 })
    }

    if (profiles && profiles.length > 0) {
      return NextResponse.json(
        { error: '이 회사에 연결된 사용자가 있어 삭제할 수 없습니다' }, 
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('companies')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: '회사 삭제에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ message: '회사가 성공적으로 삭제되었습니다' })
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
} 