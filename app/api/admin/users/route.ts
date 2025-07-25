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

// GET: 모든 사용자 목록 조회
export async function GET(request: NextRequest) {
  const accessCheck = await checkSuperAdminAccess(request)
  if (!accessCheck.hasAccess) {
    return NextResponse.json({ error: accessCheck.error }, { status: 403 })
  }

  try {
    // 사용자 정보 조회
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        name,
        role,
        company_id,
        created_at,
        updated_at,
        is_active
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Users query error:', error)
      return NextResponse.json({ error: '사용자 목록 조회에 실패했습니다' }, { status: 500 })
    }

    // auth.users에서 이메일 정보 조회
    let emailMap = new Map()
    try {
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
      if (!authError && authUsers?.users) {
        authUsers.users.forEach(user => {
          emailMap.set(user.id, user.email)
        })
      }
    } catch (emailError) {
      console.log('이메일 조회 실패, 이메일 없이 진행:', emailError)
    }

    // 회사 정보 별도 조회
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, name')

    if (companiesError) {
      console.error('Companies query error:', companiesError)
      return NextResponse.json({ error: '회사 정보 조회에 실패했습니다' }, { status: 500 })
    }

    // 사용자 데이터에 이메일과 회사 정보 매핑
    const usersWithCompanies = users.map((user: any) => ({
      ...user,
      email: emailMap.get(user.id) || null,
      companies: user.company_id 
        ? companies.find(company => company.id === user.company_id) || null
        : null
    }))

    return NextResponse.json(usersWithCompanies)
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// POST: 사용자 역할 변경
export async function POST(request: NextRequest) {
  const accessCheck = await checkSuperAdminAccess(request)
  if (!accessCheck.hasAccess) {
    return NextResponse.json({ error: accessCheck.error }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { userId, role, companyId } = body

    if (!userId || !role) {
      return NextResponse.json({ error: '사용자 ID와 역할은 필수입니다' }, { status: 400 })
    }

    // 유효한 역할인지 확인
    const validRoles = ['super_admin', 'company_admin', 'company_user']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: '유효하지 않은 역할입니다' }, { status: 400 })
    }

    // 사용자 역할 업데이트
    const updateData: any = {
      role,
      updated_at: new Date().toISOString()
    }

    // super_admin이 아닌 경우 company_id 필수
    if (role !== 'super_admin') {
      if (!companyId) {
        return NextResponse.json({ error: '회사 ID는 필수입니다' }, { status: 400 })
      }
      updateData.company_id = companyId
    } else {
      // super_admin인 경우 company_id를 null로 설정
      updateData.company_id = null
    }

    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select(`
        id,
        name,
        role,
        company_id,
        created_at,
        updated_at,
        is_active
      `)
      .single()

    if (error) {
      console.error('User update error:', error)
      return NextResponse.json({ error: '사용자 역할 변경에 실패했습니다' }, { status: 500 })
    }

    // 이메일 정보 조회
    let userEmail = null
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
      if (authUser?.user) {
        userEmail = authUser.user.email
      }
    } catch (emailError) {
      console.log('사용자 이메일 조회 실패:', emailError)
    }

    // 회사 정보 추가 (필요한 경우)
    let userWithCompany: any = { 
      ...user, 
      email: userEmail,
      companies: null 
    }
    if (user.company_id) {
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('id, name')
        .eq('id', user.company_id)
        .single()
      
      if (company) {
        userWithCompany.companies = company
      }
    }

    return NextResponse.json(userWithCompany)
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
} 