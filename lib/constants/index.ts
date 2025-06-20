/**
 * 상수 관리 시스템 중앙 진입점
 * 
 * 모든 상수들을 카테고리별로 체계적으로 관리하고
 * 일관된 접근 방식을 제공합니다.
 */

// =============================================================================
// 개별 상수 모듈 import
// =============================================================================

import * as ApiConstants from './api'
import * as RouteConstants from './routes'
import * as MessageConstants from './messages'
import * as ConfigConstants from '../config'

// =============================================================================
// 개별 상수 모듈 re-export
// =============================================================================

// API 엔드포인트 상수
export const {
  API_BASE,
  PROJECT_ENDPOINTS,
  PERSONA_ENDPOINTS,
  INTERVIEW_ENDPOINTS,
  CHAT_ENDPOINTS,
  WORKFLOW_ENDPOINTS,
  FILE_ENDPOINTS,
  INSIGHT_ENDPOINTS,
  AUTH_ENDPOINTS,
  MISO_ENDPOINTS,
  API_ENDPOINTS,
  createApiEndpoint,
  createUrlWithParams,
  replaceRouteParams,
  // 레거시 호환성
  ENDPOINTS,
} = ApiConstants

// 라우트 경로 상수
export const {
  MAIN_ROUTES,
  AUTH_ROUTES,
  PROJECT_ROUTES,
  CHAT_ROUTES,
  PERSONA_ROUTES,
  INTERVIEW_ROUTES,
  SETTINGS_ROUTES,
  ERROR_ROUTES,
  EXTERNAL_LINKS,
  NAVIGATION_ITEMS,
  USER_MENU_ITEMS,
  ROUTES,
  createRoute,
  createRouteWithQuery,
  isCurrentRoute,
  createBreadcrumbs,
  isRouteAuthorized,
  // 레거시 호환성
  PATHS,
} = RouteConstants

// UI 메시지 상수
export const {
  COMMON_ERROR_MESSAGES,
  AUTH_ERROR_MESSAGES,
  VALIDATION_ERROR_MESSAGES,
  BUSINESS_ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  BUTTON_MESSAGES,
  PLACEHOLDER_MESSAGES,
  CONFIRMATION_MESSAGES,
  INFO_MESSAGES,
  STATUS_MESSAGES,
  HELP_MESSAGES,
  getErrorMessage,
  getBusinessErrorMessage,
  getValidationMessage,
} = MessageConstants

// 애플리케이션 설정 상수
export const {
  FILE_UPLOAD_CONFIG,
  PAGINATION_CONFIG,
  WORKFLOW_CONFIG,
  SEARCH_CONFIG,
  CHAT_CONFIG,
  CACHE_CONFIG,
  UI_CONFIG,
  API_CONFIG,
  SECURITY_CONFIG,
  ENV_CONFIG,
  CONFIG,
  DEFAULT_EXTRACTION_CRITERIA,
  DEFAULT_PERSONA_TYPES,
} = ConfigConstants

// =============================================================================
// 통합 상수 객체
// =============================================================================

/**
 * 모든 상수들을 하나의 객체로 통합
 * 네임스페이스 방식으로 접근 가능
 */
export const CONSTANTS = {
  /** API 엔드포인트들 */
  API: {
    BASE: API_BASE,
    ENDPOINTS: API_ENDPOINTS,
    // 레거시 호환성
    LEGACY: ENDPOINTS,
  },
  
  /** 라우트 경로들 */
  ROUTES: {
    MAIN: MAIN_ROUTES,
    AUTH: AUTH_ROUTES,
    PROJECT: PROJECT_ROUTES,
    CHAT: CHAT_ROUTES,
    PERSONA: PERSONA_ROUTES,
    INTERVIEW: INTERVIEW_ROUTES,
    SETTINGS: SETTINGS_ROUTES,
    ERROR: ERROR_ROUTES,
    EXTERNAL: EXTERNAL_LINKS,
  },
  
  /** UI 메시지들 */
  MESSAGES: {
    ERROR: {
      COMMON: COMMON_ERROR_MESSAGES,
      AUTH: AUTH_ERROR_MESSAGES,
      VALIDATION: VALIDATION_ERROR_MESSAGES,
      BUSINESS: BUSINESS_ERROR_MESSAGES,
    },
    SUCCESS: SUCCESS_MESSAGES,
    UI: {
      BUTTON: BUTTON_MESSAGES,
      PLACEHOLDER: PLACEHOLDER_MESSAGES,
      CONFIRMATION: CONFIRMATION_MESSAGES,
      INFO: INFO_MESSAGES,
      STATUS: STATUS_MESSAGES,
      HELP: HELP_MESSAGES,
    },
  },
  
  /** 설정값들 */
  CONFIG: {
    FILE_UPLOAD: FILE_UPLOAD_CONFIG,
    PAGINATION: PAGINATION_CONFIG,
    WORKFLOW: WORKFLOW_CONFIG,
    SEARCH: SEARCH_CONFIG,
    CHAT: CHAT_CONFIG,
    CACHE: CACHE_CONFIG,
    UI: UI_CONFIG,
    API: API_CONFIG,
    SECURITY: SECURITY_CONFIG,
    ENV: ENV_CONFIG,
  },
  
  /** 기본값들 */
  DEFAULTS: {
    EXTRACTION_CRITERIA: DEFAULT_EXTRACTION_CRITERIA,
    PERSONA_TYPES: DEFAULT_PERSONA_TYPES,
  },
} as const

// =============================================================================
// 편의 함수들
// =============================================================================

/**
 * 자주 사용되는 상수들에 대한 편의 접근자
 */
export const QUICK_ACCESS = {
  /** 자주 사용하는 API 엔드포인트들 */
  API: {
    PROJECTS: API_ENDPOINTS.PROJECT.LIST,
    PERSONAS: API_ENDPOINTS.PERSONA.LIST,
    INTERVIEWS: API_ENDPOINTS.INTERVIEW.LIST,
    CHAT: API_ENDPOINTS.CHAT.SEND,
  },
  
  /** 자주 사용하는 라우트들 */
  ROUTES: {
    HOME: MAIN_ROUTES.HOME,
    LOGIN: AUTH_ROUTES.LOGIN,
    PROJECTS: MAIN_ROUTES.PROJECTS,
    INSIGHTS: MAIN_ROUTES.INSIGHTS,
  },
  
  /** 자주 사용하는 메시지들 */
  MESSAGES: {
    LOADING: BUTTON_MESSAGES.LOADING,
    SAVE: BUTTON_MESSAGES.SAVE,
    CANCEL: BUTTON_MESSAGES.CANCEL,
    ERROR: COMMON_ERROR_MESSAGES.UNKNOWN_ERROR,
    SUCCESS: SUCCESS_MESSAGES.SAVED,
  },
  
  /** 자주 사용하는 설정값들 */
  CONFIG: {
    PAGE_SIZE: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
    MAX_FILE_SIZE: FILE_UPLOAD_CONFIG.MAX_FILE_SIZE,
    DEBOUNCE_DELAY: SEARCH_CONFIG.DEBOUNCE_DELAY,
    CACHE_TIME: CACHE_CONFIG.DEFAULT_CACHE_TIME,
  },
} as const

// =============================================================================
// 유틸리티 함수들
// =============================================================================

/**
 * 상수 값 검증 함수
 */
export const validateConstants = () => {
  const errors: string[] = []
  
  // 필수 환경 변수 체크
  if (!ENV_CONFIG.SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required')
  }
  
  // 파일 크기 제한 체크
  if (FILE_UPLOAD_CONFIG.MAX_FILE_SIZE <= 0) {
    errors.push('MAX_FILE_SIZE must be positive')
  }
  
  // 페이지 크기 체크
  if (PAGINATION_CONFIG.DEFAULT_PAGE_SIZE <= 0) {
    errors.push('DEFAULT_PAGE_SIZE must be positive')
  }
  
  return errors
}

/**
 * 개발 모드에서 상수 정보 출력
 */
export const debugConstants = () => {
  if (!ENV_CONFIG.IS_DEVELOPMENT) return
  
  console.group('🔧 Constants Debug Info')
  console.log('Environment:', ENV_CONFIG.IS_PRODUCTION ? 'Production' : 'Development')
  console.log('API Base URL:', ENV_CONFIG.API_BASE_URL)
  console.log('File Upload Limit:', `${FILE_UPLOAD_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`)
  console.log('Default Page Size:', PAGINATION_CONFIG.DEFAULT_PAGE_SIZE)
  console.log('Max Concurrent Jobs:', WORKFLOW_CONFIG.MAX_CONCURRENT_JOBS)
  
  const validationErrors = validateConstants()
  if (validationErrors.length > 0) {
    console.warn('Validation Errors:', validationErrors)
  } else {
    console.log('✅ All constants validated successfully')
  }
  console.groupEnd()
}

/**
 * 상수 사용 통계 (개발용)
 */
export const getConstantsStats = () => {
  return {
    totalApiEndpoints: Object.keys(API_ENDPOINTS).reduce(
      (count, category) => count + Object.keys(API_ENDPOINTS[category as keyof typeof API_ENDPOINTS]).length,
      0
    ),
    totalRoutes: Object.keys(ROUTES).reduce(
      (count, category) => count + Object.keys(ROUTES[category as keyof typeof ROUTES]).length,
      0
    ),
    totalMessages: Object.keys(CONSTANTS.MESSAGES).reduce(
      (count, category) => count + Object.keys(CONSTANTS.MESSAGES[category as keyof typeof CONSTANTS.MESSAGES]).length,
      0
    ),
    totalConfigs: Object.keys(CONFIG).length,
  }
}

// =============================================================================
// 타입 정의
// =============================================================================

/**
 * 상수 카테고리 타입
 */
export type ConstantsCategory = keyof typeof CONSTANTS

/**
 * API 엔드포인트 카테고리 타입
 */
export type ApiEndpointCategory = keyof typeof API_ENDPOINTS

/**
 * 라우트 카테고리 타입
 */
export type RouteCategory = keyof typeof ROUTES

/**
 * 메시지 카테고리 타입
 */
export type MessageCategory = keyof typeof CONSTANTS.MESSAGES

/**
 * 설정 카테고리 타입
 */
export type ConfigCategory = keyof typeof CONFIG

// =============================================================================
// 개발 모드 초기화
// =============================================================================

// 개발 모드에서 상수 검증 및 디버그 정보 출력
if (typeof window !== 'undefined' && ENV_CONFIG.IS_DEVELOPMENT) {
  debugConstants()
}

// =============================================================================
// 레거시 호환성 (점진적 마이그레이션용)
// =============================================================================

/**
 * 기존 코드와의 호환성을 위한 개별 export
 * @deprecated CONSTANTS 또는 개별 모듈을 직접 import하세요
 */
export const LEGACY_CONSTANTS = {
  // API 엔드포인트 (레거시)
  API_ENDPOINTS: ENDPOINTS,
  
  // 라우트 (레거시)
  PATHS: PATHS,
  
  // 에러 메시지 (레거시)
  ERROR_MESSAGES: COMMON_ERROR_MESSAGES,
  
  // 기본 설정 (레거시)
  DEFAULT_PAGE_SIZE: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
  MAX_FILE_SIZE: FILE_UPLOAD_CONFIG.MAX_FILE_SIZE,
} as const