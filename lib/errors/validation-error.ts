/**
 * 유효성 검증 관련 에러 클래스들
 */

import { ApiError } from './api-error'

/**
 * 유효성 검증 에러 정보
 */
export interface ValidationErrorDetail {
  field: string
  message: string
  value?: any
  code?: string
}

/**
 * 기본 유효성 검증 에러 클래스
 */
export class ValidationError extends ApiError {
  public errors: ValidationErrorDetail[]

  constructor(
    message: string,
    errors: ValidationErrorDetail[] = [],
    context?: Record<string, any>
  ) {
    super(message, 400, undefined, context)
    this.name = 'ValidationError'
    this.errors = errors
  }

  /**
   * 특정 필드의 에러 가져오기
   */
  getFieldError(field: string): ValidationErrorDetail | undefined {
    return this.errors.find(error => error.field === field)
  }

  /**
   * 모든 필드의 에러 메시지 가져오기
   */
  getErrorMessages(): string[] {
    return this.errors.map(error => error.message)
  }

  /**
   * 특정 필드의 에러 메시지 가져오기
   */
  getFieldErrorMessage(field: string): string | undefined {
    return this.getFieldError(field)?.message
  }

  /**
   * JSON 형태로 직렬화
   */
  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors
    }
  }
}

/**
 * 필수 필드 누락 에러
 */
export class RequiredFieldError extends ValidationError {
  constructor(field: string, context?: Record<string, any>) {
    const message = `${field} 필드는 필수입니다`
    const errors = [{ field, message, code: 'REQUIRED' }]
    super(message, errors, context)
    this.name = 'RequiredFieldError'
  }
}

/**
 * 잘못된 형식 에러
 */
export class InvalidFormatError extends ValidationError {
  constructor(
    field: string,
    format: string,
    value?: any,
    context?: Record<string, any>
  ) {
    const message = `${field} 필드의 형식이 올바르지 않습니다 (expected: ${format})`
    const errors = [{ field, message, value, code: 'INVALID_FORMAT' }]
    super(message, errors, context)
    this.name = 'InvalidFormatError'
  }
}

/**
 * 이메일 형식 에러
 */
export class InvalidEmailError extends InvalidFormatError {
  constructor(email?: string, context?: Record<string, any>) {
    super('이메일', 'example@domain.com', email, context)
    this.name = 'InvalidEmailError'
  }
}

/**
 * 비밀번호 형식 에러
 */
export class InvalidPasswordError extends ValidationError {
  constructor(
    requirements: string[] = ['6자 이상'],
    context?: Record<string, any>
  ) {
    const message = `비밀번호가 요구사항을 만족하지 않습니다: ${requirements.join(', ')}`
    const errors = [{ 
      field: 'password', 
      message, 
      code: 'INVALID_PASSWORD_FORMAT'
    }]
    super(message, errors, context)
    this.name = 'InvalidPasswordError'
  }
}

/**
 * 길이 제한 에러
 */
export class LengthValidationError extends ValidationError {
  constructor(
    field: string,
    actualLength: number,
    minLength?: number,
    maxLength?: number,
    context?: Record<string, any>
  ) {
    let message = `${field} 필드의 길이가 올바르지 않습니다`
    
    if (minLength !== undefined && actualLength < minLength) {
      message += ` (최소 ${minLength}자 필요)`
    }
    if (maxLength !== undefined && actualLength > maxLength) {
      message += ` (최대 ${maxLength}자 허용)`
    }

    const errors = [{ 
      field, 
      message, 
      value: actualLength,
      code: 'INVALID_LENGTH'
    }]
    super(message, errors, context)
    this.name = 'LengthValidationError'
  }
}

/**
 * 범위 벗어남 에러
 */
export class RangeValidationError extends ValidationError {
  constructor(
    field: string,
    value: number,
    min?: number,
    max?: number,
    context?: Record<string, any>
  ) {
    let message = `${field} 필드의 값이 유효한 범위를 벗어났습니다`
    
    if (min !== undefined && value < min) {
      message += ` (최소값: ${min})`
    }
    if (max !== undefined && value > max) {
      message += ` (최대값: ${max})`
    }

    const errors = [{ 
      field, 
      message, 
      value,
      code: 'OUT_OF_RANGE'
    }]
    super(message, errors, context)
    this.name = 'RangeValidationError'
  }
}

/**
 * 파일 유효성 검증 에러
 */
export class FileValidationError extends ValidationError {
  constructor(
    field: string,
    reason: string,
    fileName?: string,
    context?: Record<string, any>
  ) {
    const message = `파일 "${fileName || field}"이(가) 유효하지 않습니다: ${reason}`
    const errors = [{ 
      field, 
      message, 
      value: fileName,
      code: 'INVALID_FILE'
    }]
    super(message, errors, context)
    this.name = 'FileValidationError'
  }
}

/**
 * 파일 크기 초과 에러
 */
export class FileSizeError extends FileValidationError {
  constructor(
    fileName: string,
    actualSize: number,
    maxSize: number,
    context?: Record<string, any>
  ) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024) * 100) / 100
    const reason = `파일 크기가 너무 큽니다 (최대 ${maxSizeMB}MB)`
    super('file', reason, fileName, { ...context, actualSize, maxSize })
    this.name = 'FileSizeError'
  }
}

/**
 * 지원하지 않는 파일 형식 에러
 */
export class UnsupportedFileTypeError extends FileValidationError {
  constructor(
    fileName: string,
    fileType: string,
    allowedTypes: string[],
    context?: Record<string, any>
  ) {
    const reason = `지원하지 않는 파일 형식입니다 (허용: ${allowedTypes.join(', ')})`
    super('file', reason, fileName, { ...context, fileType, allowedTypes })
    this.name = 'UnsupportedFileTypeError'
  }
}

/**
 * 중복 값 에러
 */
export class DuplicateValueError extends ValidationError {
  constructor(
    field: string,
    value: any,
    context?: Record<string, any>
  ) {
    const message = `${field} 값이 이미 존재합니다`
    const errors = [{ 
      field, 
      message, 
      value,
      code: 'DUPLICATE_VALUE'
    }]
    super(message, errors, context)
    this.name = 'DuplicateValueError'
  }
}

/**
 * 외래 키 제약 위반 에러
 */
export class ForeignKeyError extends ValidationError {
  constructor(
    field: string,
    referencedTable: string,
    value: any,
    context?: Record<string, any>
  ) {
    const message = `${field}에서 참조하는 ${referencedTable}이(가) 존재하지 않습니다`
    const errors = [{ 
      field, 
      message, 
      value,
      code: 'FOREIGN_KEY_VIOLATION'
    }]
    super(message, errors, context)
    this.name = 'ForeignKeyError'
  }
}