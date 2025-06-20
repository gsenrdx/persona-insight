import { formatFileSize } from './format'

/**
 * 파일 검증 옵션
 */
export interface FileValidationOptions {
  maxSize?: number // bytes
  allowedTypes?: string[]
  maxFiles?: number
}

/**
 * 기본 파일 검증 설정
 */
export const DEFAULT_FILE_VALIDATION: FileValidationOptions = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'text/plain', 'text/markdown', 'text/mdx', 'text/x-markdown',
    'application/pdf', 'text/html', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'text/csv',
    'message/rfc822', 'application/vnd.ms-outlook',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', 
    'application/vnd.ms-powerpoint',
    'application/xml', 'application/epub+zip'
  ],
  maxFiles: 10
}

/**
 * 파일 유효성 검사 결과
 */
export interface FileValidationResult {
  isValid: boolean
  error?: string
  details?: {
    size?: string
    type?: string
    count?: string
  }
}

/**
 * 단일 파일 검증
 */
export function validateFile(file: File, options: FileValidationOptions = DEFAULT_FILE_VALIDATION): FileValidationResult {
  // 파일 크기 검증
  if (options.maxSize && file.size > options.maxSize) {
    return {
      isValid: false,
      error: `파일 크기가 너무 큽니다. 최대 ${formatFileSize(options.maxSize)}까지 업로드 가능합니다.`,
      details: { size: formatFileSize(file.size) }
    }
  }

  // 파일 타입 검증
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: '지원하지 않는 파일 형식입니다.',
      details: { type: file.type }
    }
  }

  return { isValid: true }
}

/**
 * 여러 파일 검증
 */
export function validateFiles(files: File[], options: FileValidationOptions = DEFAULT_FILE_VALIDATION): FileValidationResult {
  // 파일 개수 검증
  if (options.maxFiles && files.length > options.maxFiles) {
    return {
      isValid: false,
      error: `파일 개수가 너무 많습니다. 최대 ${options.maxFiles}개까지 업로드 가능합니다.`,
      details: { count: files.length.toString() }
    }
  }

  // 각 파일 개별 검증
  for (const file of files) {
    const result = validateFile(file, options)
    if (!result.isValid) {
      return result
    }
  }

  return { isValid: true }
}

/**
 * 이메일 주소 검증
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * URL 검증
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 한국 전화번호 검증
 */
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

/**
 * 비밀번호 강도 검증
 */
export interface PasswordValidationResult {
  isValid: boolean
  strength: 'weak' | 'medium' | 'strong'
  issues: string[]
}

export function validatePassword(password: string): PasswordValidationResult {
  const issues: string[] = []
  let score = 0

  if (password.length < 8) {
    issues.push('8자 이상이어야 합니다')
  } else {
    score += 1
  }

  if (!/[a-z]/.test(password)) {
    issues.push('소문자를 포함해야 합니다')
  } else {
    score += 1
  }

  if (!/[A-Z]/.test(password)) {
    issues.push('대문자를 포함해야 합니다')
  } else {
    score += 1
  }

  if (!/[0-9]/.test(password)) {
    issues.push('숫자를 포함해야 합니다')
  } else {
    score += 1
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    issues.push('특수문자를 포함해야 합니다')
  } else {
    score += 1
  }

  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  if (score >= 4) strength = 'strong'
  else if (score >= 2) strength = 'medium'

  return {
    isValid: issues.length === 0,
    strength,
    issues
  }
}

// formatFileSize는 ./format.ts에서 import