import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { personasApi, extractApiData, ApiError } from '@/lib/api'
import { queryKeys, queryKeyUtils } from '@/lib/query-keys'
import { useAuth } from './use-auth'
import { supabase } from '@/lib/supabase'
import { 
  PersonaListQuery,
  PersonaSynthesisRequest,
  PersonaUpdateRequest,
  PersonaChatRequest,
  PersonaChatMessage
} from '@/types/api'
import { PersonaData } from '@/types/persona'

// === 쿼리 훅들 ===

/**
 * 페르소나 목록 조회
 */
export function usePersonas(query: PersonaListQuery = {}) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: query.projectId 
      ? queryKeys.personas.byProject(query.projectId)
      : query.companyId 
        ? queryKeys.personas.byCompany(query.companyId)
        : queryKeys.personas.list(JSON.stringify(query)),
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await personasApi.getPersonas(session.access_token, query)
      return extractApiData(response)
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2분간 fresh 상태 유지
    gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
  })
}

/**
 * 단일 페르소나 조회
 */
export function usePersona(personaId: string) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.personas.detail(personaId),
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await personasApi.getPersona(session.access_token, personaId)
      return extractApiData(response)
    },
    enabled: !!user && !!personaId,
    staleTime: 3 * 60 * 1000,
  })
}

/**
 * 페르소나 키워드 분석
 */
export function usePersonaKeywords(projectId?: string) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.personas.keywords(projectId),
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다')
      if (!projectId) throw new Error('프로젝트 ID가 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await personasApi.analyzePersonaKeywords(session.access_token, projectId)
      return extractApiData(response)
    },
    enabled: !!user && !!projectId,
    staleTime: 5 * 60 * 1000, // 키워드는 좀 더 오래 캐시
  })
}

/**
 * 페르소나 합성 상태 조회
 */
export function usePersonaSynthesisStatus(jobId: string) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.personas.synthesisJob(jobId),
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await personasApi.getSynthesisStatus(session.access_token, jobId)
      return extractApiData(response)
    },
    enabled: !!user && !!jobId,
    refetchInterval: (query) => {
      // 완료되지 않은 상태면 3초마다 폴링
      const result = query.state.data
      if (result && (result.status === 'pending' || result.status === 'processing')) {
        return 3000
      }
      return false
    },
    staleTime: 0, // 항상 최신 상태 확인
  })
}

/**
 * 페르소나 채팅 기록 조회
 */
export function usePersonaChatHistory(personaId: string, conversationId?: string) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.chats.history(personaId, conversationId),
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await personasApi.getChatHistory(session.access_token, personaId, conversationId)
      return extractApiData(response)
    },
    enabled: !!user && !!personaId,
    staleTime: 1 * 60 * 1000,
  })
}

// === 뮤테이션 훅들 ===

/**
 * 페르소나 생성
 */
export function useCreatePersona() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (personaData: Omit<PersonaData, 'id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await personasApi.createPersona(session.access_token, personaData)
      return extractApiData(response)
    },
    onSuccess: (newPersona, variables) => {
      // 낙관적 업데이트: 새 페르소나를 즉시 캐시에 추가
      queryClient.setQueriesData(
        { queryKey: queryKeys.personas.lists() },
        (oldData: PersonaData[] | undefined) => {
          if (!oldData) return [newPersona]
          return [newPersona, ...oldData]
        }
      )
      
      // 관련 쿼리들 무효화
      queryClient.invalidateQueries(queryKeyUtils.invalidateAll('personas'))
      
      // 프로젝트별/회사별 페르소나 목록도 무효화
      if (variables.project_id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.personas.byProject(variables.project_id) 
        })
      }
      if (variables.company_id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.personas.byCompany(variables.company_id) 
        })
      }
    },
    onError: (error: ApiError) => {
      console.error('페르소나 생성 실패:', error.message)
    },
  })
}

/**
 * 페르소나 업데이트
 */
export function useUpdatePersona() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({ personaId, updateData }: { personaId: string; updateData: PersonaUpdateRequest }) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await personasApi.updatePersona(session.access_token, personaId, updateData)
      return extractApiData(response)
    },
    onSuccess: (updatedPersona, { personaId }) => {
      // 해당 페르소나 상세 정보 업데이트
      queryClient.setQueryData(
        queryKeys.personas.detail(personaId),
        updatedPersona
      )
      
      // 페르소나 목록에서도 업데이트
      queryClient.setQueriesData(
        { queryKey: queryKeys.personas.lists() },
        (oldData: PersonaData[] | undefined) => {
          if (!oldData) return oldData
          return oldData.map(persona => 
            persona.id === personaId 
              ? { ...persona, ...updatedPersona }
              : persona
          )
        }
      )
    },
    onError: (error: ApiError) => {
      console.error('페르소나 업데이트 실패:', error.message)
    },
  })
}

/**
 * 페르소나 삭제
 */
export function useDeletePersona() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (personaId: string) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      await personasApi.deletePersona(session.access_token, personaId)
      return personaId
    },
    onSuccess: (deletedPersonaId) => {
      // 낙관적 업데이트: 삭제된 페르소나를 즉시 목록에서 제거
      queryClient.setQueriesData(
        { queryKey: queryKeys.personas.lists() },
        (oldData: PersonaData[] | undefined) => {
          if (!oldData) return oldData
          return oldData.filter(persona => persona.id !== deletedPersonaId)
        }
      )
      
      // 상세 페이지 캐시 제거
      queryClient.removeQueries({ 
        queryKey: queryKeys.personas.detail(deletedPersonaId) 
      })
      
      // 관련된 채팅 기록도 제거
      queryClient.removeQueries({ 
        queryKey: queryKeys.chats.history(deletedPersonaId) 
      })
    },
    onError: (error: ApiError) => {
      console.error('페르소나 삭제 실패:', error.message)
    },
  })
}

/**
 * AI 페르소나 합성 시작
 */
export function useSynthesizePersonas() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (synthesisData: PersonaSynthesisRequest) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await personasApi.synthesizePersonas(session.access_token, synthesisData)
      return extractApiData(response)
    },
    onSuccess: (result) => {
      // 합성 상태 쿼리 시작
      if (result.jobId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.personas.synthesisJob(result.jobId) 
        })
      }
      
      // 전체 페르소나 목록 새로고침 (나중에 합성 완료시)
      queryClient.invalidateQueries(queryKeyUtils.invalidateAll('personas'))
    },
    onError: (error: ApiError) => {
      console.error('페르소나 합성 실패:', error.message)
    },
  })
}

/**
 * 페르소나와 채팅
 */
export function useChatWithPersona() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (chatData: PersonaChatRequest) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await personasApi.chatWithPersona(session.access_token, chatData)
      return extractApiData(response)
    },
    onSuccess: (_, variables) => {
      // 채팅 기록 캐시 무효화
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.chats.history(variables.personaId, variables.conversationId) 
      })
    },
    onError: (error: ApiError) => {
      console.error('페르소나 채팅 실패:', error.message)
    },
  })
}

/**
 * 페르소나 복제
 */
export function useClonePersona() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({ personaId, targetProjectId }: { personaId: string; targetProjectId?: string }) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await personasApi.clonePersona(session.access_token, personaId, targetProjectId)
      return extractApiData(response)
    },
    onSuccess: (_, { targetProjectId }) => {
      // 대상 프로젝트의 페르소나 목록 새로고침
      if (targetProjectId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.personas.byProject(targetProjectId) 
        })
      }
      
      // 전체 페르소나 목록 새로고침
      queryClient.invalidateQueries(queryKeyUtils.invalidateAll('personas'))
    },
    onError: (error: ApiError) => {
      console.error('페르소나 복제 실패:', error.message)
    },
  })
}

/**
 * 페르소나 이미지 업로드
 */
export function useUploadPersonaImage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({ personaId, imageFile }: { personaId: string; imageFile: File }) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await personasApi.uploadPersonaImage(session.access_token, personaId, imageFile)
      return extractApiData(response)
    },
    onSuccess: (result, { personaId }) => {
      // 해당 페르소나의 이미지 URL 업데이트
      queryClient.setQueryData(
        queryKeys.personas.detail(personaId),
        (oldData: PersonaData | undefined) => {
          if (!oldData) return oldData
          return { ...oldData, image_url: result.imageUrl }
        }
      )
      
      // 페르소나 목록에서도 이미지 URL 업데이트
      queryClient.setQueriesData(
        { queryKey: queryKeys.personas.lists() },
        (oldData: PersonaData[] | undefined) => {
          if (!oldData) return oldData
          return oldData.map(persona => 
            persona.id === personaId 
              ? { ...persona, image_url: result.imageUrl }
              : persona
          )
        }
      )
    },
    onError: (error: ApiError) => {
      console.error('페르소나 이미지 업로드 실패:', error.message)
    },
  })
}

/**
 * 페르소나 인사이트 생성
 */
export function useGeneratePersonaInsights() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (personaId: string) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await personasApi.generatePersonaInsights(session.access_token, personaId)
      return extractApiData(response)
    },
    onSuccess: (insights, personaId) => {
      // 페르소나 상세 정보에 인사이트 추가
      queryClient.setQueryData(
        queryKeys.personas.detail(personaId),
        (oldData: PersonaData | undefined) => {
          if (!oldData) return oldData
          return { 
            ...oldData, 
            insights: insights.insights,
            recommendations: insights.recommendations 
          }
        }
      )
    },
    onError: (error: ApiError) => {
      console.error('페르소나 인사이트 생성 실패:', error.message)
    },
  })
}

/**
 * 채팅 요약 생성
 */
export function useGenerateChatSummary() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({ personaId, conversationId }: { personaId: string; conversationId: string }) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await personasApi.generateChatSummary(session.access_token, personaId, conversationId)
      return extractApiData(response)
    },
    onSuccess: (result, { conversationId }) => {
      // 해당 대화의 요약 캐시
      queryClient.setQueryData(
        queryKeys.chats.summary(conversationId),
        result
      )
    },
    onError: (error: ApiError) => {
      console.error('채팅 요약 생성 실패:', error.message)
    },
  })
}

// === Legacy 함수들 (하위 호환성을 위해 유지) ===

/**
 * @deprecated Use usePersonas with query parameters instead
 */
export function usePersonasLegacy(companyId?: string, projectId?: string) {
  return usePersonas({ companyId, projectId })
}

// 타입 재export
export type { 
  PersonaListQuery,
  PersonaSynthesisRequest,
  PersonaUpdateRequest,
  PersonaChatRequest,
  PersonaChatMessage
}
export type { PersonaData }