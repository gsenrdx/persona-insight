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

// GET: 모든 회사 목록 조회
export async function GET(request: NextRequest) {
  const accessCheck = await checkSuperAdminAccess(request)
  if (!accessCheck.hasAccess) {
    return NextResponse.json({ error: accessCheck.error }, { status: 403 })
  }

  try {
    const { data: companies, error } = await supabaseAdmin
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: '회사 목록 조회에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json(companies)
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// POST: 새 회사 생성
export async function POST(request: NextRequest) {
  const accessCheck = await checkSuperAdminAccess(request)
  if (!accessCheck.hasAccess) {
    return NextResponse.json({ error: accessCheck.error }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, description, domains } = body

    if (!name) {
      return NextResponse.json({ error: '회사명은 필수입니다' }, { status: 400 })
    }

    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .insert({
        name,
        description: description || null,
        domains: domains || []
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: '회사 생성에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
} 