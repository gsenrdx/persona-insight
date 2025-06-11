import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"

// 좌표 범위 계산 함수
function calculateCoordinateBounds(index: number, segmentCount: number): { min: number, max: number } {
  const segmentSize = 100 / segmentCount
  const min = index * segmentSize
  const max = (index + 1) * segmentSize
  return { min, max }
}

// 페르소나 타입 생성 함수 (A, B, C, D...)
function generatePersonaType(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index) // A-Z
  } else {
    // AA, AB, AC...
    const firstChar = String.fromCharCode(65 + Math.floor(index / 26) - 1)
    const secondChar = String.fromCharCode(65 + (index % 26))
    return firstChar + secondChar
  }
}

// 페르소나 자동 생성 함수
async function createPersonasFromMatrix(
  configurationId: string,
  companyId: string,
  projectId: string | null,
  xSegments: any[],
  ySegments: any[],
  personaMatrix: Record<string, any>,
  unclassifiedCells: any[]
) {
  const personasToCreate: any[] = []
  
  // 셀 정보를 수집하고 정렬 (왼쪽 아래부터 오른쪽으로, 위로 올라가는 순서)
  const cells: Array<[string, any]> = []
  for (const [cellId, cell] of Object.entries(personaMatrix)) {
    if (!cell || typeof cell !== 'object') continue
    cells.push([cellId, cell])
  }
  
  // yIndex 오름차순(아래부터), xIndex 오름차순(왼쪽부터) 정렬
  cells.sort((a, b) => {
    const yDiff = (a[1].yIndex || 0) - (b[1].yIndex || 0)
    if (yDiff !== 0) return yDiff
    return (a[1].xIndex || 0) - (b[1].xIndex || 0)
  })
  
  // 정렬된 순서대로 페르소나 생성
  cells.forEach(([cellId, cell], index) => {
    const xBounds = calculateCoordinateBounds(cell.xIndex || 0, xSegments.length)
    const yBounds = calculateCoordinateBounds(cell.yIndex || 0, ySegments.length)

    personasToCreate.push({
      persona_type: cell.personaType || generatePersonaType(index),  // UI에서 지정한 타입 우선 사용
      persona_title: cell.title || '',
      persona_description: cell.description || '',
      persona_summary: '',
      persona_style: '',
      painpoints: '',
      needs: '',
      insight: '',
      insight_quote: '',
      thumbnail: cell.thumbnail || null,  // 썸네일 필드 추가
      company_id: companyId,
      project_id: projectId,
      x_min: xBounds.min,
      x_max: xBounds.max,
      y_min: yBounds.min,
      y_max: yBounds.max,
      matrix_position: {
        xIndex: cell.xIndex || 0,
        yIndex: cell.yIndex || 0,
        cellId: cellId
      },
      criteria_configuration_id: configurationId
    })
  })

  if (personasToCreate.length > 0) {
    const { error } = await supabaseAdmin
      .from('personas')
      .insert(personasToCreate)

    if (error) {
      console.error("페르소나 생성 오류:", error)
      throw error
    }
  }

  return personasToCreate.length
}

// 권한 확인 함수
async function checkPermission(companyId: string, userId: string, projectId?: string) {
  // 사용자 프로필 조회
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, company_id')
    .eq('id', userId)
    .single()

  if (!profile) {
    return { isAuthorized: false, error: "사용자를 찾을 수 없습니다" }
  }

  // 같은 회사 구성원인지 확인
  if (profile.company_id !== companyId) {
    return { isAuthorized: false, error: "회사 접근 권한이 없습니다" }
  }

  // 프로젝트별 설정인 경우 프로젝트 멤버 권한 확인
  if (projectId) {
    const { data: membership } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    if (!membership) {
      return { isAuthorized: false, error: "프로젝트 접근 권한이 없습니다" }
    }

    // 프로젝트 관리자 또는 회사 관리자만 설정 수정 가능
    const canEdit = membership.role === 'owner' || membership.role === 'admin' || 
                   profile.role === 'company_admin' || profile.role === 'super_admin'
    
    return { isAuthorized: true, canEdit }
  }

  // 회사별 설정인 경우 회사 관리자만 수정 가능
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
      return NextResponse.json(
        { error: "company_id가 필요합니다" }, 
        { status: 400 }
      )
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
      console.error("Supabase 조회 오류:", error)
      return NextResponse.json(
        { error: "페르소나 분류 기준을 가져오는데 실패했습니다" }, 
        { status: 500 }
      )
    }

    return NextResponse.json({ configuration: data })
  } catch (error) {
    console.error("GET API route error:", error)
    
    return NextResponse.json(
      { error: "페르소나 분류 기준을 가져오는데 실패했습니다" }, 
      { status: 500 }
    )
  }
}

// 페르소나 분류 기준 설정 생성
export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('페르소나 분류 기준 생성 요청 데이터:', body)
    
    // 필수 필드 검증
    if (!body.company_id || !body.x_axis || !body.y_axis) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다" }, 
        { status: 400 }
      )
    }

    if (!body.created_by) {
      return NextResponse.json(
        { error: "사용자 인증이 필요합니다" }, 
        { status: 401 }
      )
    }

    // 권한 확인
    const authCheck = await checkPermission(body.company_id, body.created_by, body.project_id)
    if (!authCheck.isAuthorized || !authCheck.canEdit) {
      return NextResponse.json(
        { error: authCheck.error || "페르소나 분류 기준 생성 권한이 없습니다" }, 
        { status: 403 }
      )
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
      return NextResponse.json(
        { error: "이미 설정이 존재합니다. 업데이트를 사용해주세요." }, 
        { status: 409 }
      )
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
    
    console.log('Supabase에 삽입할 데이터:', insertData)
    
    const { data, error } = await supabaseAdmin
      .from('persona_criteria_configurations')
      .insert([insertData])
      .select()

    if (error) {
      console.error("Supabase 삽입 오류:", error)
      return NextResponse.json(
        { error: `페르소나 분류 기준 생성에 실패했습니다: ${error.message}` }, 
        { status: 500 }
      )
    }

    const newConfiguration = data[0]
    console.log('페르소나 분류 기준 생성 성공:', newConfiguration)

    // 페르소나 자동 생성
    try {
      const personaCount = await createPersonasFromMatrix(
        newConfiguration.id,
        body.company_id,
        body.project_id || null,
        body.x_axis.segments || [],
        body.y_axis.segments || [],
        body.persona_matrix || {},
        body.unclassified_cells || []
      )
      console.log(`${personaCount}개의 페르소나가 자동 생성되었습니다`)
    } catch (personaError) {
      console.error("페르소나 자동 생성 중 오류:", personaError)
      // 페르소나 생성 실패는 경고만 하고 계속 진행
    }

    return NextResponse.json({ configuration: newConfiguration }, { status: 201 })
  } catch (error) {
    console.error("POST API route error:", error)
    
    return NextResponse.json(
      { error: "페르소나 분류 기준 생성에 실패했습니다" }, 
      { status: 500 }
    )
  }
}

// 페르소나 분류 기준 설정 업데이트
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, user_id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json(
        { error: "설정 ID가 필요합니다" }, 
        { status: 400 }
      )
    }

    if (!user_id) {
      return NextResponse.json(
        { error: "사용자 인증이 필요합니다" }, 
        { status: 401 }
      )
    }

    // 기존 설정 조회하여 권한 확인
    const { data: existingConfig } = await supabaseAdmin
      .from('persona_criteria_configurations')
      .select('company_id, project_id')
      .eq('id', id)
      .single()

    if (!existingConfig) {
      return NextResponse.json(
        { error: "해당 설정을 찾을 수 없습니다" }, 
        { status: 404 }
      )
    }

    // 권한 확인
    const authCheck = await checkPermission(
      existingConfig.company_id, 
      user_id, 
      existingConfig.project_id
    )
    
    if (!authCheck.isAuthorized || !authCheck.canEdit) {
      return NextResponse.json(
        { error: authCheck.error || "페르소나 분류 기준 수정 권한이 없습니다" }, 
        { status: 403 }
      )
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
      console.error("Supabase 업데이트 오류:", error)
      return NextResponse.json(
        { error: "페르소나 분류 기준 업데이트에 실패했습니다" }, 
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "해당 ID의 설정을 찾을 수 없습니다" }, 
        { status: 404 }
      )
    }

    // 기존 페르소나 삭제 후 새로 생성
    if (updateData.persona_matrix !== undefined) {
      try {
        // 기존 페르소나 삭제
        await supabaseAdmin
          .from('personas')
          .delete()
          .eq('criteria_configuration_id', id)

        // 새 페르소나 생성
        const personaCount = await createPersonasFromMatrix(
          id,
          existingConfig.company_id,
          existingConfig.project_id,
          updateData.x_axis?.segments || [],
          updateData.y_axis?.segments || [],
          updateData.persona_matrix || {},
          updateData.unclassified_cells || []
        )
        console.log(`${personaCount}개의 페르소나가 재생성되었습니다`)
      } catch (personaError) {
        console.error("페르소나 재생성 중 오류:", personaError)
        // 페르소나 생성 실패는 경고만 하고 계속 진행
      }
    }

    return NextResponse.json({ configuration: data[0] })
  } catch (error) {
    console.error("PUT API route error:", error)
    
    return NextResponse.json(
      { error: "페르소나 분류 기준 업데이트에 실패했습니다" }, 
      { status: 500 }
    )
  }
}

// 페르소나 분류 기준 설정 삭제 (비활성화)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const user_id = searchParams.get('user_id')
    
    if (!id) {
      return NextResponse.json(
        { error: "설정 ID가 필요합니다" }, 
        { status: 400 }
      )
    }

    if (!user_id) {
      return NextResponse.json(
        { error: "사용자 인증이 필요합니다" }, 
        { status: 401 }
      )
    }

    // 기존 설정 조회하여 권한 확인
    const { data: existingConfig } = await supabaseAdmin
      .from('persona_criteria_configurations')
      .select('company_id, project_id')
      .eq('id', id)
      .single()

    if (!existingConfig) {
      return NextResponse.json(
        { error: "해당 설정을 찾을 수 없습니다" }, 
        { status: 404 }
      )
    }

    // 권한 확인
    const authCheck = await checkPermission(
      existingConfig.company_id, 
      user_id, 
      existingConfig.project_id
    )
    
    if (!authCheck.isAuthorized || !authCheck.canEdit) {
      return NextResponse.json(
        { error: authCheck.error || "페르소나 분류 기준 삭제 권한이 없습니다" }, 
        { status: 403 }
      )
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
      console.error("Supabase 업데이트 오류:", error)
      return NextResponse.json(
        { error: "페르소나 분류 기준 삭제에 실패했습니다" }, 
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "해당 ID의 설정을 찾을 수 없습니다" }, 
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "페르소나 분류 기준이 성공적으로 삭제되었습니다" })
  } catch (error) {
    console.error("DELETE API route error:", error)
    
    return NextResponse.json(
      { error: "페르소나 분류 기준 삭제에 실패했습니다" }, 
      { status: 500 }
    )
  }
} 