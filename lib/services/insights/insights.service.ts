import { supabase } from '@/lib/supabase'
import { KeywordFrequency, InsightData, IntervieweeWithDetail, InterviewDetail } from './types'

export class InsightsService {
  /**
   * Transform interview data to dashboard insights
   */
  static transformInterviewDataToInsights(interviews: IntervieweeWithDetail[]): InsightData[] {
    try {
      if (!interviews || !Array.isArray(interviews) || interviews.length === 0) {
        return []
      }

      const insightMap = new Map()
      const allKeywords: KeywordFrequency = {}
      let totalDetails = 0

      interviews.forEach((interview, idx) => {
        // Process interview details safely
        let details = this.parseInterviewDetails(interview.interview_detail)
        totalDetails += details.length

        // Generate persona name
        const actualPersona = interview.interviewee_fake_name || 
          `${interview.user_type || '고객'}${idx + 1}${interview.user_description ? ` (${interview.user_description.slice(0, 20)}...)` : ''}`

        details.forEach((detail) => {
          const topicName = detail.topic_name?.trim()
          if (!topicName) return

          // Initialize or get insight for topic
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

          // Process needs
          if (detail.need && Array.isArray(detail.need)) {
            insight.needs.push(...detail.need)
          }

          // Process pain points
          if (detail.painpoint && Array.isArray(detail.painpoint)) {
            insight.painpoints.push(...detail.painpoint)
          }

          // Collect keywords
          this.collectKeywords(detail, insight.keywords, allKeywords)

          // Add quotes
          if (detail.insight_quote && Array.isArray(detail.insight_quote)) {
            detail.insight_quote.forEach((quote: string) => {
              if (quote && typeof quote === 'string') {
                insight.quotes.push({
                  text: quote.trim(),
                  persona: actualPersona
                })
              }
            })
          }
        })
      })

      // Process final insights
      return this.processInsights(insightMap)

    } catch (error) {
      return []
    }
  }

  /**
   * Parse interview details from various formats
   */
  private static parseInterviewDetails(details: InterviewDetail[] | string | undefined): InterviewDetail[] {
    if (!details) return []
    
    // Already an array
    if (Array.isArray(details)) return details

    // String format - try to parse
    if (typeof details === 'string') {
      try {
        let cleanedDetails = details.trim()
        
        // Remove markdown code blocks
        cleanedDetails = cleanedDetails.replace(/^```[\s\S]*?\n/, '').replace(/\n```[\s\S]*$/, '')
        
        // Find JSON array boundaries
        let jsonStartIndex = cleanedDetails.indexOf('[')
        if (jsonStartIndex === -1) return []

        // Find matching closing bracket
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
        
        if (jsonEndIndex === -1) return []

        // Extract and parse JSON
        cleanedDetails = cleanedDetails.substring(jsonStartIndex, jsonEndIndex + 1)
        const parsedDetails = JSON.parse(cleanedDetails)
        
        return Array.isArray(parsedDetails) ? parsedDetails : []
      } catch (error) {
        return []
      }
    }

    return []
  }

  /**
   * Collect keywords from detail fields
   */
  private static collectKeywords(
    detail: InterviewDetail, 
    insightKeywords: Map<string, number>, 
    allKeywords: KeywordFrequency
  ): void {
    const allDetailKeywords = [
      ...(Array.isArray(detail.need_keyword) ? detail.need_keyword : []),
      ...(Array.isArray(detail.painpoint_keyword) ? detail.painpoint_keyword : []),
      ...(Array.isArray(detail.keyword_cluster) ? detail.keyword_cluster : [])
    ]
    
    allDetailKeywords.forEach(keyword => {
      if (keyword && typeof keyword === 'string') {
        const normalizedKeyword = keyword.trim()
        if (normalizedKeyword) {
          if (!insightKeywords.has(normalizedKeyword)) {
            insightKeywords.set(normalizedKeyword, 0)
          }
          insightKeywords.set(normalizedKeyword, insightKeywords.get(normalizedKeyword) + 1)
          allKeywords[normalizedKeyword] = (allKeywords[normalizedKeyword] || 0) + 1
        }
      }
    })
  }

  /**
   * Process insight map into final insights array
   */
  private static processInsights(insightMap: Map<string, any>): InsightData[] {
    const insights: InsightData[] = []
    
    insightMap.forEach((insight, topicName) => {
      // Normalize keywords
      const keywordEntries = Array.from(insight.keywords.entries()) as [string, number][]
      const maxWeight = keywordEntries.length > 0 ? Math.max(...keywordEntries.map(([_, count]) => count)) : 1
      
      const normalizedKeywords = keywordEntries
        .map(([keyword, count]) => ({
          name: keyword,
          weight: maxWeight > 0 ? Math.round((count / maxWeight) * 100) : 0
        }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 6) // Top 6 keywords
      
      // Generate summary
      const mainNeed = insight.needs[0] || `${topicName} 관련 개선 필요`
      const topKeyword = normalizedKeywords[0]?.name || "개선"
      const summary = `${mainNeed} 특히 ${topKeyword}에 대한 요구가 높습니다.`
      
      // Calculate priority
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
    
    // Sort by priority
    return insights.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Get insights for a specific year
   */
  static async getInsights(
    companyId: string, 
    year: string, 
    projectId?: string
  ): Promise<{
    year: number
    intervieweeCount: number
    insights: InsightData[]
    metadata: {
      generatedAt: string
      totalTopics: number
      totalQuotes: number
      rawInterviewCount: number
      detailedInterviewCount: number
      message?: string
    }
  }> {
    // Query interviews
    let query = supabase
      .from('interviewees')
      .select('*')
      .eq('company_id', companyId)
      .gte('session_date', `${year}-01-01`)
      .lte('session_date', `${year}-12-31`)
      .order('session_date', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: interviews, error } = await query

    if (error) {
      throw new Error(`인터뷰 테이블 조회 실패: ${error.message}`)
    }

    // Return empty result if no interviews
    if (!interviews || interviews.length === 0) {
      return {
        year: parseInt(year),
        intervieweeCount: 0,
        insights: [],
        metadata: {
          generatedAt: new Date().toISOString(),
          totalTopics: 0,
          totalQuotes: 0,
          rawInterviewCount: 0,
          detailedInterviewCount: 0,
          message: "해당 연도에 인터뷰 데이터가 없습니다."
        }
      }
    }

    // Transform to insights
    const insights = this.transformInterviewDataToInsights(interviews)

    return {
      year: parseInt(year),
      intervieweeCount: interviews.length,
      insights,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalTopics: insights.length,
        totalQuotes: insights.reduce((sum, insight) => sum + insight.quotes.length, 0),
        rawInterviewCount: interviews.length,
        detailedInterviewCount: interviews.filter(i => 
          i.interview_detail && 
          Array.isArray(i.interview_detail) && 
          i.interview_detail.length > 0
        ).length
      }
    }
  }

  /**
   * Get insights for multiple years
   */
  static async getBatchInsights(
    companyId: string,
    years: string[],
    projectId?: string
  ): Promise<{
    results: Record<string, any>
    summary: {
      totalYears: number
      totalInterviews: number
      companyId: string
      projectId?: string
    }
  }> {
    // Calculate date range
    const minYear = Math.min(...years.map(y => parseInt(y)))
    const maxYear = Math.max(...years.map(y => parseInt(y)))

    // Single query for all years
    let query = supabase
      .from('interviewees')
      .select('*, session_date')
      .eq('company_id', companyId)
      .gte('session_date', `${minYear}-01-01`)
      .lte('session_date', `${maxYear}-12-31`)
      .order('session_date', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: allInterviews, error } = await query

    if (error) {
      throw new Error(`인터뷰 테이블 조회 실패: ${error.message}`)
    }

    // Group by year and generate insights
    const results: Record<string, any> = {}

    for (const year of years) {
      // Filter interviews for this year
      const yearInterviews = allInterviews?.filter(interview => {
        const interviewYear = new Date(interview.session_date).getFullYear()
        return interviewYear === parseInt(year)
      }) || []

      // Transform to insights
      const insights = this.transformInterviewDataToInsights(yearInterviews)

      results[year] = {
        year: parseInt(year),
        intervieweeCount: yearInterviews.length,
        insights,
        metadata: {
          generatedAt: new Date().toISOString(),
          totalTopics: insights.length,
          totalQuotes: insights.reduce((sum, insight) => sum + insight.quotes.length, 0),
          rawInterviewCount: yearInterviews.length,
          detailedInterviewCount: yearInterviews.filter(i => 
            i.interview_detail && 
            Array.isArray(i.interview_detail) && 
            i.interview_detail.length > 0
          ).length
        }
      }
    }

    return {
      results,
      summary: {
        totalYears: years.length,
        totalInterviews: allInterviews?.length || 0,
        companyId,
        projectId
      }
    }
  }
}