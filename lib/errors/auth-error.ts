/**
 * 인증 관련 에러 클래스들
 */

import { ApiError } from './api-error'

/**
 * 기본 인증 에러 클래스
 */
export class AuthError extends ApiError {
  constructor(
    message: string,
    statusCode = 401,
    context?: Record<string, any>
  ) {
    super(message, statusCode, undefined, context)
    this.name = 'AuthError'
  }
}

/**
 * 인증되지 않은 사용자 에러 (401)
 */
export class UnauthenticatedError extends AuthError {
  constructor(message = '로그인이 필요합니다', context?: Record<string, any>) {
    super(message, 401, context)
    this.name = 'UnauthenticatedError'
  }
}

/**
 * 잘못된 인증 정보 에러
 */
export class InvalidCredentialsError extends AuthError {
  constructor(message = '이메일 또는 비밀번호가 올바르지 않습니다', context?: Record<string, any>) {
    super(message, 401, context)
    this.name = 'InvalidCredentialsError'
  }
}

/**
 * 토큰 만료 에러
 */
export class TokenExpiredError extends AuthError {
  constructor(message = '인증 토큰이 만료되었습니다', context?: Record<string, any>) {
    super(message, 401, context)
    this.name = 'TokenExpiredError'
  }
}

/**
 * 잘못된 토큰 에러
 */
export class InvalidTokenError extends AuthError {
  constructor(message = '유효하지 않은 인증 토큰입니다', context?: Record<string, any>) {
    super(message, 401, context)
    this.name = 'InvalidTokenError'
  }
}

/**
 * 토큰 누락 에러
 */
export class MissingTokenError extends AuthError {
  constructor(message = '인증 토큰이 없습니다', context?: Record<string, any>) {
    super(message, 401, context)
    this.name = 'MissingTokenError'
  }
}

/**
 * 세션 만료 에러
 */
export class SessionExpiredError extends AuthError {
  constructor(message = '세션이 만료되었습니다. 다시 로그인해주세요', context?: Record<string, any>) {
    super(message, 401, context)
    this.name = 'SessionExpiredError'
  }
}

/**
 * 계정 비활성화 에러
 */
export class AccountDisabledError extends AuthError {
  constructor(message = '비활성화된 계정입니다', context?: Record<string, any>) {
    super(message, 403, context)
    this.name = 'AccountDisabledError'
  }
}

/**
 * 이메일 미인증 에러
 */
export class EmailNotVerifiedError extends AuthError {
  constructor(message = '이메일 인증이 필요합니다', context?: Record<string, any>) {
    super(message, 403, context)
    this.name = 'EmailNotVerifiedError'
  }
}

/**
 * 권한 부족 에러 (403)
 */
export class InsufficientPermissionsError extends AuthError {
  constructor(message = '권한이 부족합니다', context?: Record<string, any>) {
    super(message, 403, context)
    this.name = 'InsufficientPermissionsError'
  }
}

/**
 * 회사 접근 권한 없음 에러
 */
export class CompanyAccessError extends AuthError {
  constructor(message = '회사 접근 권한이 없습니다', context?: Record<string, any>) {
    super(message, 403, context)
    this.name = 'CompanyAccessError'
  }
}

/**
 * 프로젝트 접근 권한 없음 에러
 */
export class ProjectAccessError extends AuthError {
  constructor(message = '프로젝트 접근 권한이 없습니다', context?: Record<string, any>) {
    super(message, 403, context)
    this.name = 'ProjectAccessError'
  }
}

/**
 * 역할 권한 부족 에러
 */
export class RolePermissionError extends AuthError {
  constructor(
    requiredRole: string,
    message = `${requiredRole} 권한이 필요합니다`,
    context?: Record<string, any>
  ) {
    super(message, 403, { ...context, requiredRole })
    this.name = 'RolePermissionError'
  }
}

/**
 * 중복 가입 시도 에러
 */
export class DuplicateAccountError extends AuthError {
  constructor(message = '이미 가입된 이메일입니다', context?: Record<string, any>) {
    super(message, 409, context)
    this.name = 'DuplicateAccountError'
  }
}

/**
 * 비밀번호 정책 위반 에러
 */
export class PasswordPolicyError extends AuthError {
  constructor(message = '비밀번호가 정책에 맞지 않습니다', context?: Record<string, any>) {
    super(message, 400, context)
    this.name = 'PasswordPolicyError'
  }
}