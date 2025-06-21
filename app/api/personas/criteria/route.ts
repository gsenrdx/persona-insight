import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"

// 페르소나 생성 로직은 /api/personas/sync로 이관됨

// 권한 확인 함수 (최적화됨 - 단일 쿼리)
async function checkPermission(companyId: string, userId: string, projectId?: string) {
  // 프로젝트 권한이 필요한 경우 JOIN으로 한 번에 조회
  if (projectId) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        role,
        company_id,
        project_members!inner (
          role,
          project_id
        )
      `)
      .eq('id', userId)
      .eq('project_members.project_id', projectId)
      .single()

    if (error || !data) {
      // 프로젝트 멤버가 아닌 경우, 프로필만 체크
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role, company_id')
        .eq('id', userId)
        .single()

      if (!profile) {
        return { isAuthorized: false, error: "사용자를 찾을 수 없습니다" }
      }

      if (profile.company_id !== companyId) {
        return { isAuthorized: false, error: "회사 접근 권한이 없습니다" }
      }

      // 회사 관리자는 모든 프로젝트 접근 가능
      if (profile.role === 'company_admin' || profile.role === 'super_admin') {
        return { isAuthorized: true, canEdit: true }
      }

      return { isAuthorized: false, error: "프로젝트 접근 권한이 없습니다" }
    }

    // 회사 확인
    if (data.company_id !== companyId) {
      return { isAuthorized: false, error: "회사 접근 권한이 없습니다" }
    }

    // 프로젝트 권한 확인
    const projectRole = data.project_members[0].role
    const canEdit = projectRole === 'owner' || projectRole === 'admin' || 
                   data.role === 'company_admin' || data.role === 'super_admin'
    
    return { isAuthorized: true, canEdit }
  }

  // 회사 권한만 필요한 경우
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, company_id')
    .eq('id', userId)
    .single()

  if (!profile) {
    return { isAuthorized: false, error: "사용자를 찾을 수 없습니다" }
  }

  if (profile.company_id !== companyId) {
    return { isAuthorized: false, error: "회사 접근 권한이 없습니다" }
  }

  const canEdit = profile.role === 'company_admin' || profile.role === 'super_admin'
  
  return { isAuthorized: true, canEdit }
}

// 페르소나 분류 기준 설정 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get('company_id')
    const project_id = searchParams.get('project_id')

    if (!company_id) {
      return NextResponse.json({
        error: "company_id가 필요합니다",
        success: false
      }, { status: 400 })
    }

    // 프로젝트별 설정 우선, 없으면 회사별 설정
    let query = supabaseAdmin
      .from('persona_criteria_configurations')
      .select('*')
      .eq('company_id', company_id)
      .eq('is_active', true)

    if (project_id) {
      query = query.eq('project_id', project_id)
    } else {
      query = query.is('project_id', null)
    }

    const { data, error } = await query.single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      return NextResponse.json({
        error: "페르소나 분류 기준을 가져오는데 실패했습니다",
        success: false
      }, { status: 500 })
    }

    // Add cache headers for performance
    const headers = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
    }

    return NextResponse.json({
      configuration: data,
      success: true
    }, { headers })
  } catch (error) {
    
    return NextResponse.json({
      error: "페르소나 분류 기준을 가져오는데 실패했습니다",
      success: false
    }, { status: 500 })
  }
}

// 페르소나 분류 기준 설정 생성
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // 필수 필드 검증
    if (!body.company_id || !body.x_axis || !body.y_axis) {
      return NextResponse.json({
        error: "필수 필드가 누락되었습니다",
        success: false
      }, { status: 400 })
    }

    if (!body.created_by) {
      return NextResponse.json({
        error: "사용자 인증이 필요합니다",
        success: false
      }, { status: 401 })
    }

    // 권한 확인
    const authCheck = await checkPermission(body.company_id, body.created_by, body.project_id)
    if (!authCheck.isAuthorized || !authCheck.canEdit) {
      return NextResponse.json({
        error: authCheck.error || "페르소나 분류 기준 생성 권한이 없습니다",
        success: false
      }, { status: 403 })
    }

    // 중복 설정 확인
    let duplicateQuery = supabaseAdmin
      .from('persona_criteria_configurations')
      .select('id')
      .eq('company_id', body.company_id)
      .eq('is_active', true)

    if (body.project_id) {
      duplicateQuery = duplicateQuery.eq('project_id', body.project_id)
    } else {
      duplicateQuery = duplicateQuery.is('project_id', null)
    }

    const { data: existing } = await duplicateQuery.single()

    if (existing) {
      return NextResponse.json({
        error: "이미 설정이 존재합니다. 업데이트를 사용해주세요.",
        success: false
      }, { status: 409 })
    }
    
    const insertData = {
      project_id: body.project_id || null,
      company_id: body.company_id,
      x_axis: body.x_axis,
      y_axis: body.y_axis,
      unclassified_cells: body.unclassified_cells || [],
      persona_matrix: body.persona_matrix || {},
      output_config: body.output_config,
      scoring_guidelines: body.scoring_guidelines,
      created_by: body.created_by
    }
    
    
    const { data, error } = await supabaseAdmin
      .from('persona_criteria_configurations')
      .insert([insertData])
      .select()

    if (error) {
      return NextResponse.json({
        error: `페르소나 분류 기준 생성에 실패했습니다: ${error.message}`,
        success: false
      }, { status: 500 })
    }

    const newConfiguration = data[0]

    // 페르소나 동기화는 별도 API(/api/personas/sync)에서 처리
    // 클라이언트에서 기준 생성 후 동기화 API를 호출하도록 함

    return NextResponse.json({
      configuration: newConfiguration,
      success: true
    }, { status: 201 })
  } catch (error) {
    
    return NextResponse.json({
      error: "페르소나 분류 기준 생성에 실패했습니다",
      success: false
    }, { status: 500 })
  }
}

// 페르소나 분류 기준 설정 업데이트
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, user_id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({
        error: "설정 ID가 필요합니다",
        success: false
      }, { status: 400 })
    }

    if (!user_id) {
      return NextResponse.json({
        error: "사용자 인증이 필요합니다",
        success: false
      }, { status: 401 })
    }

    // 기존 설정 조회하여 권한 확인
    const { data: existingConfig } = await supabaseAdmin
      .from('persona_criteria_configurations')
      .select('company_id, project_id')
      .eq('id', id)
      .single()

    if (!existingConfig) {
      return NextResponse.json({
        error: "해당 설정을 찾을 수 없습니다",
        success: false
      }, { status: 404 })
    }

    // 권한 확인
    const authCheck = await checkPermission(
      existingConfig.company_id, 
      user_id, 
      existingConfig.project_id
    )
    
    if (!authCheck.isAuthorized || !authCheck.canEdit) {
      return NextResponse.json({
        error: authCheck.error || "페르소나 분류 기준 수정 권한이 없습니다",
        success: false
      }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('persona_criteria_configurations')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({
        error: "페르소나 분류 기준 업데이트에 실패했습니다",
        success: false
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        error: "해당 ID의 설정을 찾을 수 없습니다",
        success: false
      }, { status: 404 })
    }

    // 페르소나 동기화는 별도 API(/api/personas/sync)에서 처리
    // 클라이언트에서 기준 저장 후 동기화 API를 호출하도록 함

    return NextResponse.json({
      configuration: data[0],
      success: true
    })
  } catch (error) {
    
    return NextResponse.json({
      error: "페르소나 분류 기준 업데이트에 실패했습니다",
      success: false
    }, { status: 500 })
  }
}

// 페르소나 분류 기준 설정 삭제 (비활성화)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const user_id = searchParams.get('user_id')
    
    if (!id) {
      return NextResponse.json({
        error: "설정 ID가 필요합니다",
        success: false
      }, { status: 400 })
    }

    if (!user_id) {
      return NextResponse.json({
        error: "사용자 인증이 필요합니다",
        success: false
      }, { status: 401 })
    }

    // 기존 설정 조회하여 권한 확인
    const { data: existingConfig } = await supabaseAdmin
      .from('persona_criteria_configurations')
      .select('company_id, project_id')
      .eq('id', id)
      .single()

    if (!existingConfig) {
      return NextResponse.json({
        error: "해당 설정을 찾을 수 없습니다",
        success: false
      }, { status: 404 })
    }

    // 권한 확인
    const authCheck = await checkPermission(
      existingConfig.company_id, 
      user_id, 
      existingConfig.project_id
    )
    
    if (!authCheck.isAuthorized || !authCheck.canEdit) {
      return NextResponse.json({
        error: authCheck.error || "페르소나 분류 기준 삭제 권한이 없습니다",
        success: false
      }, { status: 403 })
    }

    // 실제 삭제 대신 비활성화
    const { data, error } = await supabaseAdmin
      .from('persona_criteria_configurations')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({
        error: "페르소나 분류 기준 삭제에 실패했습니다",
        success: false
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        error: "해당 ID의 설정을 찾을 수 없습니다",
        success: false
      }, { status: 404 })
    }

    return NextResponse.json({
      message: "페르소나 분류 기준이 성공적으로 삭제되었습니다",
      success: true
    })
  } catch (error) {
    
    return NextResponse.json({
      error: "페르소나 분류 기준 삭제에 실패했습니다",
      success: false
    }, { status: 500 })
  }
}