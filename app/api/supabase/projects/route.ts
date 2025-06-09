import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"

// 프로젝트 마스터 권한 확인 함수
async function checkProjectMaster(projectId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('master_id, company_id')
    .eq('id', projectId)
    .single()

  if (error || !data) {
    return { isAuthorized: false, error: "프로젝트를 찾을 수 없습니다" }
  }

  // 프로젝트 마스터이거나 회사 관리자인지 확인
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, company_id')
    .eq('id', userId)
    .single()

  const isMaster = data.master_id === userId
  const isCompanyAdmin = profile?.role === 'company_admin' || profile?.role === 'super_admin'
  const isInSameCompany = profile?.company_id === data.company_id

  return {
    isAuthorized: isMaster || (isCompanyAdmin && isInSameCompany),
    isMaster,
    isCompanyAdmin
  }
}

// 사용자가 소속된 프로젝트 조회 (공개 프로젝트 + 멤버십이 있는 비공개 프로젝트)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get('company_id')
    const user_id = searchParams.get('user_id')

    // company_id와 user_id가 필수로 제공되어야 함
    if (!company_id || !user_id) {
      return NextResponse.json(
        { error: "company_id와 user_id가 필요합니다" }, 
        { status: 400 }
      )
    }

    // 사용자가 소속된 프로젝트 조회
    // 1. 회사의 공개 프로젝트 (모든 회사 구성원이 볼 수 있음)
    // 2. 사용자가 멤버로 등록된 비공개 프로젝트
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
      .eq('company_id', company_id)
      .eq('is_active', true)
      .or(
        `visibility.eq.public,and(visibility.eq.private,project_members.user_id.eq.${user_id})`
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Supabase 조회 오류:", error)
      
      // fallback: 기본 쿼리로 회사의 모든 프로젝트 조회 (멤버십 정보 없이)
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('company_id', company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (fallbackError) {
        console.error("Fallback 조회도 실패:", fallbackError)
        return NextResponse.json(
          { error: "프로젝트 데이터를 가져오는데 실패했습니다" }, 
          { status: 500 }
        )
      }

      return NextResponse.json({ data: fallbackData })
    }

    // 데이터 변환: 멤버십 정보를 프로젝트 객체에 직접 포함
    const transformedData = data.map((project: any) => {
      const membership = project.project_members?.find((pm: any) => pm.user_id === user_id)
      return {
        ...project,
        membership,
        project_members: undefined // 중복 데이터 제거
      }
    })

    return NextResponse.json({ data: transformedData })
  } catch (error) {
    console.error("API route error:", error)
    
    return NextResponse.json(
      { error: "프로젝트 데이터를 가져오는데 실패했습니다" }, 
      { status: 500 }
    )
  }
}

// 새로운 프로젝트 생성
export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('프로젝트 생성 요청 데이터:', body)
    
    // 필수 필드 검증
    if (!body.name || !body.company_id) {
      console.log('필수 필드 누락:', { name: body.name, company_id: body.company_id })
      return NextResponse.json(
        { error: "프로젝트 이름과 회사 ID가 필요합니다" }, 
        { status: 400 }
      )
    }

    // 비밀번호 가입 방식일 때 비밀번호 필수 검증
    if (body.join_method === 'password' && !body.password) {
      return NextResponse.json(
        { error: "비밀번호 가입 방식을 선택했을 때는 비밀번호가 필요합니다" }, 
        { status: 400 }
      )
    }

    if (!body.created_by) {
      console.log('created_by 필드 누락')
      return NextResponse.json(
        { error: "사용자 인증이 필요합니다" }, 
        { status: 401 }
      )
    }

    // 같은 회사 내에서 중복된 프로젝트 이름 확인
    const { data: existingProject } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('company_id', body.company_id)
      .eq('name', body.name)
      .eq('is_active', true)
      .single()

    if (existingProject) {
      return NextResponse.json(
        { error: "같은 이름의 프로젝트가 이미 존재합니다" }, 
        { status: 409 }
      )
    }
    
    const insertData = {
      name: body.name,
      description: body.description || null,
      company_id: body.company_id,
      created_by: body.created_by,
      master_id: body.created_by, // 생성자가 마스터가 됨
      visibility: body.visibility || 'public',
      join_method: body.join_method || 'open',
      password: body.join_method === 'password' ? body.password : null
    }
    
    console.log('Supabase에 삽입할 데이터:', insertData)
    
    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert([insertData])
      .select()

    if (error) {
      console.error("Supabase 삽입 오류:", error)
      return NextResponse.json(
        { error: `프로젝트 생성에 실패했습니다: ${error.message}` }, 
        { status: 500 }
      )
    }

    const newProject = data[0]
    console.log('프로젝트 생성 성공:', newProject)

    // 프로젝트 생성자를 owner로 멤버십 테이블에 추가
    try {
      const { error: membershipError } = await supabaseAdmin
        .from('project_members')
        .insert([{
          project_id: newProject.id,
          user_id: body.created_by,
          role: 'owner'
        }])

      if (membershipError) {
        console.error("프로젝트 멤버십 생성 오류:", membershipError)
        // 멤버십 생성 실패는 경고만 하고 프로젝트 생성은 성공으로 처리
        console.warn("프로젝트는 생성되었지만 멤버십 정보 생성에 실패했습니다")
      }
    } catch (membershipErr) {
      console.error("프로젝트 멤버십 생성 예외:", membershipErr)
    }

    // 멤버십 정보를 포함한 프로젝트 데이터 반환
    const projectWithMembership = {
      ...newProject,
      membership: {
        id: null, // 새로 생성된 멤버십 ID는 모르지만 role은 확실함
        project_id: newProject.id,
        user_id: body.created_by,
        role: 'owner',
        joined_at: new Date().toISOString()
      }
    }

    return NextResponse.json({ data: projectWithMembership }, { status: 201 })
  } catch (error) {
    console.error("POST API route error:", error)
    
    return NextResponse.json(
      { error: "프로젝트 생성에 실패했습니다" }, 
      { status: 500 }
    )
  }
}

// 프로젝트 업데이트
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, user_id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json(
        { error: "프로젝트 ID가 필요합니다" }, 
        { status: 400 }
      )
    }

    if (!user_id) {
      return NextResponse.json(
        { error: "사용자 인증이 필요합니다" }, 
        { status: 401 }
      )
    }

    // 권한 확인
    const authCheck = await checkProjectMaster(id, user_id)
    if (!authCheck.isAuthorized) {
      return NextResponse.json(
        { error: authCheck.error || "프로젝트 수정 권한이 없습니다" }, 
        { status: 403 }
      )
    }

    // 마스터 위임의 경우 현재 마스터만 가능
    if (updateData.master_id && !authCheck.isMaster) {
      return NextResponse.json(
        { error: "마스터 권한 위임은 현재 마스터만 할 수 있습니다" }, 
        { status: 403 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('projects')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error("Supabase 업데이트 오류:", error)
      return NextResponse.json(
        { error: "프로젝트 업데이트에 실패했습니다" }, 
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "해당 ID의 프로젝트를 찾을 수 없습니다" }, 
        { status: 404 }
      )
    }

    return NextResponse.json({ data: data[0] })
  } catch (error) {
    console.error("PUT API route error:", error)
    
    return NextResponse.json(
      { error: "프로젝트 업데이트에 실패했습니다" }, 
      { status: 500 }
    )
  }
}

// 프로젝트 삭제 (비활성화) - 마스터만 가능
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const user_id = searchParams.get('user_id')
    
    if (!id) {
      return NextResponse.json(
        { error: "프로젝트 ID가 필요합니다" }, 
        { status: 400 }
      )
    }

    if (!user_id) {
      return NextResponse.json(
        { error: "사용자 인증이 필요합니다" }, 
        { status: 401 }
      )
    }

    // 마스터 권한 확인
    const authCheck = await checkProjectMaster(id, user_id)
    if (!authCheck.isMaster) {
      return NextResponse.json(
        { error: "프로젝트 삭제는 마스터만 할 수 있습니다" }, 
        { status: 403 }
      )
    }

    // 실제 삭제 대신 비활성화
    const { data, error } = await supabaseAdmin
      .from('projects')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error("Supabase 업데이트 오류:", error)
      return NextResponse.json(
        { error: "프로젝트 삭제에 실패했습니다" }, 
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "해당 ID의 프로젝트를 찾을 수 없습니다" }, 
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "프로젝트가 성공적으로 삭제되었습니다" })
  } catch (error) {
    console.error("DELETE API route error:", error)
    
    return NextResponse.json(
      { error: "프로젝트 삭제에 실패했습니다" }, 
      { status: 500 }
    )
  }
} 