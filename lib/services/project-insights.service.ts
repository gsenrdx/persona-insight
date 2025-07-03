import { supabaseAdmin } from '@/lib/supabase-server'

interface InsightKeyword {
  name: string
  weight: number
}

interface InsightQuote {
  text: string
  persona: string
  interviewId: string
}

interface InsightData {
  title: string
  summary: string
  keywords: InsightKeyword[]
  quotes: InsightQuote[]
  mentionCount: number
  priority: number
}

interface YearInsights {
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
}

export class ProjectInsightsService {
  /**
   * Process interviews data to generate insights
   */
  static processInterviewsToInsights(interviews: any[]): InsightData[] {
    if (!interviews || interviews.length === 0) return []

    const painPointsMap = new Map<string, { count: number; quotes: InsightQuote[]; keywords: string[] }>()
    const needsMap = new Map<string, { count: number; quotes: InsightQuote[]; keywords: string[] }>()
    
    interviews.forEach(interview => {
      // Process pain points
      interview.primary_pain_points?.forEach((painPoint: any) => {
        const key = painPoint.description
        if (!painPointsMap.has(key)) {
          painPointsMap.set(key, { count: 0, quotes: [], keywords: [] })
        }
        const data = painPointsMap.get(key)!
        data.count++
        
        // Extract quotes
        if (painPoint.evidence && interview.cleaned_script) {
          painPoint.evidence.forEach((id: string) => {
            const script = interview.cleaned_script?.find((s: any) => s.id.includes(id))
            if (script && script.speaker === 'answer') {
              data.quotes.push({
                text: script.cleaned_sentence,
                persona: interview.title || 'Unknown',
                interviewId: interview.id
              })
            }
          })
        }
        
        // Extract keywords
        const words = painPoint.description.split(' ').filter((w: string) => w.length > 2).slice(0, 10)
        data.keywords.push(...words)
      })
      
      // Process needs
      interview.primary_needs?.forEach((need: any) => {
        const key = need.description
        if (!needsMap.has(key)) {
          needsMap.set(key, { count: 0, quotes: [], keywords: [] })
        }
        const data = needsMap.get(key)!
        data.count++
        
        // Extract quotes
        if (need.evidence && interview.cleaned_script) {
          need.evidence.forEach((id: string) => {
            const script = interview.cleaned_script?.find((s: any) => s.id.includes(id))
            if (script && script.speaker === 'answer') {
              data.quotes.push({
                text: script.cleaned_sentence,
                persona: interview.title || 'Unknown',
                interviewId: interview.id
              })
            }
          })
        }
        
        // Extract keywords
        const words = need.description.split(' ').filter((w: string) => w.length > 2).slice(0, 10)
        data.keywords.push(...words)
      })
    })
    
    // Convert to insights array
    const insights: InsightData[] = []
    
    // Process pain points
    Array.from(painPointsMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .forEach(([description, data]) => {
        const keywordCounts = data.keywords.reduce((acc, keyword) => {
          acc[keyword] = (acc[keyword] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        const topKeywords = Object.entries(keywordCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({
            name,
            weight: Math.round((count / data.keywords.length) * 100)
          }))
        
        insights.push({
          title: `문제점: ${description.slice(0, 50)}${description.length > 50 ? '...' : ''}`,
          summary: description,
          keywords: topKeywords,
          quotes: data.quotes.slice(0, 3),
          mentionCount: data.count,
          priority: data.count >= 3 ? 1 : data.count >= 2 ? 5 : 8
        })
      })
    
    // Process needs
    Array.from(needsMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .forEach(([description, data]) => {
        const keywordCounts = data.keywords.reduce((acc, keyword) => {
          acc[keyword] = (acc[keyword] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        const topKeywords = Object.entries(keywordCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({
            name,
            weight: Math.round((count / data.keywords.length) * 100)
          }))
        
        insights.push({
          title: `니즈: ${description.slice(0, 50)}${description.length > 50 ? '...' : ''}`,
          summary: description,
          keywords: topKeywords,
          quotes: data.quotes.slice(0, 3),
          mentionCount: data.count,
          priority: data.count >= 3 ? 2 : data.count >= 2 ? 6 : 9
        })
      })
    
    return insights.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Get insights for multiple years
   */
  static async getBatchInsights(
    projectId: string,
    years: string[]
  ): Promise<{
    results: Record<string, YearInsights>
    summary: {
      totalYears: number
      totalInterviews: number
      projectId: string
    }
  }> {
    // Calculate date range
    const minYear = Math.min(...years.map(y => parseInt(y)))
    const maxYear = Math.max(...years.map(y => parseInt(y)))

    // Single query for all years
    const { data: allInterviews, error } = await supabaseAdmin
      .from('interviews')
      .select('*')
      .eq('project_id', projectId)
      .gte('interview_date', `${minYear}-01-01`)
      .lte('interview_date', `${maxYear}-12-31`)
      .order('interview_date', { ascending: false })

    if (error) {
      throw new Error(`인터뷰 테이블 조회 실패: ${error.message}`)
    }

    console.log(`Found ${allInterviews?.length || 0} interviews for project ${projectId}`)
    
    // Group by year and generate insights
    const results: Record<string, YearInsights> = {}

    for (const year of years) {
      // Filter interviews for this year
      const yearInterviews = allInterviews?.filter(interview => {
        const interviewYear = new Date(interview.interview_date).getFullYear()
        return interviewYear === parseInt(year)
      }) || []

      console.log(`Year ${year}: ${yearInterviews.length} interviews`)
      
      // Transform to insights
      const insights = this.processInterviewsToInsights(yearInterviews)

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
            i.primary_pain_points?.length > 0 || i.primary_needs?.length > 0
          ).length
        }
      }
    }

    return {
      results,
      summary: {
        totalYears: years.length,
        totalInterviews: allInterviews?.length || 0,
        projectId
      }
    }
  }
}