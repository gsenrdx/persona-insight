import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

interface KeywordFrequency {
  [key: string]: number
}

interface InsightData {
  title: string
  summary: string
  keywords: Array<{ name: string; weight: number }>
  quotes: Array<{ text: string; persona: string }>
  mentionCount: number
  priority: number
}

// 기존 interview_detail 데이터를 대시보드 인사이트로 변환
function transformInterviewDataToInsights(interviews: any[]): InsightData[] {
  
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
    
    details.forEach((detail: any, detailIdx: number) => {
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
        } else {
        }
      }
      
      // 페인포인트 추가 (배열 검증)
      if (detail.painpoint) {
        if (Array.isArray(detail.painpoint)) {
          insight.painpoints.push(...detail.painpoint)
        } else {
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
        } else {
        }
      }
    })
  })
  

  // 인사이트 최종 처리
  const insights: InsightData[] = []
  
     insightMap.forEach((insight: any, topicName) => {
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

function generateEnhancedSummary(
  needs: string[], 
  painpoints: string[], 
  keywords: Array<{ name: string; weight: number }>
): string {
  // 가장 빈도가 높은 니즈나 페인포인트를 기반으로 요약 생성
  const topNeed = needs[0]
  const topPainpoint = painpoints[0]
  const topKeyword = keywords[0]?.name
  
  if (topNeed && topNeed.length > 10) {
    return `${topNeed}${topKeyword ? ` 특히 ${topKeyword}에 대한 요구가 높습니다.` : ''}`
  } else if (topPainpoint && topPainpoint.length > 10) {
    return `${topPainpoint}${topKeyword ? ` ${topKeyword} 관련 개선이 필요합니다.` : ''}`
  } else if (topKeyword) {
    return `${topKeyword}에 대한 고객들의 관심과 요구사항이 확인되었습니다.`
  }
  
  return "고객 인터뷰에서 확인된 주요 인사이트입니다."
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get('company_id')
    const project_id = searchParams.get('project_id')
    const year = searchParams.get('year') || new Date().getFullYear().toString()

    // 입력 검증
    if (!company_id) {
      return NextResponse.json(
        { error: "company_id가 필요합니다", details: "회사 ID를 제공해주세요." }, 
        { status: 400 }
      )
    }

    if (!/^\d{4}$/.test(year)) {
      return NextResponse.json(
        { error: "올바르지 않은 연도 형식입니다", details: "YYYY 형식의 연도를 입력해주세요." }, 
        { status: 400 }
      )
    }


    // 인터뷰 데이터 조회 (interview_detail은 jsonb 컬럼이므로 함께 조회)
    let query = supabase
      .from('interviewees')
      .select('*')
      .eq('company_id', company_id)
      .gte('session_date', `${year}-01-01`)
      .lte('session_date', `${year}-12-31`)
      .order('session_date', { ascending: false })

    // 프로젝트 필터링 추가
    if (project_id) {
      query = query.eq('project_id', project_id)
    }

    const { data: interviews, error: interviewError } = await query

    if (interviewError) {
      return NextResponse.json(
        { 
          error: "인터뷰 테이블 조회 실패", 
          details: `오류 상세: ${interviewError.message}`,
          year: parseInt(year),
          intervieweeCount: 0,
          insights: []
        }, 
        { status: 500 }
      )
    }


    // 인터뷰가 없으면 빈 결과 반환
    if (!interviews || interviews.length === 0) {
      // 빈 결과도 캐시 (5분)
      const headers = {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
      
      return NextResponse.json({
        year: parseInt(year),
        intervieweeCount: 0,
        insights: [],
        metadata: {
          generatedAt: new Date().toISOString(),
          totalTopics: 0,
          totalQuotes: 0,
          message: "해당 연도에 인터뷰 데이터가 없습니다."
        }
      }, { headers })
    }

    // interview_detail이 이미 포함되어 있으므로 바로 인사이트 변환
    
    // 샘플 데이터 로그
    if (interviews.length > 0 && interviews[0].interview_detail) {
    }

    // 인사이트 변환 (안전한 호출)
    const insights = transformInterviewDataToInsights(interviews || [])


    // 성능 최적화: 캐시 헤더 추가 (10분간 캐시)
    const headers = {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800'
    }

    return NextResponse.json({
      year: parseInt(year),
      intervieweeCount: interviews.length,
      insights,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalTopics: insights.length,
        totalQuotes: insights.reduce((sum: number, insight) => sum + insight.quotes.length, 0),
        rawInterviewCount: interviews.length,
        detailedInterviewCount: interviews.filter(i => i.interview_detail && Array.isArray(i.interview_detail) && i.interview_detail.length > 0).length
      }
    }, { headers })

  } catch (error) {
    return NextResponse.json(
      { 
        error: "서버 내부 오류", 
        details: `예외 상세: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        year: parseInt(new URL(request.url).searchParams.get('year') || new Date().getFullYear().toString()),
        intervieweeCount: 0,
        insights: []
      }, 
      { status: 500 }
    )
  }
} 