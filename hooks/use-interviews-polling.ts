'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import type { Interview } from '@/types/interview'

interface UseInterviewsPollingOptions {
  enabled?: boolean
  refetchInterval?: number
  refetchOnWindowFocus?: boolean
}

// Polling 기반 인터뷰 목록 훅
export function useInterviewsPolling(
  projectId: string, 
  options: UseInterviewsPollingOptions = {}
) {
  const { 
    enabled = true,
    refetchInterval = 30000, // 30초 기본값
    refetchOnWindowFocus = true
  } = options
  
  const { session } = useAuth()
  const queryClient = useQueryClient()
  
  // 인터뷰 목록 조회
  const {
    data: interviews = [],
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['interviews', projectId],
    queryFn: async () => {
      if (!session?.access_token) {
        throw new Error('인증이 필요합니다')
      }
      
      const response = await fetch(`/api/projects/${projectId}/interviews`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('인터뷰 목록을 불러올 수 없습니다')
      }
      
      const data = await response.json()
      return data.data as Interview[]
    },
    enabled: enabled && !!projectId && !!session?.access_token,
    refetchInterval,
    refetchOnWindowFocus,
    staleTime: 10000, // 10초 동안 fresh 상태 유지
  })
  
  // 인터뷰 생성
  const createInterviewMutation = useMutation({
    mutationFn: async (data: Partial<Interview>) => {
      if (!session?.access_token) {
        throw new Error('인증이 필요합니다')
      }
      
      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          project_id: projectId
        })
      })
      
      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`인터뷰 생성에 실패했습니다 (${response.status}: ${response.statusText})`)
      }
      
      const result = await response.json()
      return result.data as Interview
    },
    onSuccess: (newInterview) => {
      // 즉시 캐시 업데이트 (Optimistic Update)
      queryClient.setQueryData(['interviews', projectId], (old: Interview[] = []) => {
        return [newInterview, ...old] // 최신 항목을 위에 표시
      })
      toast.success('인터뷰가 생성되었습니다')
    },
    onError: (error) => {
      toast.error('인터뷰 생성에 실패했습니다')
    }
  })
  
  // 인터뷰 업데이트
  const updateInterviewMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<Interview> }) => {
      if (!session?.access_token) {
        throw new Error('인증이 필요합니다')
      }
      
      const response = await fetch(`/api/interviews/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error('인터뷰 수정에 실패했습니다')
      }
      
      const result = await response.json()
      return result.data as Interview
    },
    onMutate: async ({ id, data }) => {
      // 이전 데이터 백업
      await queryClient.cancelQueries({ queryKey: ['interviews', projectId] })
      const previousInterviews = queryClient.getQueryData(['interviews', projectId])
      
      // Optimistic Update
      queryClient.setQueryData(['interviews', projectId], (old: Interview[] = []) => {
        return old.map(interview => 
          interview.id === id 
            ? { ...interview, ...data }
            : interview
        )
      })
      
      return { previousInterviews }
    },
    onError: (err, variables, context) => {
      // 에러 시 롤백
      if (context?.previousInterviews) {
        queryClient.setQueryData(['interviews', projectId], context.previousInterviews)
      }
      toast.error('인터뷰 수정에 실패했습니다')
    },
    onSuccess: () => {
      toast.success('인터뷰가 수정되었습니다')
    },
    onSettled: () => {
      // 최종적으로 서버 데이터로 동기화
      queryClient.invalidateQueries({ queryKey: ['interviews', projectId] })
    }
  })
  
  // 인터뷰 삭제
  const deleteInterviewMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!session?.access_token) {
        throw new Error('인증이 필요합니다')
      }
      
      const response = await fetch(`/api/interviews/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('인터뷰 삭제에 실패했습니다')
      }
    },
    onMutate: async (id) => {
      // 이전 데이터 백업
      await queryClient.cancelQueries({ queryKey: ['interviews', projectId] })
      const previousInterviews = queryClient.getQueryData(['interviews', projectId])
      
      // Optimistic Update
      queryClient.setQueryData(['interviews', projectId], (old: Interview[] = []) => {
        return old.filter(interview => interview.id !== id)
      })
      
      return { previousInterviews }
    },
    onError: (err, variables, context) => {
      // 에러 시 롤백
      if (context?.previousInterviews) {
        queryClient.setQueryData(['interviews', projectId], context.previousInterviews)
      }
      toast.error('인터뷰 삭제에 실패했습니다')
    },
    onSuccess: () => {
      toast.success('인터뷰가 삭제되었습니다')
    },
    onSettled: () => {
      // 최종적으로 서버 데이터로 동기화
      queryClient.invalidateQueries({ queryKey: ['interviews', projectId] })
    }
  })
  
  return {
    interviews,
    isLoading,
    isFetching,
    error,
    refetch,
    createInterview: createInterviewMutation.mutate,
    updateInterview: (id: string, data: Partial<Interview>) => 
      updateInterviewMutation.mutate({ id, data }),
    deleteInterview: deleteInterviewMutation.mutate,
    isCreating: createInterviewMutation.isPending,
    isUpdating: updateInterviewMutation.isPending,
    isDeleting: deleteInterviewMutation.isPending
  }
}

// 단일 인터뷰 조회 (상세 페이지용)
export function useInterviewPolling(interviewId: string, options: UseInterviewsPollingOptions = {}) {
  const { 
    enabled = true,
    refetchInterval = 60000, // 상세 페이지는 60초
    refetchOnWindowFocus = true
  } = options
  
  const { session } = useAuth()
  
  const {
    data: interview,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['interview', interviewId],
    queryFn: async () => {
      if (!session?.access_token) {
        throw new Error('인증이 필요합니다')
      }
      
      const response = await fetch(`/api/interviews/${interviewId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('인터뷰를 불러올 수 없습니다')
      }
      
      const data = await response.json()
      return data.data as Interview
    },
    enabled: enabled && !!interviewId && !!session?.access_token,
    refetchInterval,
    refetchOnWindowFocus,
    staleTime: 30000, // 30초 동안 fresh 상태 유지
  })
  
  return {
    interview,
    isLoading,
    error,
    refetch
  }
}