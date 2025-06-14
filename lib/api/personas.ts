import { apiClient } from './base'
import { 
  ApiResponse, 
  PaginatedApiResponse,
  PersonaListQuery,
  PersonaSynthesisRequest,
  PersonaSynthesisResult,
  PersonaUpdateRequest,
  PersonaChatMessage,
  PersonaChatRequest,
  PersonaChatResponse
} from '@/types/api'
import { PersonaData } from '@/types/persona'

/**
 * 페르소나 관련 API 함수들
 */
export const personasApi = {
  /**
   * 페르소나 목록 조회
   */
  async getPersonas(
    token: string,
    query: PersonaListQuery = {}
  ): Promise<PaginatedApiResponse<PersonaData>> {
    const searchParams = new URLSearchParams()
    
    if (query.projectId) searchParams.set('project_id', query.projectId)
    if (query.companyId) searchParams.set('company_id', query.companyId)
    if (query.page) searchParams.set('page', query.page.toString())
    if (query.limit) searchParams.set('limit', query.limit.toString())
    if (query.search) searchParams.set('search', query.search)
    if (query.personaType) searchParams.set('type', query.personaType)
    if (query.keywords) {
      query.keywords.forEach(keyword => searchParams.append('keywords', keyword))
    }

    const endpoint = `/api/personas?${searchParams.toString()}`
    return apiClient.authenticatedRequest<PersonaData[]>(endpoint, token)
  },

  /**
   * 단일 페르소나 조회
   */
  async getPersona(
    token: string,
    personaId: string
  ): Promise<ApiResponse<PersonaData>> {
    return apiClient.authenticatedRequest<PersonaData>(
      `/api/personas/${personaId}`,
      token
    )
  },

  /**
   * 페르소나 생성 (수동)
   */
  async createPersona(
    token: string,
    personaData: Omit<PersonaData, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ApiResponse<PersonaData>> {
    return apiClient.authenticatedRequest<PersonaData>(
      '/api/personas',
      token,
      {
        method: 'POST',
        body: JSON.stringify(personaData)
      }
    )
  },

  /**
   * 페르소나 업데이트
   */
  async updatePersona(
    token: string,
    personaId: string,
    updateData: PersonaUpdateRequest
  ): Promise<ApiResponse<PersonaData>> {
    return apiClient.authenticatedRequest<PersonaData>(
      `/api/personas/${personaId}`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify(updateData)
      }
    )
  },

  /**
   * 페르소나 삭제
   */
  async deletePersona(
    token: string,
    personaId: string
  ): Promise<ApiResponse<void>> {
    return apiClient.authenticatedRequest<void>(
      `/api/personas/${personaId}`,
      token,
      { method: 'DELETE' }
    )
  },

  /**
   * AI 페르소나 합성 시작
   */
  async synthesizePersonas(
    token: string,
    synthesisData: PersonaSynthesisRequest
  ): Promise<ApiResponse<PersonaSynthesisResult>> {
    return apiClient.authenticatedRequest<PersonaSynthesisResult>(
      '/api/personas/synthesis',
      token,
      {
        method: 'POST',
        body: JSON.stringify(synthesisData)
      }
    )
  },

  /**
   * 페르소나 합성 상태 조회
   */
  async getSynthesisStatus(
    token: string,
    jobId: string
  ): Promise<ApiResponse<PersonaSynthesisResult>> {
    return apiClient.authenticatedRequest<PersonaSynthesisResult>(
      `/api/personas/synthesis/${jobId}`,
      token
    )
  },

  /**
   * 페르소나와 채팅
   */
  async chatWithPersona(
    token: string,
    chatData: PersonaChatRequest
  ): Promise<ApiResponse<PersonaChatResponse>> {
    return apiClient.authenticatedRequest<PersonaChatResponse>(
      '/api/chat',
      token,
      {
        method: 'POST',
        body: JSON.stringify(chatData)
      }
    )
  },

  /**
   * 페르소나 채팅 기록 조회
   */
  async getChatHistory(
    token: string,
    personaId: string,
    conversationId?: string
  ): Promise<ApiResponse<PersonaChatMessage[]>> {
    const params = new URLSearchParams({ personaId })
    if (conversationId) params.set('conversationId', conversationId)

    return apiClient.authenticatedRequest<PersonaChatMessage[]>(
      `/api/chat/history?${params.toString()}`,
      token
    )
  },

  /**
   * 페르소나 채팅 요약 생성
   */
  async generateChatSummary(
    token: string,
    personaId: string,
    conversationId: string
  ): Promise<ApiResponse<{ summary: string; summaryData?: any }>> {
    return apiClient.authenticatedRequest<{ summary: string; summaryData?: any }>(
      '/api/chat/summary',
      token,
      {
        method: 'POST',
        body: JSON.stringify({ personaId, conversationId })
      }
    )
  },

  /**
   * 페르소나 복제
   */
  async clonePersona(
    token: string,
    personaId: string,
    targetProjectId?: string
  ): Promise<ApiResponse<PersonaData>> {
    return apiClient.authenticatedRequest<PersonaData>(
      `/api/personas/${personaId}/clone`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ targetProjectId })
      }
    )
  },

  /**
   * 페르소나 이미지 업로드
   */
  async uploadPersonaImage(
    token: string,
    personaId: string,
    imageFile: File
  ): Promise<ApiResponse<{ imageUrl: string }>> {
    const formData = new FormData()
    formData.append('image', imageFile)

    return apiClient.authenticatedRequest<{ imageUrl: string }>(
      `/api/personas/${personaId}/image`,
      token,
      {
        method: 'POST',
        body: formData
      }
    )
  },

  /**
   * 페르소나 키워드 분석
   */
  async analyzePersonaKeywords(
    token: string,
    projectId: string
  ): Promise<ApiResponse<{ keywords: string[]; frequency: Record<string, number> }>> {
    return apiClient.authenticatedRequest<{ keywords: string[]; frequency: Record<string, number> }>(
      `/api/personas/search?projectId=${projectId}`,
      token
    )
  },

  /**
   * 페르소나 인사이트 생성
   */
  async generatePersonaInsights(
    token: string,
    personaId: string
  ): Promise<ApiResponse<{ insights: string[]; recommendations: string[] }>> {
    return apiClient.authenticatedRequest<{ insights: string[]; recommendations: string[] }>(
      `/api/personas/${personaId}/insights`,
      token,
      { method: 'POST' }
    )
  }
}