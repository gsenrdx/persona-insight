import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import { Interview } from '@/types/interview'
import { toast } from 'sonner'

interface UseInterviewsOptions {
  projectId: string
  enabled?: boolean
}

/**
 * 프로덕션 수준 인터뷰 관리 훅
 * 낙관적 업데이트 + 스마트 폴링으로 실시간성과 안정성 모두 확보
 * 
 * 특징:
 * - 즉시 UI 반응 (낙관적 업데이트)
 * - processing 상태가 있을 때만 자동 폴링
 * - 완료 시 폴링 자동 중단으로 리소스 절약
 * - 에러 시 자동 롤백
 * - 창 포커스/재연결 시 동기화
 */
export function useInterviews({ projectId, enabled = true }: UseInterviewsOptions) {
  const { session, profile } = useAuth()
  const queryClient = useQueryClient()

  // 스마트 폴링 기반 인터뷰 목록 조회
  const {
    data: interviews = [],
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery<Interview[]>({
    queryKey: ['interviews', projectId],
    queryFn: async () => {
      if (!session?.access_token) throw new Error('인증이 필요합니다')
      
      const response = await fetch(`/api/projects/${projectId}/interviews`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`인터뷰 목록 조회 실패: ${response.status}`)
      }
      
      const result = await response.json()
      return result.data || []
    },
    enabled: enabled && !!session?.access_token,
    // 스마트 폴링: processing 상태가 있을 때만 3초마다 자동 새로고침
    refetchInterval: (query) => {
      const interviews = query.state.data as Interview[] || []
      const hasProcessing = interviews.some(i => 
        i.workflow_status === 'processing' || i.status === 'processing'
      )
      return hasProcessing ? 3000 : false // 3초로 단축 (더 빠른 반응)
    },
    // 창 포커스 시 새로고침 (사용자가 돌아왔을 때 최신 상태 확인)
    refetchOnWindowFocus: true,
    // 재연결 시 새로고침 (네트워크 복구 시)
    refetchOnReconnect: true,
    // 2분간 캐시 유지 (적절한 밸런스)
    staleTime: 2 * 60 * 1000,
    // 캐시 수명 5분
    gcTime: 5 * 60 * 1000,
    // 에러 시 3번 재시도
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  // 인터뷰 생성 (낙관적 업데이트)
  const createMutation = useMutation({
    mutationFn: async ({ content, title, lastModified }: {
      content: File | string
      title: string
      lastModified?: number
    }) => {
      if (!session?.access_token) throw new Error('Unauthorized')

      let response: Response

      if (content instanceof File) {
        const formData = new FormData()
        formData.append('file', content)
        formData.append('projectId', projectId)
        formData.append('title', title)
        if (lastModified) {
          formData.append('lastModified', lastModified.toString())
        }

        response = await fetch('/api/workflow/async', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: formData
        })
      } else {
        response = await fetch('/api/workflow/async', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: content,
            projectId,
            title
          })
        })
      }

      if (!response.ok) {
        throw new Error('인터뷰 생성에 실패했습니다')
      }

      return response.json()
    },
    onMutate: async ({ title }) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['interviews', projectId] })
      
      // 현재 데이터 백업
      const previousInterviews = queryClient.getQueryData<Interview[]>(['interviews', projectId])
      
      // 낙관적 업데이트: 임시 인터뷰 즉시 추가
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const tempInterview: Interview = {
        id: tempId,
        title,
        workflow_status: 'processing',
        status: 'processing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        project_id: projectId,
        company_id: profile?.company_id || '',
        created_by: profile?.id || '',
        interview_date: new Date().toISOString().split('T')[0],
        raw_text: '',
        cleaned_script: [],
        key_takeaways: [],
        primary_pain_points: [],
        primary_needs: [],
        hmw_questions: [],
        total_topics: 0,
        ai_persona_match: null,
        summary_ko: null,
        metadata: { is_temp: true },
        script_sections: [],
        confirmed_persona_definition_id: null,
        file_url: null
      }
      
      // 목록 최상단에 추가
      queryClient.setQueryData<Interview[]>(
        ['interviews', projectId],
        (old = []) => [tempInterview, ...old]
      )
      
      return { previousInterviews, tempInterview }
    },
    onSuccess: (data, variables, context) => {
      if (!data.interview || !context?.tempInterview) return
      
      // 서버 응답으로 임시 데이터 교체
      queryClient.setQueryData<Interview[]>(
        ['interviews', projectId],
        (old = []) => {
          const withoutTemp = old.filter(i => i.id !== context.tempInterview.id)
          
          // 서버에서 반환된 실제 데이터 사용
          const realInterview: Interview = {
            ...context.tempInterview,
            ...data.interview,
            id: data.interview.id,
            workflow_status: 'processing',
            status: 'processing',
            metadata: {} // 임시 플래그 제거
          }
          
          return [realInterview, ...withoutTemp]
        }
      )
      
      toast.success('인터뷰 분석을 시작합니다')
      
      // 3초 후 서버 동기화 (백그라운드 처리 확인)
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['interviews', projectId],
          exact: true 
        })
      }, 3000)
    },
    onError: (error, variables, context) => {
      // 에러 시 이전 상태로 완전 복원
      if (context?.previousInterviews) {
        queryClient.setQueryData(['interviews', projectId], context.previousInterviews)
      }
      
      const errorMessage = error instanceof Error ? error.message : '인터뷰 생성에 실패했습니다'
      toast.error(errorMessage)
    }
  })

  // 인터뷰 업데이트
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Interview> }) => {
      const response = await fetch(`/api/interviews/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })
      if (!response.ok) throw new Error('Failed to update interview')
      return response.json()
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['interviews', projectId] })
      
      const previousInterviews = queryClient.getQueryData<Interview[]>(['interviews', projectId])
      
      queryClient.setQueryData<Interview[]>(
        ['interviews', projectId],
        (old = []) => old.map(interview => 
          interview.id === id ? { ...interview, ...updates } : interview
        )
      )
      
      return { previousInterviews }
    },
    onError: (err, variables, context) => {
      if (context?.previousInterviews) {
        queryClient.setQueryData(['interviews', projectId], context.previousInterviews)
      }
      toast.error('인터뷰 업데이트에 실패했습니다')
    },
    onSuccess: () => {
      toast.success('인터뷰가 업데이트되었습니다')
    }
  })

  // 인터뷰 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/interviews/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      if (!response.ok) throw new Error('Failed to delete interview')
      return id
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['interviews', projectId] })
      
      const previousInterviews = queryClient.getQueryData<Interview[]>(['interviews', projectId])
      
      queryClient.setQueryData<Interview[]>(
        ['interviews', projectId],
        (old = []) => old.filter(interview => interview.id !== id)
      )
      
      return { previousInterviews }
    },
    onError: (err, variables, context) => {
      if (context?.previousInterviews) {
        queryClient.setQueryData(['interviews', projectId], context.previousInterviews)
      }
      toast.error('인터뷰 삭제에 실패했습니다')
    },
    onSuccess: () => {
      toast.success('인터뷰가 삭제되었습니다')
    }
  })

  // 상태 분석
  const processingCount = interviews.filter(i => 
    i.workflow_status === 'processing' || i.status === 'processing'
  ).length
  
  const completedCount = interviews.filter(i => 
    i.workflow_status === 'completed' || i.status === 'completed'
  ).length
  
  const failedCount = interviews.filter(i => 
    i.workflow_status === 'failed' || i.status === 'failed'
  ).length

  return {
    // 데이터
    interviews,
    isLoading,
    error,
    isFetching,
    
    // 통계
    processingCount,
    completedCount,
    failedCount,
    totalCount: interviews.length,
    
    // 액션
    createInterview: createMutation.mutate,
    updateInterview: updateMutation.mutate,
    deleteInterview: deleteMutation.mutate,
    refetch,
    
    // 상태
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // 헬퍼
    hasProcessing: processingCount > 0,
    hasFailed: failedCount > 0,
    isEmpty: interviews.length === 0 && !isLoading
  }
}