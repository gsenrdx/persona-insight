import { ApiResponse, ErrorResponse } from '@/types/api'
import { 
  ApiError,
  NetworkError,
  TimeoutError,
  ServerError,
  ClientError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  UnauthenticatedError
} from '@/lib/errors'

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

        // 상태 코드별 특화된 에러 클래스 사용
        const errorMessage = errorData.error
        const statusCode = response.status
        const context = { endpoint, statusCode, response: errorData }

        switch (statusCode) {
          case 400:
            throw new BadRequestError(errorMessage, context)
          case 401:
            // 401 에러 시 강제 로그아웃 및 리다이렉트
            if (typeof window !== 'undefined') {
              // localStorage에서 Supabase 토큰 제거
              const storageKeys = Object.keys(window.localStorage).filter(key => 
                key.startsWith('sb-') && (key.includes('-auth-token') || key.includes('auth-token-'))
              )
              storageKeys.forEach(key => window.localStorage.removeItem(key))
              
              // 로그인 페이지로 리다이렉트 (현재 경로 보존)
              const currentPath = window.location.pathname
              window.location.href = `/login?expired=true&redirect=${encodeURIComponent(currentPath)}`
            }
            throw new UnauthenticatedError(errorMessage, context)
          case 403:
            throw new ForbiddenError(errorMessage, context)
          case 404:
            throw new NotFoundError(errorMessage, context)
          case 408:
            throw new TimeoutError(errorMessage, context)
          case 500:
          case 502:
          case 503:
          case 504:
            throw new ServerError(errorMessage, statusCode, errorData, context)
          default:
            if (statusCode >= 400 && statusCode < 500) {
              throw new ClientError(errorMessage, statusCode, errorData, context)
            } else if (statusCode >= 500) {
              throw new ServerError(errorMessage, statusCode, errorData, context)
            } else {
              throw new ApiError(errorMessage, statusCode, errorData, context)
            }
        }
      }

      const data = await response.json()
      
      // ApiResponse 형식으로 반환
      return data
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      // 네트워크 에러 처리
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError('네트워크 연결에 실패했습니다', { endpoint, originalError: error })
      }
      
      // 기타 예상치 못한 에러
      throw new ApiError(
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        0,
        undefined,
        { endpoint, originalError: error }
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

// ApiError는 이제 lib/errors에서 import하여 사용

/**
 * 싱글톤 API 클라이언트 인스턴스
 */
export const apiClient = new ApiClient()

/**
 * API 응답에서 데이터 추출
 */
export function extractApiData<T>(response: ApiResponse<T>): T {
  if (!response.success && response.error) {
    throw new ApiError(response.error, 400)
  }
  if (!response.data) {
    throw new ApiError('응답 데이터가 없습니다', 500)
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