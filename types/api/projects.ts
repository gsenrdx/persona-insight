// API response types for projects
import { Database } from '../database'

type Profile = Database['public']['Tables']['profiles']['Row']
type Project = Database['public']['Tables']['projects']['Row']
type ProjectMember = Database['public']['Tables']['project_members']['Row']

// Extended project member with user profile
export interface ProjectMemberWithProfile extends ProjectMember {
  profiles?: Profile
}

// Extended project with members and stats
export interface ProjectWithDetails extends Project {
  project_members?: ProjectMemberWithProfile[]
  interviewee_count?: number
  member_count?: number
}

// RPC response for project list
export interface ProjectRPCResponse extends Omit<Project, 'password'> {
  project_members?: Array<{
    user_id: string
    role: string
  }>
  interviewee_count?: number
}