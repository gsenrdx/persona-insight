/**
 * 워크플로우 및 처리 관련 설정
 */

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