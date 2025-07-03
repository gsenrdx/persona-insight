import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'

interface InsightKeyword {
  name: string
  weight: number
}

interface InsightQuote {
  text: string
  persona: string
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

interface ProjectInsightsResponse {
  years: string[]
  insights: Record<string, YearInsights>
  summary: {
    totalYears: number
    totalInterviews: number
    projectId: string
  }
}

export function useProjectInsights(projectId: string | null) {
  const { user } = useAuth()

  return useQuery<ProjectInsightsResponse>({
    queryKey: ['project-insights', projectId],
    queryFn: async () => {
      if (!projectId || !user) {
        throw new Error('Project ID and authentication required')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const response = await fetch(`/api/projects/${projectId}/insights`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch project insights')
      }

      return response.json()
    },
    enabled: !!projectId && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })
}

// Re-export types
export type { InsightData, YearInsights, ProjectInsightsResponse }