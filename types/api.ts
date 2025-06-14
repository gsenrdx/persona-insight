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