/**
 * API 및 환경 관련 설정
 */

/**
 * API 요청 관련 설정
 */
export const API_CONFIG = {
  /** 기본 요청 타임아웃 (30초) */
  DEFAULT_TIMEOUT: 30 * 1000,
  
  /** 긴 요청 타임아웃 (5분) */
  LONG_TIMEOUT: 5 * 60 * 1000,
  
  /** 재시도 최대 횟수 */
  MAX_RETRIES: 3,
  
  /** 재시도 지연 시간 (ms) */
  RETRY_DELAY: 1000,
  
  /** Rate limit 설정 */
  RATE_LIMIT: {
    /** 분당 최대 요청 수 */
    REQUESTS_PER_MINUTE: 100,
    /** 초당 최대 요청 수 */
    REQUESTS_PER_SECOND: 10,
  } as const,
  
  /** 기본 헤더 */
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  } as const,
} as const

/**
 * 보안 관련 설정
 */
export const SECURITY_CONFIG = {
  /** 세션 만료 시간 (24시간) */
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000,
  
  /** 토큰 갱신 임계값 (1시간) */
  TOKEN_REFRESH_THRESHOLD: 60 * 60 * 1000,
  
  /** 비밀번호 최소 길이 */
  MIN_PASSWORD_LENGTH: 8,
  
  /** 비밀번호 최대 길이 */
  MAX_PASSWORD_LENGTH: 128,
  
  /** 로그인 시도 제한 */
  MAX_LOGIN_ATTEMPTS: 5,
  
  /** 로그인 시도 제한 시간 (15분) */
  LOGIN_ATTEMPT_TIMEOUT: 15 * 60 * 1000,
  
  /** CSRF 토큰 유효 시간 (1시간) */
  CSRF_TOKEN_TTL: 60 * 60 * 1000,
} as const

/**
 * 환경별 설정
 */
export const ENV_CONFIG = {
  /** 개발 모드 여부 */
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  
  /** 프로덕션 모드 여부 */
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  /** 테스트 모드 여부 */
  IS_TEST: process.env.NODE_ENV === 'test',
  
  /** 기본 베이스 URL */
  DEFAULT_BASE_URL: 'http://localhost:3000',
  
  /** API 베이스 URL */
  API_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  
  /** MISO API URL */
  MISO_API_URL: process.env.MISO_API_URL || 'https://api.holdings.miso.gs',
  
  /** Supabase URL */
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  
  /** 디버그 모드 */
  DEBUG_MODE: process.env.NODE_ENV === 'development' && process.env.DEBUG === 'true',
} as const