// 메모 관련 타입 정의
export interface InterviewNote {
  id: string
  interview_id: string
  script_item_ids: string[]
  content: string
  created_by: string
  company_id: string
  created_at: string
  updated_at: string
  is_deleted: boolean
  // 관계 데이터
  created_by_profile?: {
    id: string
    name: string
    avatar_url: string | null
  }
  replies?: InterviewNoteReply[]
}

export interface InterviewNoteReply {
  id: string
  note_id: string
  content: string
  created_by: string
  company_id: string
  created_at: string
  updated_at: string
  is_deleted: boolean
  // 관계 데이터
  created_by_profile?: {
    id: string
    name: string
    avatar_url: string | null
  }
}

// API 요청/응답 타입
export interface CreateNoteRequest {
  scriptItemIds: string[]
  content: string
}

export interface CreateReplyRequest {
  noteId: string
  content: string
}

export interface UpdateNoteRequest {
  content: string
}