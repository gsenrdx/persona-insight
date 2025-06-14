import { ApiResponse, ErrorResponse } from '@/types/api'

/**
 * 공통 API 클라이언트
 * 모든 API 호출에 대한 일관된 인터페이스 제공
 */
class ApiClient {
  private baseURL = ''

  /**
   * 기본 HTTP 요청 메서드
   */
  async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      // HTTP 에러 처리
      if (!response.ok) {
        let errorData: ErrorResponse
        try {
          errorData = await response.json()
        } catch {
          errorData = {
            error: `HTTP ${response.status}: ${response.statusText}`,
            statusCode: response.status
          }
        }
        throw new ApiError(errorData.error, response.status, errorData)
      }

      const data = await response.json()
      
      // 표준 ApiResponse 형식으로 반환
      if (data.success !== undefined || data.error !== undefined) {
        return data
      }
      
      // 레거시 응답 포맷 지원
      return {
        data,
        success: true
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      // 네트워크 에러 등 기타 에러
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        0,
        { error: 'Network or unexpected error' }
      )
    }
  }

  /**
   * GET 요청
   */
  get<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { 
      method: 'GET',
      headers 
    })
  }

  /**
   * POST 요청
   */
  post<T>(endpoint: string, data?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers
    })
  }

  /**
   * PUT 요청
   */
  put<T>(endpoint: string, data?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers
    })
  }

  /**
   * PATCH 요청
   */
  patch<T>(endpoint: string, data?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      headers
    })
  }

  /**
   * DELETE 요청
   */
  delete<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { 
      method: 'DELETE',
      headers 
    })
  }

  /**
   * 파일 업로드용 multipart/form-data 요청
   */
  async uploadFile<T>(
    endpoint: string, 
    formData: FormData, 
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        // Content-Type을 설정하지 않음 (브라우저가 boundary 자동 설정)
        ...headers
      }
    })
  }

  /**
   * 인증 토큰을 포함한 요청
   */
  async authenticatedRequest<T>(
    endpoint: string,
    token: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      }
    })
  }
}

/**
 * API 에러 클래스
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: ErrorResponse
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /**
   * 에러가 특정 상태 코드인지 확인
   */
  is(statusCode: number): boolean {
    return this.statusCode === statusCode
  }

  /**
   * 클라이언트 에러인지 확인 (4xx)
   */
  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500
  }

  /**
   * 서버 에러인지 확인 (5xx)
   */
  isServerError(): boolean {
    return this.statusCode >= 500 && this.statusCode < 600
  }

  /**
   * 인증 에러인지 확인
   */
  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403
  }
}

/**
 * 싱글톤 API 클라이언트 인스턴스
 */
export const apiClient = new ApiClient()

/**
 * 타입 헬퍼: API 응답에서 데이터 추출
 */
export function extractApiData<T>(response: ApiResponse<T>): T {
  if (!response.success && response.error) {
    throw new Error(response.error)
  }
  return response.data
}

/**
 * API 응답 검증 헬퍼
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true } {
  return response.success === true && !response.error
}

/**
 * API 에러 응답 검증 헬퍼
 */
export function isApiError<T>(response: ApiResponse<T>): response is ApiResponse<T> & { error: string } {
  return response.success === false || !!response.error
}