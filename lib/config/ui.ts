/**
 * UI 및 사용자 인터페이스 관련 설정
 */

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