import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { 
  KeywordFrequency, 
  InsightData, 
  InterviewDetail, 
  IntervieweeWithDetail,
  InsightMapData,
  InsightResponse,
  BatchInsightRequest,
  BatchInsightResponse
} from "@/types/insights"

// Transform interview data to insights (reusing the existing function)
function transformInterviewDataToInsights(interviews: IntervieweeWithDetail[]): InsightData[] {
  
  try {
    if (!interviews || !Array.isArray(interviews) || interviews.length === 0) {
      return []
    }

    const insightMap = new Map()
    const allKeywords: KeywordFrequency = {}
    let totalDetails = 0
  
  interviews.forEach((interview, idx) => {
    // interview_detail이 배열인지 확인하고 안전하게 처리
    let details = interview.interview_detail || []
    
    // interview_detail이 배열이 아닌 경우 처리
    if (!Array.isArray(details)) {
      
      if (typeof details === 'string') {
        try {
          // 마크다운 코드 블록과 불필요한 문자 제거
          let cleanedDetails = details.trim()
          
          // ```로 시작하고 끝나는 마크다운 제거
          cleanedDetails = cleanedDetails.replace(/^```[\s\S]*?\n/, '').replace(/\n```[\s\S]*$/, '')
          
          // 첫 번째 [ 찾기
          let jsonStartIndex = cleanedDetails.indexOf('[')
          if (jsonStartIndex === -1) {
            details = []
          } else {
            // 매칭되는 ] 찾기 (중첩된 배열 고려)
            let bracketCount = 0
            let jsonEndIndex = -1
            
            for (let i = jsonStartIndex; i < cleanedDetails.length; i++) {
              if (cleanedDetails[i] === '[') {
                bracketCount++
              } else if (cleanedDetails[i] === ']') {
                bracketCount--
                if (bracketCount === 0) {
                  jsonEndIndex = i
                  break
                }
              }
            }
            
            if (jsonEndIndex === -1) {
              details = []
            } else {
              // 첫 번째 완전한 JSON 배열만 추출
              cleanedDetails = cleanedDetails.substring(jsonStartIndex, jsonEndIndex + 1)
              
              // JSON 파싱
              const parsedDetails = JSON.parse(cleanedDetails)
              if (Array.isArray(parsedDetails)) {
                details = parsedDetails
              } else {
                details = []
              }
            }
          }
        } catch (error) {
          details = []
        }
      } else {
        details = []
      }
    }
    
    if (details.length > 0) {
    }
    
    totalDetails += details.length
    
    // 실제 고객 정보 생성 (fake_name 우선, 없으면 기존 방식)
    const actualPersona = interview.interviewee_fake_name || 
      `${interview.user_type || '고객'}${idx + 1}${interview.user_description ? ` (${interview.user_description.slice(0, 20)}...)` : ''}`
    
    details.forEach((detail) => {
      const topicName = detail.topic_name?.trim()
      
      if (!topicName) return
      
      if (!insightMap.has(topicName)) {
        insightMap.set(topicName, {
          title: topicName,
          summary: '',
          keywords: new Map(),
          quotes: [],
          mentionCount: 0,
          needs: [],
          painpoints: []
        })
      }
      
      const insight = insightMap.get(topicName)
      insight.mentionCount += 1
      
      // 니즈 추가 (배열 검증)
      if (detail.need) {
        if (Array.isArray(detail.need)) {
          insight.needs.push(...detail.need)
        }
      }
      
      // 페인포인트 추가 (배열 검증)
      if (detail.painpoint) {
        if (Array.isArray(detail.painpoint)) {
          insight.painpoints.push(...detail.painpoint)
        }
      }
      
      // 키워드 수집 (need_keyword, painpoint_keyword, keyword_cluster 통합) - 배열 검증
      const allDetailKeywords = [
        ...(Array.isArray(detail.need_keyword) ? detail.need_keyword : []),
        ...(Array.isArray(detail.painpoint_keyword) ? detail.painpoint_keyword : []),
        ...(Array.isArray(detail.keyword_cluster) ? detail.keyword_cluster : [])
      ]
      
      allDetailKeywords.forEach(keyword => {
        if (keyword && typeof keyword === 'string') {
          const normalizedKeyword = keyword.trim()
          if (normalizedKeyword) {
            if (!insight.keywords.has(normalizedKeyword)) {
              insight.keywords.set(normalizedKeyword, 0)
            }
            insight.keywords.set(normalizedKeyword, insight.keywords.get(normalizedKeyword) + 1)
            allKeywords[normalizedKeyword] = (allKeywords[normalizedKeyword] || 0) + 1
          }
        }
      })
      
      // 인용문 추가 (실제 고객 정보 사용) - 배열 검증
      if (detail.insight_quote) {
        if (Array.isArray(detail.insight_quote)) {
          detail.insight_quote.forEach((quote: string) => {
            if (quote && typeof quote === 'string') {
              insight.quotes.push({
                text: quote.trim(),
                persona: actualPersona // 실제 고객 정보 사용
              })
            }
          })
        }
      }
    })
  })
  
  // 인사이트 최종 처리
  const insights: InsightData[] = []
  
     insightMap.forEach((insight, topicName) => {
     // 키워드 가중치 정규화 및 상위 키워드 선택
     const keywordEntries = Array.from(insight.keywords.entries()) as [string, number][]
     const maxWeight = keywordEntries.length > 0 ? Math.max(...keywordEntries.map(([_, count]) => count)) : 1
     
     const normalizedKeywords = keywordEntries
       .map(([keyword, count]) => ({
         name: keyword,
         weight: maxWeight > 0 ? Math.round((count / maxWeight) * 100) : 0
       }))
       .sort((a, b) => b.weight - a.weight)
       .slice(0, 6) // 상위 6개만 선택
     
     // 요약 생성 (니즈 기반)
     const mainNeed = insight.needs[0] || `${topicName} 관련 개선 필요`
     const topKeyword = normalizedKeywords[0]?.name || "개선"
    
    const summary = `${mainNeed} 특히 ${topKeyword}에 대한 요구가 높습니다.`
    
    // 우선순위 계산 (언급 횟수, 키워드 다양성, 인용문 수를 종합)
    const priority = insight.mentionCount * 3 + normalizedKeywords.length + insight.quotes.length
    
    insights.push({
      title: topicName,
      summary,
      keywords: normalizedKeywords,
      quotes: insight.quotes,
      mentionCount: insight.mentionCount,
      priority
    })
  })
  
    // 우선순위순 정렬
    insights.sort((a, b) => b.priority - a.priority)
    
    return insights
    
  } catch (error) {
    return []
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { company_id, project_id, years } = body

    // 입력 검증
    if (!company_id) {
      return NextResponse.json(
        { error: "company_id가 필요합니다", details: "회사 ID를 제공해주세요." }, 
        { status: 400 }
      )
    }

    if (!years || !Array.isArray(years) || years.length === 0) {
      return NextResponse.json(
        { error: "years 배열이 필요합니다", details: "연도 배열을 제공해주세요." }, 
        { status: 400 }
      )
    }

    // 연도 형식 검증
    const invalidYears = years.filter(year => !/^\d{4}$/.test(year.toString()))
    if (invalidYears.length > 0) {
      return NextResponse.json(
        { error: "올바르지 않은 연도 형식입니다", details: `잘못된 연도: ${invalidYears.join(', ')}` }, 
        { status: 400 }
      )
    }

    // 모든 연도의 최소/최대 날짜 계산
    const minYear = Math.min(...years.map(y => parseInt(y)))
    const maxYear = Math.max(...years.map(y => parseInt(y)))

    // 단일 쿼리로 모든 연도의 데이터 조회
    let query = supabase
      .from('interviews')
      .select(`
        *,
        persona_combination:persona_combinations(
          id,
          persona_code,
          type_ids,
          title,
          description
        )
      `)
      .eq('company_id', company_id)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .gte('interview_date', `${minYear}-01-01`)
      .lte('interview_date', `${maxYear}-12-31`)
      .order('interview_date', { ascending: false })

    // 프로젝트 필터링 추가
    if (project_id) {
      query = query.eq('project_id', project_id)
    }

    const { data: allInterviews, error: interviewError } = await query

    if (interviewError) {
      return NextResponse.json(
        { 
          error: "인터뷰 테이블 조회 실패", 
          details: `오류 상세: ${interviewError.message}`,
          results: {}
        }, 
        { status: 500 }
      )
    }

    // 페르소나 조합 타입 정보를 별도로 가져오기
    let typeDataMap = new Map()
    
    if (allInterviews && allInterviews.length > 0) {
      // 모든 type_ids 수집
      const allTypeIds = [...new Set(
        allInterviews
          .filter(i => i.persona_combination?.type_ids)
          .flatMap(i => i.persona_combination.type_ids)
      )]
      
      if (allTypeIds.length > 0) {
        // 타입 정보 조회
        const { data: types } = await supabase
          .from('persona_classification_types')
          .select(`
            id,
            name,
            description,
            persona_classifications(
              name,
              description
            )
          `)
          .in('id', allTypeIds)
        
        // ID로 매핑
        if (types) {
          types.forEach(type => {
            typeDataMap.set(type.id, type)
          })
        }
      }
    }

    // 인터뷰 데이터에 타입 정보 추가
    allInterviews?.forEach(interview => {
      if (interview.persona_combination && interview.persona_combination.type_ids) {
        interview.persona_combination.persona_classification_types = interview.persona_combination.type_ids
          .map(typeId => typeDataMap.get(typeId))
          .filter(Boolean)
      }
    })

    // 연도별로 데이터 그룹화 및 인사이트 생성
    const results: Record<string, any> = {}

    for (const year of years) {
      // 해당 연도의 인터뷰만 필터링
      const yearInterviews = allInterviews?.filter(interview => {
        const interviewYear = new Date(interview.interview_date).getFullYear()
        return interviewYear === parseInt(year)
      }) || []

      // 해당 연도의 인사이트 변환 - 새로운 인터뷰 구조 사용
      const insights = yearInterviews.length > 0 ? (() => {
        // key_takeaways 기반 인사이트 생성
        const insightMap = new Map<string, InsightData>()
        
        yearInterviews.forEach((interview, idx) => {
          if (!interview.key_takeaways || !Array.isArray(interview.key_takeaways)) return
          
          interview.key_takeaways.forEach(takeaway => {
            if (!insightMap.has(takeaway)) {
              insightMap.set(takeaway, {
                title: takeaway,
                summary: takeaway,
                keywords: [],
                quotes: [],
                mentionCount: 0,
                priority: 0
              })
            }
            
            const insight = insightMap.get(takeaway)!
            insight.mentionCount += 1
            insight.priority = insight.mentionCount
          })
        })
        
        return Array.from(insightMap.values()).sort((a, b) => b.priority - a.priority)
      })() : []

      results[year] = {
        year: parseInt(year),
        intervieweeCount: yearInterviews.length,
        insights,
        metadata: {
          generatedAt: new Date().toISOString(),
          totalTopics: insights.length,
          totalQuotes: insights.reduce((sum: number, insight) => sum + insight.quotes.length, 0),
          rawInterviewCount: yearInterviews.length,
          completedInterviewCount: yearInterviews.filter(i => i.status === 'completed').length
        }
      }
    }

    // 성능 최적화: 캐시 헤더 추가 (10분간 캐시)
    const headers = {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800'
    }

    return NextResponse.json({
      results,
      summary: {
        totalYears: years.length,
        totalInterviews: allInterviews?.length || 0,
        companyId: company_id,
        projectId: project_id
      }
    }, { headers })

  } catch (error) {
    return NextResponse.json(
      { 
        error: "서버 내부 오류", 
        details: `예외 상세: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        results: {}
      }, 
      { status: 500 }
    )
  }
}