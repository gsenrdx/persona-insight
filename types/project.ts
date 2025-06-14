// 프로젝트 관리 관련 타입 정의

import { ApiResponse } from './api'

// 프로젝트 기본 타입
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

// 프로젝트 생성 데이터
export interface CreateProjectData {
  name: string
  description?: string
  company_id: string
  created_by?: string
  visibility: ProjectVisibility
  join_method: ProjectJoinMethod
  password?: string
  purpose?: string
  target_audience?: string
  research_method?: string
  start_date?: string
  end_date?: string
}

// 프로젝트 업데이트 데이터
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

// 프로젝트 멤버 정보
export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: ProjectMemberRole
  joined_at: string
  user?: {
    id: string
    name: string
    avatar_url: string | null
    role: string
  }
}

// 프로젝트 멤버십 데이터
export interface ProjectMembershipData {
  project_id: string
  user_id: string
  role: ProjectMemberRole
}

// UI용 확장 프로젝트 정보
export interface ProjectWithMembership extends Project {
  membership?: {
    is_member: boolean
    role: ProjectMemberRole
    joined_at: string
  }
  member_count?: number
  interview_count?: number
  persona_count?: number
  top_members?: Array<{
    user_id: string
    role: ProjectMemberRole
    name: string
    avatar_url?: string
  }>
  is_private?: boolean
}

// API 응답 타입
export interface ProjectApiResponse extends ApiResponse<ProjectWithMembership[]> {}
export interface SingleProjectApiResponse extends ApiResponse<ProjectWithMembership> {}
export interface ProjectMembersApiResponse extends ApiResponse<ProjectMember[]> {} 