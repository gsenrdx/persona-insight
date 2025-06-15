/**
 * 애플리케이션 설정 상수
 * 파일 업로드, 페이지네이션, 워크플로우 등의 설정값들을 중앙 관리
 */

// =============================================================================
// 파일 업로드 설정
// =============================================================================

/**
 * 파일 업로드 제한 및 설정
 */
export const FILE_UPLOAD_CONFIG = {
  /** 최대 파일 크기 (10MB) */
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  
  /** 한 번에 업로드 가능한 최대 파일 수 */
  MAX_FILES_COUNT: 20,
  
  /** 지원하는 MIME 타입들 */
  SUPPORTED_MIME_TYPES: [
    // 텍스트 파일
    'text/plain',
    'text/markdown',
    'text/csv',
    
    // 문서 파일
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // 압축 파일
    'application/zip',
    'application/x-rar-compressed',
    
    // 오디오 파일
    'audio/mpeg',
    'audio/wav',
    'audio/x-m4a',
    'audio/mp4',
    'audio/webm',
    
    // 비디오 파일
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ] as const,
  
  /** 지원하는 파일 확장자들 */
  SUPPORTED_EXTENSIONS: [
    // 텍스트
    '.txt', '.md', '.csv',
    
    // 문서
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    
    // 압축
    '.zip', '.rar',
    
    // 오디오
    '.mp3', '.wav', '.m4a', '.aac', '.webm',
    
    // 비디오
    '.mp4', '.webm', '.mov',
  ] as const,
  
  /** 업로드 청크 크기 (1MB) */
  CHUNK_SIZE: 1024 * 1024,
  
  /** 업로드 타임아웃 (5분) */
  UPLOAD_TIMEOUT: 5 * 60 * 1000,
} as const

// =============================================================================
// 페이지네이션 설정
// =============================================================================

/**
 * 페이지네이션 기본값들
 */
export const PAGINATION_CONFIG = {
  /** 기본 페이지 크기 */
  DEFAULT_PAGE_SIZE: 20,
  
  /** 작은 페이지 크기 (미리보기 등) */
  SMALL_PAGE_SIZE: 10,
  
  /** 큰 페이지 크기 (대량 데이터) */
  LARGE_PAGE_SIZE: 50,
  
  /** 최대 페이지 크기 */
  MAX_PAGE_SIZE: 100,
  
  /** 페이지 선택 옵션들 */
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100] as const,
  
  /** 시작 페이지 번호 */
  FIRST_PAGE: 1,
} as const

// =============================================================================
// 워크플로우 설정
// =============================================================================

/**
 * 워크플로우 처리 관련 설정
 */
export const WORKFLOW_CONFIG = {
  /** 동시 처리 가능한 최대 작업 수 */
  MAX_CONCURRENT_JOBS: 5,
  
  /** 작업 상태 확인 간격 (초) */
  STATUS_CHECK_INTERVAL: 3,
  
  /** 작업 타임아웃 (30분) */
  JOB_TIMEOUT: 30 * 60 * 1000,
  
  /** 재시도 최대 횟수 */
  MAX_RETRY_ATTEMPTS: 3,
  
  /** 재시도 지연 시간 (초) */
  RETRY_DELAY: 5,
  
  /** 워크플로우 상태 */
  STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    PERSONA_SYNTHESIZING: 'persona_synthesizing',
  } as const,
  
  /** 로컬 스토리지 키 */
  STORAGE_KEY: 'workflow_queue_jobs',
} as const

// =============================================================================
// 검색 및 필터링 설정
// =============================================================================

/**
 * 검색 관련 설정
 */
export const SEARCH_CONFIG = {
  /** 검색어 최소 길이 */
  MIN_SEARCH_LENGTH: 2,
  
  /** 검색어 최대 길이 */
  MAX_SEARCH_LENGTH: 100,
  
  /** 검색 디바운스 지연 시간 (ms) */
  DEBOUNCE_DELAY: 300,
  
  /** 검색 결과 최대 개수 */
  MAX_SEARCH_RESULTS: 50,
  
  /** 최근 검색어 저장 개수 */
  MAX_RECENT_SEARCHES: 10,
  
  /** 인기 검색어 개수 */
  POPULAR_SEARCHES_COUNT: 5,
} as const

// =============================================================================
// 채팅 설정
// =============================================================================

/**
 * 채팅 관련 설정
 */
export const CHAT_CONFIG = {
  /** 메시지 최대 길이 */
  MAX_MESSAGE_LENGTH: 2000,
  
  /** 채팅 기록 로드 개수 */
  MESSAGES_PER_PAGE: 50,
  
  /** 자동 스크롤 임계값 */
  AUTO_SCROLL_THRESHOLD: 100,
  
  /** 타이핑 인디케이터 표시 시간 (ms) */
  TYPING_INDICATOR_DURATION: 2000,
  
  /** 메시지 전송 쿨다운 (ms) */
  MESSAGE_COOLDOWN: 1000,
  
  /** 연결 타임아웃 (초) */
  CONNECTION_TIMEOUT: 30,
  
  /** 재연결 시도 간격 (초) */
  RECONNECT_INTERVAL: 5,
  
  /** 최대 재연결 시도 횟수 */
  MAX_RECONNECT_ATTEMPTS: 5,
} as const

// =============================================================================
// 캐시 설정
// =============================================================================

/**
 * 캐시 관련 설정
 */
export const CACHE_CONFIG = {
  /** React Query 기본 stale time (5분) */
  DEFAULT_STALE_TIME: 5 * 60 * 1000,
  
  /** React Query 기본 cache time (10분) */
  DEFAULT_CACHE_TIME: 10 * 60 * 1000,
  
  /** 긴 캐시 시간 (1시간) */
  LONG_CACHE_TIME: 60 * 60 * 1000,
  
  /** 짧은 캐시 시간 (1분) */
  SHORT_CACHE_TIME: 60 * 1000,
  
  /** 로컬 스토리지 만료 시간 (1일) */
  LOCAL_STORAGE_TTL: 24 * 60 * 60 * 1000,
  
  /** 세션 스토리지 키들 */
  STORAGE_KEYS: {
    USER_PREFERENCES: 'user_preferences',
    RECENT_PROJECTS: 'recent_projects',
    DRAFT_MESSAGES: 'draft_messages',
    WORKFLOW_QUEUE: 'workflow_queue_jobs',
    SIDEBAR_STATE: 'sidebar_state',
  } as const,
} as const

// =============================================================================
// UI 설정
// =============================================================================

/**
 * UI 관련 설정
 */
export const UI_CONFIG = {
  /** 토스트 알림 표시 시간 (ms) */
  TOAST_DURATION: 5000,
  
  /** 로딩 스피너 최소 표시 시간 (ms) */
  MIN_LOADING_TIME: 500,
  
  /** 애니메이션 지속 시간 (ms) */
  ANIMATION_DURATION: 300,
  
  /** 스크롤 애니메이션 지속 시간 (ms) */
  SCROLL_ANIMATION_DURATION: 500,
  
  /** 모달 z-index */
  MODAL_Z_INDEX: 1000,
  
  /** 드롭다운 z-index */
  DROPDOWN_Z_INDEX: 999,
  
  /** 토스트 z-index */
  TOAST_Z_INDEX: 9999,
  
  /** 브레이크포인트 */
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    '2XL': 1536,
  } as const,
  
  /** 사이드바 너비 */
  SIDEBAR_WIDTH: 256,
  
  /** 모바일 사이드바 너비 */
  MOBILE_SIDEBAR_WIDTH: 280,
} as const

// =============================================================================
// API 설정
// =============================================================================

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

// =============================================================================
// 보안 설정
// =============================================================================

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

// =============================================================================
// 환경 설정
// =============================================================================

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

// =============================================================================
// 기본 설정값들
// =============================================================================

/**
 * 기본 추출 기준
 */
export const DEFAULT_EXTRACTION_CRITERIA = [
  {
    id: 'painpoint',
    name: '페인포인트',
    description: '사용자가 겪는 문제와 불편함',
    isDefault: true,
  },
  {
    id: 'needs',
    name: '니즈',
    description: '사용자의 요구사항과 기대',
    isDefault: true,
  },
  {
    id: 'motivations',
    name: '동기',
    description: '사용자의 행동을 이끄는 동기',
    isDefault: true,
  },
  {
    id: 'goals',
    name: '목표',
    description: '사용자가 달성하고자 하는 목표',
    isDefault: true,
  },
  {
    id: 'behaviors',
    name: '행동 패턴',
    description: '사용자의 일반적인 행동 양식',
    isDefault: true,
  },
] as const

/**
 * 기본 페르소나 타입
 */
export const DEFAULT_PERSONA_TYPES = [
  { id: 'user', name: '사용자', description: '일반적인 사용자' },
  { id: 'customer', name: '고객', description: '제품/서비스 고객' },
  { id: 'stakeholder', name: '이해관계자', description: '프로젝트 이해관계자' },
  { id: 'expert', name: '전문가', description: '도메인 전문가' },
] as const

// =============================================================================
// 모든 설정 통합
// =============================================================================

/**
 * 모든 설정을 하나로 통합
 */
export const CONFIG = {
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
} as const

// =============================================================================
// 타입 정의
// =============================================================================

export type FileUploadConfig = typeof FILE_UPLOAD_CONFIG
export type PaginationConfig = typeof PAGINATION_CONFIG
export type WorkflowConfig = typeof WORKFLOW_CONFIG
export type SearchConfig = typeof SEARCH_CONFIG
export type ChatConfig = typeof CHAT_CONFIG
export type CacheConfig = typeof CACHE_CONFIG
export type UIConfig = typeof UI_CONFIG
export type APIConfig = typeof API_CONFIG
export type SecurityConfig = typeof SECURITY_CONFIG
export type EnvironmentConfig = typeof ENV_CONFIG