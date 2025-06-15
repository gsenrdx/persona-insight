/**
 * API 관련 에러 클래스들
 */

import { ErrorResponse } from '@/types/api'

/**
 * 기본 API 에러 클래스
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: ErrorResponse,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'ApiError'
    
    // Error 클래스의 스택 트레이스 보정
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }
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
    return this.statusCode >= 500
  }

  /**
   * 네트워크 에러인지 확인
   */
  isNetworkError(): boolean {
    return this.statusCode === 0
  }

  /**
   * JSON 형태로 직렬화
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      response: this.response,
      context: this.context,
      stack: this.stack
    }
  }
}

/**
 * 네트워크 연결 에러
 */
export class NetworkError extends ApiError {
  constructor(message = '네트워크 연결에 실패했습니다', context?: Record<string, any>) {
    super(message, 0, undefined, context)
    this.name = 'NetworkError'
  }
}

/**
 * 타임아웃 에러
 */
export class TimeoutError extends ApiError {
  constructor(message = '요청 시간이 초과되었습니다', context?: Record<string, any>) {
    super(message, 408, undefined, context)
    this.name = 'TimeoutError'
  }
}

/**
 * 서버 내부 에러 (5xx)
 */
export class ServerError extends ApiError {
  constructor(
    message = '서버에서 오류가 발생했습니다',
    statusCode = 500,
    response?: ErrorResponse,
    context?: Record<string, any>
  ) {
    super(message, statusCode, response, context)
    this.name = 'ServerError'
  }
}

/**
 * 클라이언트 에러 (4xx)
 */
export class ClientError extends ApiError {
  constructor(
    message: string,
    statusCode: number,
    response?: ErrorResponse,
    context?: Record<string, any>
  ) {
    super(message, statusCode, response, context)
    this.name = 'ClientError'
  }
}

/**
 * Not Found 에러 (404)
 */
export class NotFoundError extends ClientError {
  constructor(resource = '리소스', context?: Record<string, any>) {
    super(`${resource}를 찾을 수 없습니다`, 404, undefined, context)
    this.name = 'NotFoundError'
  }
}

/**
 * Forbidden 에러 (403)
 */
export class ForbiddenError extends ClientError {
  constructor(message = '접근 권한이 없습니다', context?: Record<string, any>) {
    super(message, 403, undefined, context)
    this.name = 'ForbiddenError'
  }
}

/**
 * 잘못된 요청 에러 (400)
 */
export class BadRequestError extends ClientError {
  constructor(message = '잘못된 요청입니다', context?: Record<string, any>) {
    super(message, 400, undefined, context)
    this.name = 'BadRequestError'
  }
}

/**
 * 충돌 에러 (409)
 */
export class ConflictError extends ClientError {
  constructor(message = '리소스 충돌이 발생했습니다', context?: Record<string, any>) {
    super(message, 409, undefined, context)
    this.name = 'ConflictError'
  }
}

/**
 * Rate Limit 에러 (429)
 */
export class RateLimitError extends ClientError {
  constructor(message = '요청 횟수를 초과했습니다', context?: Record<string, any>) {
    super(message, 429, undefined, context)
    this.name = 'RateLimitError'
  }
}