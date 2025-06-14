import { apiClient } from './base'
import { 
  ApiResponse, 
  PaginatedApiResponse,
  ProjectListQuery,
  ProjectUpdateRequest,
  ProjectJoinRequest,
  ProjectMemberInviteRequest,
  ProjectInsight
} from '@/types/api'
import { 
  Project, 
  CreateProjectData, 
  ProjectMember,
  ProjectWithMembership
} from '@/types'

/**
 * 프로젝트 관련 API 함수들
 */
export const projectsApi = {
  /**
   * 프로젝트 목록 조회
   */
  async getProjects(
    token: string,
    query: ProjectListQuery = {}
  ): Promise<PaginatedApiResponse<ProjectWithMembership>> {
    const searchParams = new URLSearchParams()
    
    if (query.companyId) searchParams.set('company_id', query.companyId)
    if (query.userId) searchParams.set('user_id', query.userId)
    if (query.page) searchParams.set('page', query.page.toString())
    if (query.limit) searchParams.set('limit', query.limit.toString())
    if (query.search) searchParams.set('search', query.search)
    if (query.status) searchParams.set('status', query.status)

    const endpoint = `/api/projects?${searchParams.toString()}`
    return apiClient.authenticatedRequest<ProjectWithMembership[]>(endpoint, token)
  },

  /**
   * 단일 프로젝트 조회
   */
  async getProject(
    token: string,
    projectId: string
  ): Promise<ApiResponse<ProjectWithMembership>> {
    return apiClient.authenticatedRequest<ProjectWithMembership>(
      `/api/projects/${projectId}`,
      token
    )
  },

  /**
   * 프로젝트 생성
   */
  async createProject(
    token: string,
    projectData: CreateProjectData
  ): Promise<ApiResponse<Project>> {
    return apiClient.authenticatedRequest<Project>(
      '/api/projects',
      token,
      {
        method: 'POST',
        body: JSON.stringify(projectData)
      }
    )
  },

  /**
   * 프로젝트 업데이트
   */
  async updateProject(
    token: string,
    projectId: string,
    updateData: ProjectUpdateRequest
  ): Promise<ApiResponse<Project>> {
    return apiClient.authenticatedRequest<Project>(
      `/api/projects/${projectId}`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify(updateData)
      }
    )
  },

  /**
   * 프로젝트 삭제
   */
  async deleteProject(
    token: string,
    projectId: string
  ): Promise<ApiResponse<void>> {
    return apiClient.authenticatedRequest<void>(
      `/api/projects/${projectId}`,
      token,
      { method: 'DELETE' }
    )
  },

  /**
   * 프로젝트 참가
   */
  async joinProject(
    token: string,
    joinData: ProjectJoinRequest
  ): Promise<ApiResponse<void>> {
    return apiClient.authenticatedRequest<void>(
      '/api/projects/join',
      token,
      {
        method: 'POST',
        body: JSON.stringify(joinData)
      }
    )
  },

  /**
   * 프로젝트 멤버 목록 조회
   */
  async getProjectMembers(
    token: string,
    projectId: string
  ): Promise<ApiResponse<ProjectMember[]>> {
    return apiClient.authenticatedRequest<ProjectMember[]>(
      `/api/projects/${projectId}/members`,
      token
    )
  },

  /**
   * 프로젝트 멤버 초대
   */
  async inviteMember(
    token: string,
    projectId: string,
    inviteData: ProjectMemberInviteRequest
  ): Promise<ApiResponse<void>> {
    return apiClient.authenticatedRequest<void>(
      `/api/projects/${projectId}/members/invite`,
      token,
      {
        method: 'POST',
        body: JSON.stringify(inviteData)
      }
    )
  },

  /**
   * 프로젝트 멤버 역할 변경
   */
  async updateMemberRole(
    token: string,
    projectId: string,
    memberId: string,
    role: 'member' | 'admin'
  ): Promise<ApiResponse<void>> {
    return apiClient.authenticatedRequest<void>(
      `/api/projects/${projectId}/members/${memberId}`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify({ role })
      }
    )
  },

  /**
   * 프로젝트 멤버 제거
   */
  async removeMember(
    token: string,
    projectId: string,
    memberId: string
  ): Promise<ApiResponse<void>> {
    return apiClient.authenticatedRequest<void>(
      `/api/projects/${projectId}/members/${memberId}`,
      token,
      { method: 'DELETE' }
    )
  },

  /**
   * 프로젝트 인사이트 조회
   */
  async getProjectInsights(
    token: string,
    projectId: string
  ): Promise<ApiResponse<ProjectInsight>> {
    return apiClient.authenticatedRequest<ProjectInsight>(
      `/api/projects/${projectId}/insights`,
      token
    )
  },

  /**
   * 프로젝트 복제
   */
  async cloneProject(
    token: string,
    projectId: string,
    newName: string
  ): Promise<ApiResponse<Project>> {
    return apiClient.authenticatedRequest<Project>(
      `/api/projects/${projectId}/clone`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ name: newName })
      }
    )
  },

  /**
   * 프로젝트 아카이브
   */
  async archiveProject(
    token: string,
    projectId: string
  ): Promise<ApiResponse<void>> {
    return apiClient.authenticatedRequest<void>(
      `/api/projects/${projectId}/archive`,
      token,
      { method: 'POST' }
    )
  },

  /**
   * 프로젝트 복원
   */
  async restoreProject(
    token: string,
    projectId: string
  ): Promise<ApiResponse<void>> {
    return apiClient.authenticatedRequest<void>(
      `/api/projects/${projectId}/restore`,
      token,
      { method: 'POST' }
    )
  }
}

// Legacy 함수들 (하위 호환성을 위해 유지)
export async function fetchProjects(companyId: string, userId: string): Promise<ProjectWithMembership[]> {
  const response = await projectsApi.getProjects('', { companyId, userId })
  return response.data
}

export async function createProject(projectData: CreateProjectData): Promise<Project> {
  const response = await projectsApi.createProject('', projectData)
  return response.data
}

export async function deleteProject(projectId: string, userId: string): Promise<void> {
  await projectsApi.deleteProject('', projectId)
}

export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const response = await projectsApi.getProjectMembers('', projectId)
  return response.data
}

export async function joinProject(projectData: ProjectJoinRequest): Promise<void> {
  await projectsApi.joinProject('', projectData)
} 