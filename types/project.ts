// 프로젝트 관리 관련 타입 정의

import { ApiResponse } from './api'

export type ProjectVisibility = 'public' | 'private'
export type ProjectJoinMethod = 'open' | 'invite_only' | 'password'
export type ProjectMemberRole = 'owner' | 'admin' | 'member'

// Supabase projects 테이블 구조
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
  visibility: ProjectVisibility
  join_method: ProjectJoinMethod
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
  visibility: ProjectVisibility
  join_method: ProjectJoinMethod
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
  visibility?: ProjectVisibility
  join_method?: ProjectJoinMethod
  password?: string
  purpose?: string
  target_audience?: string
  research_method?: string
  start_date?: string
  end_date?: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: ProjectMemberRole
  joined_at: string
  // 조인된 사용자 정보
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
  role: ProjectMemberRole
}

// 멤버십 정보와 통계가 포함된 프로젝트
export interface ProjectWithMembership extends Project {
  membership?: ProjectMember
  member_count?: number
}

// API 응답 타입들
export interface ProjectApiResponse extends ApiResponse<ProjectWithMembership[]> {}
export interface SingleProjectApiResponse extends ApiResponse<ProjectWithMembership> {}
export interface ProjectMembersApiResponse extends ApiResponse<ProjectMember[]> {} 