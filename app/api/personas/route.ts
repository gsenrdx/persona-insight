import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getAuthenticatedUserProfile } from "@/lib/utils/auth-cache"

// 새로운 페르소나 구조에 맞게 데이터 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get('company_id')
    const project_id = searchParams.get('project_id')
    const raw = searchParams.get('raw') === 'true' // 원본 persona_combinations 데이터 반환용
    
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

    // raw=true인 경우 원본 persona_combinations 데이터와 type 정보 반환
    if (raw) {
      const combinationsWithTypes = []
      
      if (combinations && combinations.length > 0) {
        // 모든 type_ids 수집
        const allTypeIds = [...new Set(
          combinations
            .filter(c => Array.isArray(c.type_ids) && c.type_ids.length > 0)
            .flatMap(c => c.type_ids)
        )]
        
        // 타입 정보 배치 조회
        let typesMap = new Map()
        if (allTypeIds.length > 0) {
          const { data: typeData } = await supabaseAdmin
            .from('persona_classification_types')
            .select(`
              id,
              name,
              description,
              classification_id,
              persona_classifications!inner (
                id,
                name,
                description
              )
            `)
            .in('id', allTypeIds)
          
          if (typeData) {
            typeData.forEach(type => {
              typesMap.set(type.id, type)
            })
          }
        }
        
        // persona_combinations 데이터에 type 정보 포함
        combinationsWithTypes.push(...combinations.map(combination => {
          const typeIds = Array.isArray(combination.type_ids) ? combination.type_ids : []
          const types = typeIds.map(id => typesMap.get(id)).filter(Boolean)
          
          return {
            id: combination.id,
            persona_code: combination.persona_code,
            type_ids: combination.type_ids,
            title: combination.title,
            description: combination.description,
            thumbnail: combination.thumbnail,
            created_at: combination.created_at,
            persona_classification_types: types
          }
        }))
      }
      
      return NextResponse.json({
        data: combinationsWithTypes,
        success: true
      })
    }

    // 프로덕션 수준 배치 조회로 N+1 문제 해결
    let personasWithDetails = []
    
    if (combinations && combinations.length > 0) {
      // 1. 모든 type_ids 수집
      const allTypeIds = [...new Set(
        combinations
          .filter(c => Array.isArray(c.type_ids) && c.type_ids.length > 0)
          .flatMap(c => c.type_ids)
      )]
      
      // 2. 배치로 모든 타입 정보 조회 (한 번의 쿼리)
      let typesMap = new Map()
      if (allTypeIds.length > 0) {
        const { data: typeData } = await supabaseAdmin
          .from('persona_classification_types')
          .select(`
            id,
            name,
            description,
            classification_id,
            persona_classifications!inner (
              id,
              name,
              description
            )
          `)
          .in('id', allTypeIds)
        
        if (typeData) {
          typeData.forEach(type => {
            typesMap.set(type.id, type)
          })
        }
      }
      
      // 3. 배치로 모든 인터뷰 수 조회 (한 번의 쿼리)
      const combinationIds = combinations.map(c => c.id)
      const { data: interviewCounts } = await supabaseAdmin
        .from('interviews')
        .select('persona_combination_id')
        .in('persona_combination_id', combinationIds)
        .eq('company_id', targetCompanyId)
        .is('deleted_at', null)
        .not('persona_combination_id', 'is', null)
      
      // 인터뷰 수 집계
      const countMap = new Map()
      if (interviewCounts) {
        interviewCounts.forEach(interview => {
          const id = interview.persona_combination_id
          if (id) {
            countMap.set(id, (countMap.get(id) || 0) + 1)
          }
        })
      }
      
      // 4. 메모리 기반 조합으로 빠른 변환
      personasWithDetails = combinations.map(combination => {
        const typeIds = Array.isArray(combination.type_ids) ? combination.type_ids : []
        
        // 메모리 기반 타입 정보 조회 (O(1))
        const types = typeIds.map(id => typesMap.get(id)).filter(Boolean)
        
        // 메모리 기반 인터뷰 수 조회 (O(1))
        const interviewCount = countMap.get(combination.id) || 0
        
        // 타입 정보를 기반으로 제목과 설명 생성
        const typeNames = types.map(t => t.name).filter(Boolean)
        const classificationNames = types.map(t => t.persona_classifications?.name).filter(Boolean)
        
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
          interview_count: interviewCount,
          types: types.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            classification_name: t.persona_classifications?.name || ""
          }))
        }
      })
    }

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