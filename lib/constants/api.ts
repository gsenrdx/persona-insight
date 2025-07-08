/**
 * API 엔드포인트 상수 정의
 * 모든 API 호출에서 사용하는 엔드포인트 경로들을 중앙 관리
 */

// =============================================================================
// 내부 API 엔드포인트
// =============================================================================

/**
 * 기본 API 경로
 */
export const API_BASE = {
  /** 내부 API 기본 경로 */
  INTERNAL: '/api',
  /** MISO API 기본 경로 */
  MISO: process.env.MISO_API_URL || 'https://api.holdings.miso.gs',
} as const

/**
 * 프로젝트 관련 API 엔드포인트
 */
export const PROJECT_ENDPOINTS = {
  /** 프로젝트 목록 조회/생성 */
  LIST: '/api/projects',
  /** 특정 프로젝트 조회/수정/삭제 */
  BY_ID: (id: string) => `/api/projects/${id}`,
  /** 프로젝트 멤버 관리 */
  MEMBERS: (id: string) => `/api/projects/${id}/members`,
  /** 프로젝트 멤버 개별 관리 */
  MEMBER_BY_ID: (projectId: string, memberId: string) => `/api/projects/${projectId}/members/${memberId}`,
  /** 프로젝트 인사이트 */
  INSIGHTS: (id: string) => `/api/projects/${id}/insights`,
  /** 프로젝트 가입 */
  JOIN: '/api/projects/join',
  /** 프로젝트 초대 */
  INVITE: (id: string) => `/api/projects/${id}/invite`,
} as const

/**
 * 페르소나 관련 API 엔드포인트
 */
export const PERSONA_ENDPOINTS = {
  /** 페르소나 목록 조회/생성 */
  LIST: '/api/personas',
  /** 특정 페르소나 조회/수정/삭제 */
  BY_ID: (id: string) => `/api/personas/${id}`,
  /** 페르소나 합성 */
  SYNTHESIS: '/api/personas/synthesis',
  /** 페르소나 검색 */
  SEARCH: '/api/personas/search',
  /** 페르소나 기준 관리 */
  CRITERIA: '/api/personas/criteria',
} as const

/**
 * 인터뷰 관련 API 엔드포인트
 */
export const INTERVIEW_ENDPOINTS = {
  /** 인터뷰 목록 조회/업로드 */
  LIST: '/api/interviews',
  /** 특정 인터뷰 조회/수정/삭제 */
  BY_ID: (id: string) => `/api/interviews/${id}`,
  /** 인터뷰 파일 업로드 */
  UPLOAD: '/api/interviews/upload',
  /** 인터뷰 처리 상태 확인 */
  STATUS: (id: string) => `/api/interviews/${id}/status`,
} as const

/**
 * 채팅 관련 API 엔드포인트
 */
export const CHAT_ENDPOINTS = {
  /** 채팅 메시지 전송 */
  SEND: '/api/chat',
  /** 채팅 기록 조회 */
  HISTORY: '/api/chat/history',
  /** 채팅 요약 생성 */
  SUMMARY: '/api/chat/summary',
  /** 특정 페르소나와의 채팅 */
  BY_PERSONA: (personaId: string) => `/api/chat/${personaId}`,
} as const

/**
 * 워크플로우 관련 API 엔드포인트
 */
export const WORKFLOW_ENDPOINTS = {
  /** 워크플로우 시작 */
  START: '/api/workflow',
  /** 워크플로우 상태 확인 */
  STATUS: (id: string) => `/api/workflow/${id}`,
  /** 워크플로우 취소 */
  CANCEL: (id: string) => `/api/workflow/${id}/cancel`,
  /** 워크플로우 재시작 */
  RESTART: (id: string) => `/api/workflow/${id}/restart`,
} as const

/**
 * 파일 관련 API 엔드포인트
 */
export const FILE_ENDPOINTS = {
  /** 파일 업로드 */
  UPLOAD: '/api/files/upload',
  /** 파일 다운로드 */
  DOWNLOAD: '/api/files/download',
  /** 파일 삭제 */
  DELETE: (id: string) => `/api/files/${id}`,
  /** 파일 정보 조회 */
  INFO: (id: string) => `/api/files/${id}/info`,
} as const

/**
 * 인사이트 관련 API 엔드포인트
 */
export const INSIGHT_ENDPOINTS = {
  /** 인사이트 조회 */
  LIST: '/api/insights',
  /** 인사이트 생성 */
  GENERATE: '/api/insights/generate',
  /** 연간 인사이트 */
  YEARLY: '/api/insights/yearly',
  /** 트렌드 분석 */
  TRENDS: '/api/insights/trends',
} as const

/**
 * 인증 관련 API 엔드포인트
 */
export const AUTH_ENDPOINTS = {
  /** 로그인 */
  LOGIN: '/api/auth/login',
  /** 로그아웃 */
  LOGOUT: '/api/auth/logout',
  /** 회원가입 */
  SIGNUP: '/api/auth/signup',
  /** 토큰 갱신 */
  REFRESH: '/api/auth/refresh',
  /** 비밀번호 재설정 */
  RESET_PASSWORD: '/api/auth/reset-password',
  /** 이메일 인증 */
  VERIFY_EMAIL: '/api/auth/verify-email',
  /** 프로필 조회/수정 */
  PROFILE: '/api/auth/profile',
} as const

// =============================================================================
// 외부 API 엔드포인트
// =============================================================================

/**
 * MISO API 엔드포인트
 */
export const MISO_ENDPOINTS = {
  /** 워크플로우 시작 */
  WORKFLOW_START: '/workflow/start',
  /** 워크플로우 상태 확인 */
  WORKFLOW_STATUS: (id: string) => `/workflow/${id}/status`,
  /** 파일 업로드 */
  FILE_UPLOAD: '/files/upload',
  /** 분석 결과 조회 */
  ANALYSIS_RESULT: (id: string) => `/analysis/${id}/result`,
} as const

// =============================================================================
// 유틸리티 함수들
// =============================================================================

/**
 * API 엔드포인트 생성 헬퍼
 */
export const createApiEndpoint = (base: string, path: string) => `${base}${path}`

/**
 * 쿼리 파라미터가 포함된 URL 생성
 */
export const createUrlWithParams = (
  endpoint: string, 
  params: Record<string, string | number | boolean | undefined>
): string => {
  const url = new URL(endpoint, 'http://dummy.com') // 기본 도메인 (무시됨)
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  
  return url.pathname + url.search
}

/**
 * 동적 경로 파라미터 치환
 */
export const replaceRouteParams = (
  route: string, 
  params: Record<string, string | number>
): string => {
  let result = route
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`{${key}}`, String(value))
    result = result.replace(`:${key}`, String(value))
  })
  return result
}

// =============================================================================
// 타입 정의
// =============================================================================

/**
 * API 엔드포인트 타입
 */
export type ApiEndpoint = string | ((id: string) => string)

/**
 * 엔드포인트 그룹 타입
 */
export type EndpointGroup = Record<string, ApiEndpoint>

/**
 * 모든 엔드포인트들을 하나로 통합
 */
export const API_ENDPOINTS = {
  PROJECT: PROJECT_ENDPOINTS,
  PERSONA: PERSONA_ENDPOINTS,
  INTERVIEW: INTERVIEW_ENDPOINTS,
  CHAT: CHAT_ENDPOINTS,
  WORKFLOW: WORKFLOW_ENDPOINTS,
  FILE: FILE_ENDPOINTS,
  INSIGHT: INSIGHT_ENDPOINTS,
  AUTH: AUTH_ENDPOINTS,
  MISO: MISO_ENDPOINTS,
} as const