import { apiClient } from './base'
import { 
  ApiResponse, 
  Interview,
  InterviewListQuery,
  InterviewProcessingResult
} from '@/types/api'

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
    
    if (query.companyId) searchParams.set('company_id', query.companyId)
    if (query.projectId) searchParams.set('project_id', query.projectId)
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
   * 인터뷰 처리 재시도
   */
  async retryProcessing(
    token: string,
    interviewId: string
  ): Promise<ApiResponse<InterviewProcessingResult>> {
    return apiClient.authenticatedRequest<InterviewProcessingResult>(
      '/api/workflow/retry',
      token,
      { 
        method: 'POST',
        body: JSON.stringify({ interviewId })
      }
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


}