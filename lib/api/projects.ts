export interface Project {
  id: string
  name: string
  description: string | null
  is_private: boolean
  created_at: string
  updated_at: string
  company_id: string
  created_by: string
  access_type: 'free' | 'invite_only' | 'password'
  password_hash?: string | null
  project_members?: Array<{
    id: string
    user_id: string
    role: 'owner' | 'admin' | 'member'
    joined_at: string
    profiles: {
      id: string
      name: string
    }
  }>
}

export interface CreateProjectData {
  name: string
  description?: string
  company_id: string
  created_by: string
  visibility: 'public' | 'private'
  join_method: 'open' | 'invite_only' | 'password'
  password?: string
}

export interface ProjectMember {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
}

// 프로젝트 목록 조회
export async function fetchProjects(companyId: string, userId: string): Promise<Project[]> {
  const url = `/api/supabase/projects?company_id=${companyId}&user_id=${userId}`
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

  const data = await response.json()
  return data.data || []
}

// 프로젝트 생성
export async function createProject(projectData: CreateProjectData): Promise<Project> {
  const response = await fetch('/api/supabase/projects', {
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

  const data = await response.json()
  return data.project
}

// 프로젝트 삭제
export async function deleteProject(projectId: string, userId: string): Promise<void> {
  const response = await fetch(`/api/supabase/projects?id=${projectId}&user_id=${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || '프로젝트 삭제에 실패했습니다.')
  }
}

// 프로젝트 멤버 조회
export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const response = await fetch(`/api/supabase/projects/members?project_id=${projectId}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || '프로젝트 멤버를 불러오는데 실패했습니다.')
  }

  const data = await response.json()
  return data.members || []
}

// 프로젝트 참가
export async function joinProject(projectData: { 
  project_id: string
  access_type: 'free' | 'invite_only' | 'password'
  password?: string 
}): Promise<void> {
  const response = await fetch('/api/supabase/projects', {
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
} 