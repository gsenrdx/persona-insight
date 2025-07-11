import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { useInterviews } from '@/hooks/use-interviews'

export interface ProjectSummary {
  id: string
  project_id: string
  summary_text: string
  created_at: string
  updated_at: string
  interview_count_at_creation: number
  last_interview_id: string | null
}

export function useProjectSummary(projectId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isGenerating, setIsGenerating] = useState(false)

  // useInterviews 훅을 사용해서 실시간 데이터 동기화
  const { interviews } = useInterviews({
    projectId,
    enabled: !!user && !!projectId
  })

  // 프로젝트 요약 조회
  const { data: summary, isLoading, error } = useQuery<ProjectSummary | null>({
    queryKey: ['project-summary', projectId],
    queryFn: async () => {
      if (!user || !projectId) return null

      const { data, error } = await supabase
        .from('project_summaries')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle()

      if (error) {
        // 프로젝트 요약 조회 실패 (로깅 제거)
        return null
      }

      return data
    },
    enabled: !!user && !!projectId
  })

  // useInterviews의 데이터를 사용해서 완료된 인터뷰 수 계산
  const currentInterviewCount = interviews.filter(interview => 
    interview.status === 'completed'
  ).length

  // 요약 생성/재생성 함수
  const generateSummary = useMutation({
    mutationFn: async () => {
      if (!user || !projectId) {
        throw new Error('로그인이 필요합니다')
      }

      setIsGenerating(true)

      const response = await fetch('/api/workflow/insight-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          userName: user.email || 'anonymous'
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || '요약 생성에 실패했습니다')
      }

      const result = await response.json()
      return result
    },
    onSuccess: () => {
      // 요약 데이터 새로고침 (인터뷰 데이터는 useInterviews에서 자동 관리됨)
      queryClient.invalidateQueries({ queryKey: ['project-summary', projectId] })
    },
    onError: (error) => {
      // 요약 생성 실패 (로깅 제거)
    },
    onSettled: () => {
      setIsGenerating(false)
    }
  })

  // 새로운 인터뷰 추가 여부 확인
  const hasNewInterviews = summary 
    ? currentInterviewCount > summary.interview_count_at_creation
    : false

  const newInterviewsCount = summary 
    ? Math.max(0, currentInterviewCount - summary.interview_count_at_creation)
    : 0

  return {
    summary,
    isLoading,
    error,
    currentInterviewCount,
    hasNewInterviews,
    newInterviewsCount,
    generateSummary: generateSummary.mutate,
    isGenerating: isGenerating || generateSummary.isPending
  }
}