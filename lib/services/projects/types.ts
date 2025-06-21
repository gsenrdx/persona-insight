export interface TransformedProject {
  id: string
  name: string
  description: string | null
  visibility: string
  join_method: string
  created_at: string
  created_by: string
  company_id: string
  is_active: boolean
  member_count: number
  interview_count: number
  persona_count: number
  top_members: any[]
  membership: any | null
}

export interface CreateProjectParams {
  name: string
  description?: string
  visibility?: 'public' | 'private'
  join_method?: 'open' | 'approval' | 'password'
  password?: string
  user_id: string
  company_id: string
  purpose?: string
  target_audience?: string
  research_method?: string
  start_date?: string
  end_date?: string
}