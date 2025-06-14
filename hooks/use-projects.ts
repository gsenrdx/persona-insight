import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query'
import { 
  fetchProjects, 
  createProject, 
  deleteProject, 
  fetchProjectMembers,
  joinProject 
} from '@/lib/api/projects'

// 타입 재export (컴포넌트에서 import 편의성을 위해)
export type { Project, CreateProjectData, ProjectMember } from '@/types'

// 프로젝트 목록 조회
export function useProjects(companyId?: string, userId?: string) {
  return useQuery({
    queryKey: ['projects', companyId, userId],
    queryFn: () => fetchProjects(companyId!, userId!),
    enabled: !!companyId && !!userId, // companyId와 userId가 있을 때만 실행
    staleTime: 1 * 60 * 1000, // 1분간 fresh 상태 유지
  })
}

// 프로젝트 생성
export function useCreateProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      // 프로젝트 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error) => {
      console.error('프로젝트 생성 실패:', error)
    },
  })
}

// 프로젝트 삭제
export function useDeleteProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) =>
      deleteProject(projectId, userId),
    onSuccess: () => {
      // 프로젝트 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error) => {
      console.error('프로젝트 삭제 실패:', error)
    },
  })
}

// 프로젝트 멤버 조회
export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: !!projectId, // projectId가 있을 때만 실행
    staleTime: 2 * 60 * 1000, // 2분간 fresh 상태 유지
  })
}

// 프로젝트 참가
export function useJoinProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: joinProject,
    onSuccess: () => {
      // 프로젝트 목록과 멤버 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project-members'] })
    },
    onError: (error) => {
      console.error('프로젝트 참가 실패:', error)
    },
  })
} 