import { apiClient } from './base'
import { 
  ApiResponse, 
  PaginatedApiResponse,
  Interview,
  InterviewUploadRequest,
  InterviewListQuery,
  InterviewProcessingResult,
  ExtractionCriteria
} from '@/types/api'
import { WorkflowJob, WorkflowStatus } from '@/types/components'

/**
 * 인터뷰 관련 API 함수들
 */
export const interviewsApi = {
  /**
   * 인터뷰 목록 조회
   */
  async getInterviews(
    token: string,
    query: InterviewListQuery = {}
  ): Promise<ApiResponse<Interview[]>> {
    const searchParams = new URLSearchParams()
    
    if (query.projectId) searchParams.set('projectId', query.projectId)
    if (query.status) searchParams.set('status', query.status)
    if (query.page) searchParams.set('page', query.page.toString())
    if (query.limit) searchParams.set('limit', query.limit.toString())
    if (query.search) searchParams.set('search', query.search)

    const endpoint = `/api/interviews?${searchParams.toString()}`
    return apiClient.authenticatedRequest<Interview[]>(endpoint, token)
  },

  /**
   * 단일 인터뷰 조회
   */
  async getInterview(
    token: string,
    interviewId: string
  ): Promise<ApiResponse<Interview>> {
    return apiClient.authenticatedRequest<Interview>(
      `/api/interviews/${interviewId}`,
      token
    )
  },

  /**
   * 인터뷰 파일 업로드 및 처리 시작
   */
  async uploadInterviews(
    token: string,
    uploadData: InterviewUploadRequest
  ): Promise<ApiResponse<WorkflowJob[]>> {
    const formData = new FormData()
    
    // 파일들 추가
    uploadData.files.forEach((file) => {
      formData.append(`files`, file)
    })
    
    // 메타데이터 추가
    formData.append('projectId', uploadData.projectId)
    formData.append('extractionCriteria', JSON.stringify(uploadData.extractionCriteria))

    return apiClient.authenticatedRequest<WorkflowJob[]>(
      '/api/interviews/upload',
      token,
      {
        method: 'POST',
        body: formData
      }
    )
  },

  /**
   * 인터뷰 처리 재시도
   */
  async retryProcessing(
    token: string,
    interviewId: string
  ): Promise<ApiResponse<InterviewProcessingResult>> {
    return apiClient.authenticatedRequest<InterviewProcessingResult>(
      `/api/interviews/${interviewId}/retry`,
      token,
      { method: 'POST' }
    )
  },

  /**
   * 인터뷰 삭제
   */
  async deleteInterview(
    token: string,
    interviewId: string
  ): Promise<ApiResponse<void>> {
    return apiClient.authenticatedRequest<void>(
      `/api/interviews/${interviewId}`,
      token,
      { method: 'DELETE' }
    )
  },

  /**
   * 여러 인터뷰 일괄 삭제
   */
  async deleteMultipleInterviews(
    token: string,
    interviewIds: string[]
  ): Promise<ApiResponse<void>> {
    return apiClient.authenticatedRequest<void>(
      '/api/interviews/bulk-delete',
      token,
      {
        method: 'DELETE',
        body: JSON.stringify({ interviewIds })
      }
    )
  },

  /**
   * 인터뷰 메타데이터 업데이트
   */
  async updateInterview(
    token: string,
    interviewId: string,
    updateData: Partial<Pick<Interview, 'fileName' | 'extractionCriteria'>>
  ): Promise<ApiResponse<Interview>> {
    return apiClient.authenticatedRequest<Interview>(
      `/api/interviews/${interviewId}`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      }
    )
  },

  /**
   * 워크플로우 상태 조회
   */
  async getWorkflowStatus(
    token: string,
    jobIds: string[]
  ): Promise<ApiResponse<WorkflowJob[]>> {
    const searchParams = new URLSearchParams()
    jobIds.forEach(id => searchParams.append('jobIds', id))

    return apiClient.authenticatedRequest<WorkflowJob[]>(
      `/api/workflow/status?${searchParams.toString()}`,
      token
    )
  },

  /**
   * 추출 기준 목록 조회
   */
  async getExtractionCriteria(
    token: string,
    projectId?: string
  ): Promise<ApiResponse<ExtractionCriteria[]>> {
    const endpoint = projectId 
      ? `/api/extraction-criteria?projectId=${projectId}`
      : '/api/extraction-criteria'
      
    return apiClient.authenticatedRequest<ExtractionCriteria[]>(endpoint, token)
  },

  /**
   * 추출 기준 생성
   */
  async createExtractionCriteria(
    token: string,
    criteria: Omit<ExtractionCriteria, 'id'>
  ): Promise<ApiResponse<ExtractionCriteria>> {
    return apiClient.authenticatedRequest<ExtractionCriteria>(
      '/api/extraction-criteria',
      token,
      {
        method: 'POST',
        body: JSON.stringify(criteria)
      }
    )
  },

  /**
   * 추출 기준 수정
   */
  async updateExtractionCriteria(
    token: string,
    criteriaId: string,
    criteria: Partial<ExtractionCriteria>
  ): Promise<ApiResponse<ExtractionCriteria>> {
    return apiClient.authenticatedRequest<ExtractionCriteria>(
      `/api/extraction-criteria/${criteriaId}`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify(criteria)
      }
    )
  },

  /**
   * 추출 기준 삭제
   */
  async deleteExtractionCriteria(
    token: string,
    criteriaId: string
  ): Promise<ApiResponse<void>> {
    return apiClient.authenticatedRequest<void>(
      `/api/extraction-criteria/${criteriaId}`,
      token,
      { method: 'DELETE' }
    )
  }
}