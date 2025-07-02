// Realtime specific types
export interface Profile {
  id: string
  name?: string
  avatar_url?: string
}

export interface PersonaDefinition {
  id: string
  name_ko: string
  name_en: string
  description: string
  tags: string[]
}

export interface InterviewNoteReply {
  id: string
  content: string
  created_by: string
  created_at: string
  is_deleted: boolean
  created_by_profile?: Profile
}

export interface PresenceData {
  interview_id?: string
  user_id: string
  user_name?: string
  email?: string
  online_at: string
  [key: string]: any // Allow additional properties
}

export interface ViewerInfo {
  userId: string
  userName?: string
  email?: string
  onlineAt: string
}