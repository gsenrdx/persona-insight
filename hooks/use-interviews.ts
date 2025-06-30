import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { interviewsApi, extractApiData, ApiError } from '@/lib/api'
import { queryKeys, queryKeyUtils } from '@/lib/query-keys'
import { useAuth } from './use-auth'
import { supabase } from '@/lib/supabase'
import { 
  Interview,
  InterviewUploadRequest,
  InterviewListQuery,
  InterviewProcessingResult,
  ExtractionCriteria
} from '@/types/api'
import { WorkflowJob, WorkflowStatus } from '@/types/components'

// === 쿼리 훅들 ===

/**
 * 인터뷰 목록 조회
 */
export function useInterviews(query: InterviewListQuery = {}) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: query.projectId 
      ? queryKeys.interviews.byProject(query.projectId)
      : queryKeys.interviews.list(JSON.stringify(query)),
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await interviewsApi.getInterviews(session.access_token, query)
      return extractApiData(response)
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
    gcTime: 30 * 60 * 1000, // 30분간 캐시 유지
    refetchOnMount: false, // 마운트 시 재조회 방지
  })
}

/**
 * 단일 인터뷰 조회
 */
export function useInterview(interviewId: string) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.interviews.detail(interviewId),
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await interviewsApi.getInterview(session.access_token, interviewId)
      return extractApiData(response)
    },
    enabled: !!user && !!interviewId,
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
    gcTime: 20 * 60 * 1000, // 20분간 캐시 유지
    refetchOnMount: false, // 마운트 시 재조회 방지
  })
}

/**
 * 워크플로우 상태 조회
 */
export function useWorkflowStatus(jobIds: string[]) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.workflows.jobs(jobIds),
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다')
      if (jobIds.length === 0) return []
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await interviewsApi.getWorkflowStatus(session.access_token, jobIds)
      return extractApiData(response)
    },
    enabled: !!user && jobIds.length > 0,
    refetchInterval: (query) => {
      // 진행 중인 작업이 있으면 3초마다 폴링
      const jobs = query.state.data as WorkflowJob[] | undefined
      if (jobs?.some(job => job.status === WorkflowStatus.PROCESSING || job.status === WorkflowStatus.PENDING)) {
        return 3000
      }
      return false
    },
    staleTime: 0, // 항상 최신 상태 확인
  })
}

/**
 * 추출 기준 목록 조회
 */
export function useExtractionCriteria(projectId?: string) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.interviews.extractionCriteria(projectId),
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await interviewsApi.getExtractionCriteria(session.access_token, projectId)
      return extractApiData(response)
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 추출 기준은 자주 변경되지 않으므로 5분간 캐시
  })
}

// === 뮤테이션 훅들 ===

/**
 * 인터뷰 파일 업로드 및 처리 시작
 */
export function useUploadInterviews() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (uploadData: InterviewUploadRequest) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await interviewsApi.uploadInterviews(session.access_token, uploadData)
      return extractApiData(response)
    },
    onSuccess: (_, variables) => {
      // 워크플로우 상태 캐시 무효화
      queryClient.invalidateQueries(queryKeyUtils.invalidateAll('workflows'))
      
      // 프로젝트별 인터뷰 목록 무효화
      if (variables.projectId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.interviews.byProject(variables.projectId) 
        })
      }
      
      // 전체 인터뷰 목록 무효화
      queryClient.invalidateQueries(queryKeyUtils.invalidateAll('interviews'))
    },
    onError: (error: ApiError) => {
      // 인터뷰 업로드 실패
    },
  })
}

/**
 * 인터뷰 처리 재시도
 */
export function useRetryInterviewProcessing() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (interviewId: string) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await interviewsApi.retryProcessing(session.access_token, interviewId)
      return extractApiData(response)
    },
    onSuccess: (_, interviewId) => {
      // 해당 인터뷰 상태 업데이트
      queryClient.setQueryData(
        queryKeys.interviews.detail(interviewId),
        (oldData: Interview | undefined) => {
          if (!oldData) return oldData
          return { ...oldData, status: 'processing' }
        }
      )
      
      // 인터뷰 목록 새로고침
      queryClient.invalidateQueries(queryKeyUtils.invalidateAll('interviews'))
      
      // 워크플로우 상태 새로고침
      queryClient.invalidateQueries(queryKeyUtils.invalidateAll('workflows'))
    },
    onError: (error: ApiError) => {
      // 인터뷰 재처리 실패
    },
  })
}

/**
 * 인터뷰 삭제
 */
export function useDeleteInterview() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (interviewId: string) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      await interviewsApi.deleteInterview(session.access_token, interviewId)
      return interviewId
    },
    onSuccess: (deletedInterviewId) => {
      // 낙관적 업데이트: 삭제된 인터뷰를 즉시 목록에서 제거
      queryClient.setQueriesData(
        { queryKey: queryKeys.interviews.lists() },
        (oldData: Interview[] | undefined) => {
          if (!oldData) return oldData
          return oldData.filter(interview => interview.id !== deletedInterviewId)
        }
      )
      
      // 상세 페이지 캐시 제거
      queryClient.removeQueries({ 
        queryKey: queryKeys.interviews.detail(deletedInterviewId) 
      })
    },
    onError: (error: ApiError) => {
      // 인터뷰 삭제 실패
    },
  })
}

/**
 * 여러 인터뷰 일괄 삭제
 */
export function useDeleteMultipleInterviews() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (interviewIds: string[]) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      await interviewsApi.deleteMultipleInterviews(session.access_token, interviewIds)
      return interviewIds
    },
    onSuccess: (deletedIds) => {
      // 낙관적 업데이트: 삭제된 인터뷰들을 즉시 목록에서 제거
      queryClient.setQueriesData(
        { queryKey: queryKeys.interviews.lists() },
        (oldData: Interview[] | undefined) => {
          if (!oldData) return oldData
          return oldData.filter(interview => !deletedIds.includes(interview.id))
        }
      )
      
      // 상세 페이지 캐시 제거
      deletedIds.forEach(id => {
        queryClient.removeQueries({ 
          queryKey: queryKeys.interviews.detail(id) 
        })
      })
    },
    onError: (error: ApiError) => {
      // 인터뷰 일괄 삭제 실패
    },
  })
}

/**
 * 인터뷰 메타데이터 업데이트
 */
export function useUpdateInterview() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({ 
      interviewId, 
      updateData 
    }: { 
      interviewId: string; 
      updateData: Partial<Pick<Interview, 'fileName' | 'extractionCriteria'>>
    }) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await interviewsApi.updateInterview(session.access_token, interviewId, updateData)
      return extractApiData(response)
    },
    onSuccess: (updatedInterview, { interviewId }) => {
      // 해당 인터뷰 상세 정보 업데이트
      queryClient.setQueryData(
        queryKeys.interviews.detail(interviewId),
        updatedInterview
      )
      
      // 인터뷰 목록에서도 업데이트
      queryClient.setQueriesData(
        { queryKey: queryKeys.interviews.lists() },
        (oldData: Interview[] | undefined) => {
          if (!oldData) return oldData
          return oldData.map(interview => 
            interview.id === interviewId 
              ? { ...interview, ...updatedInterview }
              : interview
          )
        }
      )
    },
    onError: (error: ApiError) => {
      // 인터뷰 업데이트 실패
    },
  })
}

/**
 * 추출 기준 생성
 */
export function useCreateExtractionCriteria() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (criteria: Omit<ExtractionCriteria, 'id'>) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await interviewsApi.createExtractionCriteria(session.access_token, criteria)
      return extractApiData(response)
    },
    onSuccess: (newCriteria) => {
      // 낙관적 업데이트: 새 기준을 즉시 캐시에 추가
      queryClient.setQueriesData(
        { queryKey: queryKeys.interviews.extractionCriteria() },
        (oldData: ExtractionCriteria[] | undefined) => {
          if (!oldData) return [newCriteria]
          return [newCriteria, ...oldData]
        }
      )
      
      // 전체 추출 기준 목록 새로고침
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.interviews.extractionCriteria() 
      })
    },
    onError: (error: ApiError) => {
      // 추출 기준 생성 실패
    },
  })
}

/**
 * 추출 기준 수정
 */
export function useUpdateExtractionCriteria() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({ 
      criteriaId, 
      criteria 
    }: { 
      criteriaId: string; 
      criteria: Partial<ExtractionCriteria> 
    }) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await interviewsApi.updateExtractionCriteria(session.access_token, criteriaId, criteria)
      return extractApiData(response)
    },
    onSuccess: (updatedCriteria, { criteriaId }) => {
      // 추출 기준 목록에서 업데이트
      queryClient.setQueriesData(
        { queryKey: queryKeys.interviews.extractionCriteria() },
        (oldData: ExtractionCriteria[] | undefined) => {
          if (!oldData) return oldData
          return oldData.map(criteria => 
            criteria.id === criteriaId 
              ? { ...criteria, ...updatedCriteria }
              : criteria
          )
        }
      )
    },
    onError: (error: ApiError) => {
      // 추출 기준 수정 실패
    },
  })
}

/**
 * 추출 기준 삭제
 */
export function useDeleteExtractionCriteria() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (criteriaId: string) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      await interviewsApi.deleteExtractionCriteria(session.access_token, criteriaId)
      return criteriaId
    },
    onSuccess: (deletedCriteriaId) => {
      // 낙관적 업데이트: 삭제된 기준을 즉시 목록에서 제거
      queryClient.setQueriesData(
        { queryKey: queryKeys.interviews.extractionCriteria() },
        (oldData: ExtractionCriteria[] | undefined) => {
          if (!oldData) return oldData
          return oldData.filter(criteria => criteria.id !== deletedCriteriaId)
        }
      )
    },
    onError: (error: ApiError) => {
      // 추출 기준 삭제 실패
    },
  })
}

// === Legacy 함수들 (하위 호환성을 위해 유지) ===

/**
 * @deprecated Use useInterviews with query parameters instead
 */
export function useInterviewsLegacy(projectId?: string) {
  return useInterviews({ projectId })
}

// 타입 재export
export type { 
  Interview,
  InterviewUploadRequest,
  InterviewListQuery,
  InterviewProcessingResult,
  ExtractionCriteria
}
export type { WorkflowJob, WorkflowStatus }