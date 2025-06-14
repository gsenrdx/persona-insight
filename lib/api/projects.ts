import { 
  Project, 
  CreateProjectData, 
  ProjectMember,
  ProjectWithMembership
} from '@/types'

// 프로젝트 목록 조회
export async function fetchProjects(companyId: string, userId: string): Promise<ProjectWithMembership[]> {
  const url = `/api/projects?company_id=${companyId}&user_id=${userId}`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || '프로젝트 목록을 불러오는데 실패했습니다.')
  }

  const { data, success, error } = await response.json()
  if (!success) {
    throw new Error(error || '알 수 없는 오류가 발생했습니다.')
  }
  return data || []
}

// 프로젝트 생성
export async function createProject(projectData: CreateProjectData): Promise<Project> {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(projectData),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || '프로젝트 생성에 실패했습니다.')
  }

  const { data, success, error } = await response.json()
  if (!success) {
    throw new Error(error || '알 수 없는 오류가 발생했습니다.')
  }
  return data
}

// 프로젝트 삭제
export async function deleteProject(projectId: string, userId: string): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || '프로젝트 삭제에 실패했습니다.')
  }

  const { success, error } = await response.json()
  if (!success) {
    throw new Error(error || '알 수 없는 오류가 발생했습니다.')
  }
}

// 프로젝트 멤버 조회
export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const response = await fetch(`/api/projects/members?project_id=${projectId}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || '프로젝트 멤버를 불러오는데 실패했습니다.')
  }

  const { data, success, error } = await response.json()
  if (!success) {
    throw new Error(error || '알 수 없는 오류가 발생했습니다.')
  }
  return data || []
}

// 프로젝트 참가
export async function joinProject(projectData: { 
  project_id: string
  access_type: 'free' | 'invite_only' | 'password'
  password?: string 
}): Promise<void> {
  const response = await fetch('/api/projects', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(projectData),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || '프로젝트 참가에 실패했습니다.')
  }

  const { success, error } = await response.json()
  if (!success) {
    throw new Error(error || '알 수 없는 오류가 발생했습니다.')
  }
} 