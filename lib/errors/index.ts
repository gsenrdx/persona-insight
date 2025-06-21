/**
 * 에러 클래스 중앙 진입점
 * 
 * 모든 표준화된 에러 클래스들을 통합 관리합니다.
 */

import { getErrorMessage, getBusinessErrorMessage, COMMON_ERROR_MESSAGES } from '@/lib/constants/messages'

// API 관련 에러들
export {
  ApiError,
  NetworkError,
  TimeoutError,
  ServerError,
  ClientError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
  RateLimitError
} from './api-error'

// 인증 관련 에러들
export {
  AuthError,
  UnauthenticatedError,
  InvalidCredentialsError,
  TokenExpiredError,
  InvalidTokenError,
  MissingTokenError,
  SessionExpiredError,
  AccountDisabledError,
  EmailNotVerifiedError,
  InsufficientPermissionsError,
  CompanyAccessError,
  ProjectAccessError,
  RolePermissionError,
  DuplicateAccountError,
  PasswordPolicyError
} from './auth-error'

// 유효성 검증 관련 에러들
export {
  ValidationError,
  RequiredFieldError,
  InvalidFormatError,
  InvalidEmailError,
  InvalidPasswordError,
  LengthValidationError,
  RangeValidationError,
  FileValidationError,
  FileSizeError,
  UnsupportedFileTypeError,
  DuplicateValueError,
  ForeignKeyError,
  type ValidationErrorDetail
} from './validation-error'

// 에러 타입 체크 유틸리티 함수들
export const ErrorUtils = {
  /**
   * API 에러인지 확인
   */
  isApiError(error: unknown): boolean {
    return error instanceof Error && error.name.endsWith('Error') && 'statusCode' in error
  },

  /**
   * 인증 에러인지 확인
   */
  isAuthError(error: unknown): boolean {
    return error instanceof Error && (
      error.name === 'AuthError' ||
      error.name.includes('Unauthenticated') ||
      error.name.includes('Unauthorized') ||
      error.name.includes('Token') ||
      error.name.includes('Session') ||
      error.name.includes('Permission') ||
      error.name.includes('Access')
    )
  },

  /**
   * 유효성 검증 에러인지 확인
   */
  isValidationError(error: unknown): boolean {
    return error instanceof Error && (
      error.name === 'ValidationError' ||
      error.name.includes('Validation') ||
      error.name.includes('Format') ||
      error.name.includes('Length') ||
      error.name.includes('Range') ||
      error.name.includes('File') ||
      error.name.includes('Required')
    )
  },

  /**
   * 네트워크 에러인지 확인
   */
  isNetworkError(error: unknown): boolean {
    return error instanceof Error && (
      error.name === 'NetworkError' ||
      error.name === 'TimeoutError' ||
      (error as Error & { statusCode?: number }).statusCode === 0
    )
  },

  /**
   * 서버 에러인지 확인 (5xx)
   */
  isServerError(error: unknown): boolean {
    return error instanceof Error && 
           'statusCode' in error && 
           typeof (error as Error & { statusCode?: number }).statusCode === 'number' &&
           (error as Error & { statusCode?: number }).statusCode! >= 500
  },

  /**
   * 클라이언트 에러인지 확인 (4xx)
   */
  isClientError(error: unknown): boolean {
    return error instanceof Error && 
           'statusCode' in error && 
           typeof (error as Error & { statusCode?: number }).statusCode === 'number' &&
           (error as Error & { statusCode?: number }).statusCode! >= 400 && 
           (error as Error & { statusCode?: number }).statusCode! < 500
  },

  /**
   * 에러에서 사용자 친화적 메시지 추출
   */
  getUserMessage(error: unknown): string {
    // API 에러인 경우 상태 코드 기반 메시지 우선
    if (error instanceof Error && 'statusCode' in error) {
      const statusCode = (error as Error & { statusCode: number }).statusCode
      if (typeof statusCode === 'number') {
        const standardMessage = getErrorMessage(statusCode)
        // 표준 메시지가 아닌 커스텀 메시지가 있다면 그것을 사용
        return error.message !== standardMessage ? error.message : standardMessage
      }
    }
    
    // 비즈니스 에러 코드가 있는 경우
    if (error instanceof Error && 'code' in error) {
      const errorCode = (error as Error & { code: string }).code
      if (typeof errorCode === 'string') {
        return getBusinessErrorMessage(errorCode)
      }
    }
    
    // 일반 에러인 경우 메시지 검증 후 반환
    if (error instanceof Error) {
      // 빈 메시지나 기술적인 메시지는 표준 메시지로 대체
      const message = error.message.trim()
      if (!message || message.includes('fetch') || message.includes('network')) {
        return COMMON_ERROR_MESSAGES.NETWORK_ERROR
      }
      return message
    }
    
    // 문자열 에러인 경우
    if (typeof error === 'string') {
      return error.trim() || COMMON_ERROR_MESSAGES.UNKNOWN_ERROR
    }
    
    return COMMON_ERROR_MESSAGES.UNKNOWN_ERROR
  },

  /**
   * 에러를 로깅용 객체로 변환
   */
  toLogObject(error: unknown): Record<string, unknown> {
    if (error instanceof Error && 'statusCode' in error && 'toJSON' in error) {
      return (error as Error & { toJSON: () => Record<string, unknown> }).toJSON()
    }
    
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    }
    
    return {
      error: String(error)
    }
  }
}

// 레거시 호환성을 위한 기본 export
export default {
  ...ErrorUtils
}