import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi, extractApiData, ApiError } from '@/lib/api'
import { queryKeys, queryKeyUtils } from '@/lib/query-keys'
import { useAuth } from './use-auth'
import { supabase } from '@/lib/supabase'
import { 
  Project, 
  CreateProjectData, 
  ProjectMember, 
  ProjectWithMembership,
  ProjectListQuery,
  ProjectUpdateRequest,
  ProjectJoinRequest,
  ProjectMemberInviteRequest
} from '@/types'

// === 쿼리 훅들 ===

/**
 * 프로젝트 목록 조회 (새로운 API 사용)
 */
export function useProjects(query: ProjectListQuery = {}) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: query.companyId && query.userId 
      ? queryKeys.projects.byCompanyAndUser(query.companyId, query.userId)
      : queryKeys.projects.list(JSON.stringify(query)),
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await projectsApi.getProjects(session.access_token, query)
      return extractApiData(response)
    },
    enabled: !!user && (!!query.companyId || !!query.userId),
    staleTime: 1 * 60 * 1000, // 1분간 fresh 상태 유지
    gcTime: 5 * 60 * 1000, // 5분간 캐시 유지
  })
}

/**
 * 단일 프로젝트 조회
 */
export function useProject(projectId: string) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await projectsApi.getProject(session.access_token, projectId)
      return extractApiData(response)
    },
    enabled: !!user && !!projectId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * 프로젝트 멤버 목록 조회
 */
export function useProjectMembers(projectId: string) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.projects.member(projectId),
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await projectsApi.getProjectMembers(session.access_token, projectId)
      return extractApiData(response)
    },
    enabled: !!user && !!projectId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * 프로젝트 인사이트 조회
 */
export function useProjectInsights(projectId: string) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.projects.insights(projectId),
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await projectsApi.getProjectInsights(session.access_token, projectId)
      return extractApiData(response)
    },
    enabled: !!user && !!projectId,
    staleTime: 5 * 60 * 1000, // 인사이트는 좀 더 오래 캐시
  })
}

// === 뮤테이션 훅들 ===

/**
 * 프로젝트 생성
 */
export function useCreateProject() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (projectData: CreateProjectData) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await projectsApi.createProject(session.access_token, projectData)
      return extractApiData(response)
    },
    onSuccess: (newProject, variables) => {
      // 낙관적 업데이트: 새 프로젝트를 즉시 캐시에 추가
      queryClient.setQueriesData(
        { queryKey: queryKeys.projects.lists() },
        (oldData: ProjectWithMembership[] | undefined) => {
          if (!oldData) return [newProject as ProjectWithMembership]
          return [newProject as ProjectWithMembership, ...oldData]
        }
      )
      
      // 관련 쿼리들 무효화
      queryClient.invalidateQueries(queryKeyUtils.invalidateAll('projects'))
      
      // 회사별 프로젝트 목록도 무효화
      if (variables.company_id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.projects.byCompany(variables.company_id) 
        })
      }
    },
    onError: (error: ApiError) => {
      // 프로젝트 생성 실패
    },
  })
}

/**
 * 프로젝트 업데이트
 */
export function useUpdateProject() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({ projectId, updateData }: { projectId: string; updateData: ProjectUpdateRequest }) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await projectsApi.updateProject(session.access_token, projectId, updateData)
      return extractApiData(response)
    },
    onSuccess: (updatedProject, { projectId }) => {
      // 해당 프로젝트 상세 정보 업데이트
      queryClient.setQueryData(
        queryKeys.projects.detail(projectId),
        updatedProject
      )
      
      // 프로젝트 목록에서도 업데이트
      queryClient.setQueriesData(
        { queryKey: queryKeys.projects.lists() },
        (oldData: ProjectWithMembership[] | undefined) => {
          if (!oldData) return oldData
          return oldData.map(project => 
            project.id === projectId 
              ? { ...project, ...updatedProject }
              : project
          )
        }
      )
    },
    onError: (error: ApiError) => {
      // 프로젝트 업데이트 실패
    },
  })
}

/**
 * 프로젝트 삭제
 */
export function useDeleteProject() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      await projectsApi.deleteProject(session.access_token, projectId)
      return projectId
    },
    onSuccess: (deletedProjectId) => {
      // 낙관적 업데이트: 삭제된 프로젝트를 즉시 목록에서 제거
      queryClient.setQueriesData(
        { queryKey: queryKeys.projects.lists() },
        (oldData: ProjectWithMembership[] | undefined) => {
          if (!oldData) return oldData
          return oldData.filter(project => project.id !== deletedProjectId)
        }
      )
      
      // 관련된 모든 쿼리 무효화
      queryKeyUtils.invalidateProject(deletedProjectId).forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })
      
      // 상세 페이지 캐시 제거
      queryClient.removeQueries({ 
        queryKey: queryKeys.projects.detail(deletedProjectId) 
      })
    },
    onError: (error: ApiError) => {
      // 프로젝트 삭제 실패
    },
  })
}

/**
 * 프로젝트 참가
 */
export function useJoinProject() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (joinData: ProjectJoinRequest) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      await projectsApi.joinProject(session.access_token, joinData)
      return joinData
    },
    onSuccess: () => {
      // 프로젝트 목록과 멤버 목록 새로고침
      queryClient.invalidateQueries(queryKeyUtils.invalidateAll('projects'))
    },
    onError: (error: ApiError) => {
      // 프로젝트 참가 실패
    },
  })
}

/**
 * 프로젝트 멤버 초대
 */
export function useInviteProjectMember() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({ projectId, inviteData }: { projectId: string; inviteData: ProjectMemberInviteRequest }) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      await projectsApi.inviteMember(session.access_token, projectId, inviteData)
      return { projectId, inviteData }
    },
    onSuccess: ({ projectId }) => {
      // 해당 프로젝트의 멤버 목록 새로고침
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.projects.member(projectId) 
      })
    },
    onError: (error: ApiError) => {
      // 멤버 초대 실패
    },
  })
}

// === Legacy 함수들 (하위 호환성을 위해 유지) ===

/**
 * @deprecated Use useProjects with query parameters instead
 */
export function useProjectsLegacy(companyId?: string, userId?: string) {
  return useProjects({ companyId, userId })
}

// 타입 재export
export type { 
  Project, 
  CreateProjectData, 
  ProjectMember, 
  ProjectWithMembership,
  ProjectListQuery,
  ProjectUpdateRequest,
  ProjectJoinRequest,
  ProjectMemberInviteRequest
} 