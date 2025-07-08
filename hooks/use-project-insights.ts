import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'

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
  const { session } = useAuth()

  return useQuery<ProjectInsightsResponse>({
    queryKey: ['project-insights', projectId],
    queryFn: async () => {
      if (!projectId || !session?.access_token) {
        throw new Error('Project ID and authentication required')
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
    enabled: !!projectId && !!session?.access_token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })
}

// Re-export types
export type { InsightData, YearInsights, ProjectInsightsResponse }