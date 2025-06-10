export interface Project {
  id: string
  name: string
  description: string | null
  company_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  master_id: string | null
  visibility: 'public' | 'private'
  join_method: 'open' | 'invite_only' | 'password'
  password?: string | null
  purpose?: string | null
  target_audience?: string | null
  research_method?: string | null
  start_date?: string | null
  end_date?: string | null
}

export interface CreateProjectData {
  name: string
  description?: string
  company_id: string
  visibility: 'public' | 'private'
  join_method: 'open' | 'invite_only' | 'password'
  password?: string
  purpose?: string
  target_audience?: string
  research_method?: string
  start_date?: string
  end_date?: string
}

export interface UpdateProjectData {
  name?: string
  description?: string
  is_active?: boolean
  master_id?: string
  visibility?: 'public' | 'private'
  join_method?: 'open' | 'invite_only' | 'password'
  password?: string
  purpose?: string
  target_audience?: string
  research_method?: string
  start_date?: string
  end_date?: string
}

export interface ProjectApiResponse {
  data: ProjectWithMembership[]
  message?: string
  error?: string
}

export interface SingleProjectApiResponse {
  data: ProjectWithMembership
  message?: string
  error?: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  user?: {
    id: string
    name: string
    avatar_url: string | null
    role: string
  }
}

export interface ProjectMembershipData {
  project_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
}

export interface ProjectWithMembership extends Project {
  membership?: ProjectMember
  member_count?: number
}

export interface ProjectMembersApiResponse {
  data: ProjectMember[]
  message?: string
  error?: string
} 