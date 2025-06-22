// API 통신 공통 타입 정의

/**
 * 표준 API 응답 형식
 * 모든 API 엔드포인트에서 사용하는 일관된 응답 구조
 */
export interface StandardApiResponse<T = any> {
  /** 요청 성공 여부 */
  success: boolean
  /** 응답 데이터 (성공 시) */
  data?: T
  /** 에러 정보 (실패 시) */
  error?: {
    /** 사용자 친화적 에러 메시지 */
    message: string
    /** 에러 코드 (HTTP 상태코드 또는 커스텀 코드) */
    code: string | number
    /** 추가 에러 세부정보 */
    details?: any
    /** 유효성 검증 에러의 경우 필드별 에러 */
    fields?: Record<string, string>
  }
  /** 추가 메타데이터 */
  meta?: {
    /** 응답 타임스탬프 */
    timestamp: string
    /** 요청 ID (디버깅용) */
    requestId?: string
    /** 버전 정보 */
    version?: string
  }
}

/**
 * 페이지네이션이 포함된 API 응답
 */
export interface PaginatedApiResponse<T> extends StandardApiResponse<T[]> {
  /** 페이지네이션 정보 */
  pagination: {
    /** 현재 페이지 (1부터 시작) */
    page: number
    /** 페이지당 항목 수 */
    limit: number
    /** 전체 항목 수 */
    total: number
    /** 전체 페이지 수 */
    totalPages: number
    /** 다음 페이지 존재 여부 */
    hasNext: boolean
    /** 이전 페이지 존재 여부 */
    hasPrev: boolean
  }
}

/**
 * 레거시 호환성을 위한 기존 ApiResponse (점진적 마이그레이션용)
 * TODO: 향후 StandardApiResponse로 마이그레이션 예정
 */
export interface ApiResponse<T> {
  data: T
  success?: boolean
  message?: string
  error?: string
}

/**
 * 레거시 ErrorResponse (점진적 마이그레이션용)
 * TODO: 향후 StandardApiResponse의 error 필드로 마이그레이션 예정
 */
export interface ErrorResponse {
  error: string
  message?: string
  statusCode?: number
}

/**
 * API 응답 헬퍼 유틸리티 타입들
 */

/** 성공 응답 타입 가드 */
export type SuccessResponse<T> = StandardApiResponse<T> & { 
  success: true
  data: T
  error?: never
}

/** 에러 응답 타입 가드 */
export type ErrorApiResponse = StandardApiResponse<never> & {
  success: false
  data?: never
  error: NonNullable<StandardApiResponse['error']>
}

/** API 응답 결과 타입 */
export type ApiResult<T> = SuccessResponse<T> | ErrorApiResponse

// 파일 업로드 응답 (레거시 호환성)
export interface FileUploadResponse extends ApiResponse<{
  fileId: string
  fileName: string
  fileSize: number
  fileUrl?: string
  mimeType: string
}> {}

// MISO API 워크플로우 상태 응답 (레거시 호환성)
export interface WorkflowStatusResponse extends ApiResponse<{
  workflowId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number // 0-100
  statusMessage?: string
  result?: any
}> {}

// 표준 파일 업로드 응답
export interface StandardFileUploadResponse extends StandardApiResponse<{
  fileId: string
  fileName: string
  fileSize: number
  fileUrl?: string
  mimeType: string
}> {}

// 표준 워크플로우 상태 응답
export interface StandardWorkflowStatusResponse extends StandardApiResponse<{
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
  companyId?: string
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