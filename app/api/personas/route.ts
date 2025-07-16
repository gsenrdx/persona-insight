import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getAuthenticatedUserProfile } from "@/lib/utils/auth-cache"

// 새로운 페르소나 구조에 맞게 데이터 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get('company_id')
    const project_id = searchParams.get('project_id')
    
    // 인증 처리 - 두 가지 방법 지원 (인터뷰 API와 동일)
    let targetCompanyId: string
    const authHeader = request.headers.get('authorization')
    
    if (authHeader) {
      // Authorization 헤더가 있으면 사용
      const userProfile = await getAuthenticatedUserProfile(authHeader, supabaseAdmin)
      targetCompanyId = company_id || userProfile.companyId
    } else if (company_id) {
      // URL 파라미터로 company_id가 전달되면 사용 (서버 컴포넌트 지원)
      targetCompanyId = company_id
    } else {
      return NextResponse.json({
        error: "인증이 필요합니다",
        success: false
      }, { status: 401 })
    }
    
    if (!targetCompanyId) {
      return NextResponse.json({
        error: "company_id가 필요합니다",
        success: false
      }, { status: 400 })
    }

    // 페르소나 조합 조회 (title, description 포함)
    const { data: combinations, error } = await supabaseAdmin
      .from('persona_combinations')
      .select(`
        id,
        persona_code,
        type_ids,
        thumbnail,
        title,
        description,
        created_at
      `)
      .eq('company_id', targetCompanyId)
      .order('persona_code', { ascending: true })

    if (error) {
      return NextResponse.json({
        error: "페르소나 데이터를 가져오는데 실패했습니다",
        success: false
      }, { status: 500 })
    }

    // 각 조합에 대한 상세 정보 조회
    const personasWithDetails = await Promise.all(
      (combinations || []).map(async (combination) => {
        // type_ids가 배열인지 확인하고 타입 정보 조회
        const typeIds = Array.isArray(combination.type_ids) ? combination.type_ids : []
        
        let types = []
        if (typeIds.length > 0) {
          const { data: typeData, error: typeError } = await supabaseAdmin
            .from('persona_classification_types')
            .select(`
              id,
              name,
              description,
              classification:persona_classifications!inner (
                id,
                name,
                description
              )
            `)
            .in('id', typeIds)
          
          types = typeData || []
        }

        // 인터뷰 수 조회
        const { count: interviewCount } = await supabaseAdmin
          .from('interviews')
          .select('id', { count: 'exact', head: true })
          .eq('persona_combination_id', combination.id)

        // 타입 정보를 기반으로 제목과 설명 생성
        const typeNames = types.map((t: any) => t.name).filter(Boolean)
        const classificationNames = types.map((t: any) => t.classification?.name).filter(Boolean)
        
        // combination.title이 있으면 사용하고, 없으면 타입 기반으로 생성
        const title = combination.title || 
          (typeNames.length > 0 
            ? `${combination.persona_code}: ${typeNames.join(' + ')}`
            : `페르소나 ${combination.persona_code}`)
        
        const description = combination.description || 
          (classificationNames.length > 0 
            ? classificationNames.join(', ')
            : "")
        
        const summary = typeNames.length > 0 
          ? typeNames.join(' + ')
          : ""
        
        return {
          id: combination.id,
          persona_type: combination.persona_code,
          persona_title: title,
          persona_description: description,
          persona_summary: summary,
          thumbnail: combination.thumbnail,
          persona_style: typeNames.join(', '),
          painpoints: "페르소나별 인터뷰 데이터를 기반으로 분석이 필요합니다",
          needs: "페르소나별 인터뷰 데이터를 기반으로 분석이 필요합니다",
          insight: `${title} 유형의 고객입니다`,
          insight_quote: "",
          created_at: combination.created_at,
          project_id: null,
          company_id: targetCompanyId,
          interview_count: interviewCount || 0,
          types: types.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            classification_name: t.classification?.name || ""
          }))
        }
      })
    )

    // 프로젝트별 필터링 (인터뷰가 있는 페르소나만 표시)
    let filteredPersonas = personasWithDetails
    if (project_id) {
      // 프로젝트에 속한 인터뷰가 있는 페르소나 조합 ID 조회
      const { data: projectInterviews } = await supabaseAdmin
        .from('interviews')
        .select('persona_combination_id')
        .eq('project_id', project_id)
        .not('persona_combination_id', 'is', null)

      const combinationIds = [...new Set(projectInterviews?.map(i => i.persona_combination_id) || [])]
      filteredPersonas = personasWithDetails.filter(p => combinationIds.includes(p.id))
    }

    return NextResponse.json({
      data: filteredPersonas,
      success: true
    })
  } catch (error) {
    return NextResponse.json({
      error: "페르소나 데이터를 가져오는데 실패했습니다",
      success: false
    }, { status: 500 })
  }
}

// 페르소나 조합은 자동으로 생성되므로 POST는 필요하지 않음
export async function POST(request: Request) {
  return NextResponse.json({
    error: "페르소나는 회사별 분류 설정에 따라 자동으로 생성됩니다",
    success: false
  }, { status: 400 })
}

// 페르소나 조합 자체는 수정할 수 없음
export async function PUT(request: Request) {
  return NextResponse.json({
    error: "페르소나 조합은 수정할 수 없습니다",
    success: false
  }, { status: 400 })
}

// 페르소나 조합은 삭제할 수 없음
export async function DELETE(request: Request) {
  return NextResponse.json({
    error: "페르소나 조합은 삭제할 수 없습니다",
    success: false
  }, { status: 400 })
}