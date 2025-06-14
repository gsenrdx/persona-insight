// API 통신 공통 타입 정의

// 표준 API 응답 형식
export interface ApiResponse<T> {
  data: T
  success?: boolean
  message?: string
  error?: string
}

// 페이지네이션 응답
export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ErrorResponse {
  error: string
  message?: string
  statusCode?: number
}

// 파일 업로드 응답
export interface FileUploadResponse extends ApiResponse<{
  fileId: string
  fileName: string
  fileSize: number
  fileUrl?: string
  mimeType: string
}> {}

// MISO API 워크플로우 상태 응답
export interface WorkflowStatusResponse extends ApiResponse<{
  workflowId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number // 0-100
  statusMessage?: string
  result?: any
}> {}

// =============================================================================
// 도메인별 API 요청/응답 타입들
// =============================================================================

// === 인증 관련 API 타입들 ===
export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  email: string
  password: string
  fullName: string
  companyName?: string
}

export interface AuthUser {
  id: string
  email: string
  fullName: string
  companyId: string
  role: string
}

export interface AuthResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

export interface ProfileUpdateRequest {
  fullName?: string
  email?: string
}

// === 인터뷰 관련 API 타입들 ===
export interface Interview {
  id: string
  projectId: string
  fileName: string
  originalName: string
  fileSize: number
  filePath: string
  uploadedAt: string
  processedAt?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  extractedData?: any
  error?: string
  extractionCriteria?: ExtractionCriteria[]
}

export interface ExtractionCriteria {
  id: string
  name: string
  description: string
  isDefault: boolean
}

export interface InterviewUploadRequest {
  files: File[]
  projectId: string
  extractionCriteria: ExtractionCriteria[]
}

export interface InterviewListQuery {
  projectId?: string
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  page?: number
  limit?: number
  search?: string
}

export interface InterviewProcessingResult {
  interviewId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  extractedData?: any
  error?: string
}

// === 페르소나 관련 API 타입들 ===
export interface PersonaListQuery {
  projectId?: string
  companyId?: string
  page?: number
  limit?: number
  search?: string
  keywords?: string[]
  personaType?: string
}

export interface PersonaSynthesisRequest {
  projectId: string
  interviewIds: string[]
  synthesisOptions?: {
    maxPersonas?: number
    focusAreas?: string[]
    customInstructions?: string
  }
}

export interface PersonaSynthesisResult {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  personas?: any[] // PersonaData from types/persona
  error?: string
}

export interface PersonaUpdateRequest {
  name?: string
  summary?: string
  insight?: string
  painPoint?: string
  hiddenNeeds?: string
  keywords?: string[]
  persona_character?: string
  persona_type?: string
  persona_description?: string
  image?: string
}

export interface PersonaChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface PersonaChatRequest {
  personaId: string
  message: string
  conversationId?: string
  context?: Record<string, any>
}

export interface PersonaChatResponse {
  message: PersonaChatMessage
  conversationId: string
}

// === 프로젝트 관련 API 타입들 ===
export interface ProjectListQuery {
  companyId?: string
  userId?: string
  page?: number
  limit?: number
  search?: string
  status?: 'active' | 'archived'
}

export interface ProjectUpdateRequest {
  name?: string
  description?: string
  access_type?: 'free' | 'invite_only' | 'password'
  password?: string
  status?: 'active' | 'archived'
}

export interface ProjectJoinRequest {
  project_id: string
  access_type: 'free' | 'invite_only' | 'password'
  password?: string
}

export interface ProjectMemberInviteRequest {
  email: string
  role: 'member' | 'admin'
  message?: string
}

export interface ProjectInsight {
  totalInterviews: number
  totalPersonas: number
  processingStatus: {
    pending: number
    processing: number
    completed: number
    failed: number
  }
  recentActivity: Array<{
    type: 'interview_upload' | 'persona_generated' | 'member_joined'
    timestamp: string
    details: string
  }>
}