/**
 * 애플리케이션 라우트 경로 상수 정의
 * 모든 페이지 이동에서 사용하는 경로들을 중앙 관리
 */

// =============================================================================
// 기본 페이지 라우트
// =============================================================================

/**
 * 메인 페이지 라우트
 */
export const MAIN_ROUTES = {
  /** 홈/대시보드 페이지 */
  HOME: '/',
  /** 페르소나 대화 페이지 (홈과 동일) */
  PERSONA_CHAT: '/',
  /** 연간 인사이트 분석 페이지 */
  INSIGHTS: '/insights',
  /** 프로젝트 관리 페이지 */
  PROJECTS: '/projects',
} as const

/**
 * 인증 관련 라우트
 */
export const AUTH_ROUTES = {
  /** 로그인 페이지 */
  LOGIN: '/login',
  /** 회원가입 페이지 */
  SIGNUP: '/signup',
  /** 비밀번호 재설정 페이지 */
  RESET_PASSWORD: '/reset-password',
  /** 이메일 인증 페이지 */
  VERIFY_EMAIL: '/verify-email',
  /** 인증 콜백 페이지 (OAuth) */
  AUTH_CALLBACK: '/auth/callback',
  /** 이메일 확인 페이지 */
  AUTH_CONFIRM: '/auth/confirm',
  /** 로그아웃 후 리다이렉트 페이지 */
  LOGOUT_REDIRECT: '/login',
} as const

/**
 * 프로젝트 관련 라우트
 */
export const PROJECT_ROUTES = {
  /** 프로젝트 목록 페이지 */
  LIST: '/projects',
  /** 새 프로젝트 생성 페이지 */
  CREATE: '/projects/new',
  /** 프로젝트 상세 페이지 */
  DETAIL: (id: string) => `/projects/${id}`,
  /** 프로젝트 설정 페이지 */
  SETTINGS: (id: string) => `/projects/${id}/settings`,
  /** 프로젝트 멤버 관리 페이지 */
  MEMBERS: (id: string) => `/projects/${id}/members`,
  /** 프로젝트 인사이트 페이지 */
  INSIGHTS: (id: string) => `/projects/${id}/insights`,
} as const

/**
 * 채팅 관련 라우트
 */
export const CHAT_ROUTES = {
  /** 페르소나별 채팅 페이지 */
  BY_PERSONA: (personaId: string) => `/chat/${personaId}`,
  /** 채팅 기록 페이지 */
  HISTORY: '/chat/history',
  /** 채팅 요약 페이지 */
  SUMMARY: '/chat/summary',
} as const

/**
 * 페르소나 관련 라우트
 */
export const PERSONA_ROUTES = {
  /** 페르소나 목록 페이지 */
  LIST: '/personas',
  /** 페르소나 상세 페이지 */
  DETAIL: (id: string) => `/personas/${id}`,
  /** 페르소나 편집 페이지 */
  EDIT: (id: string) => `/personas/${id}/edit`,
  /** 페르소나 생성 페이지 */
  CREATE: '/personas/create',
} as const

/**
 * 인터뷰 관련 라우트
 */
export const INTERVIEW_ROUTES = {
  /** 인터뷰 목록 페이지 */
  LIST: '/interviews',
  /** 인터뷰 상세 페이지 */
  DETAIL: (id: string) => `/interviews/${id}`,
  /** 인터뷰 업로드 페이지 */
  UPLOAD: '/interviews/upload',
} as const

/**
 * 설정 관련 라우트
 */
export const SETTINGS_ROUTES = {
  /** 일반 설정 페이지 */
  GENERAL: '/settings',
  /** 프로필 설정 페이지 */
  PROFILE: '/settings/profile',
  /** 계정 설정 페이지 */
  ACCOUNT: '/settings/account',
  /** 알림 설정 페이지 */
  NOTIFICATIONS: '/settings/notifications',
  /** 보안 설정 페이지 */
  SECURITY: '/settings/security',
} as const

// =============================================================================
// 특수 라우트
// =============================================================================

/**
 * 에러 페이지 라우트
 */
export const ERROR_ROUTES = {
  /** 404 Not Found 페이지 */
  NOT_FOUND: '/404',
  /** 500 Server Error 페이지 */
  SERVER_ERROR: '/500',
  /** 403 Forbidden 페이지 */
  FORBIDDEN: '/403',
  /** 일반 에러 페이지 */
  ERROR: '/error',
} as const

/**
 * 외부 링크 및 리소스
 */
export const EXTERNAL_LINKS = {
  /** 도움말 문서 */
  HELP_DOCS: 'https://docs.example.com',
  /** 고객 지원 */
  SUPPORT: 'mailto:support@example.com',
  /** 개인정보 처리방침 */
  PRIVACY_POLICY: '/privacy',
  /** 서비스 약관 */
  TERMS_OF_SERVICE: '/terms',
  /** 피드백 */
  FEEDBACK: 'https://feedback.example.com',
} as const

// =============================================================================
// 네비게이션 메뉴 정의
// =============================================================================

/**
 * 메인 네비게이션 메뉴 아이템
 */
export const NAVIGATION_ITEMS = [
  {
    href: MAIN_ROUTES.HOME,
    name: '페르소나 대화',
    icon: 'MessageCircle',
    description: 'AI 페르소나와 대화하기'
  },
  {
    href: MAIN_ROUTES.INSIGHTS,
    name: '연간 인사이트 분석',
    icon: 'TrendingUp',
    description: '데이터 기반 인사이트 확인'
  },
  {
    href: MAIN_ROUTES.PROJECTS,
    name: '프로젝트 관리',
    icon: 'FolderOpen',
    description: '프로젝트 생성 및 관리'
  }
] as const

/**
 * 사용자 메뉴 아이템
 */
export const USER_MENU_ITEMS = [
  {
    href: SETTINGS_ROUTES.PROFILE,
    name: '프로필 설정',
    icon: 'User'
  },
  {
    href: SETTINGS_ROUTES.ACCOUNT,
    name: '계정 설정',
    icon: 'Settings'
  },
  {
    href: EXTERNAL_LINKS.HELP_DOCS,
    name: '도움말',
    icon: 'HelpCircle'
  }
] as const

// =============================================================================
// 유틸리티 함수들
// =============================================================================

/**
 * 동적 라우트 생성 헬퍼
 */
export const createRoute = (pattern: string, params: Record<string, string | number>): string => {
  let route = pattern
  Object.entries(params).forEach(([key, value]) => {
    route = route.replace(`[${key}]`, String(value))
    route = route.replace(`:${key}`, String(value))
    route = route.replace(`{${key}}`, String(value))
  })
  return route
}

/**
 * 쿼리 파라미터가 포함된 라우트 생성
 */
export const createRouteWithQuery = (
  route: string,
  query: Record<string, string | number | boolean | undefined>
): string => {
  const url = new URL(route, 'http://dummy.com')
  
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  
  return url.pathname + url.search
}

/**
 * 현재 경로가 특정 라우트와 일치하는지 확인
 */
export const isCurrentRoute = (currentPath: string, targetRoute: string): boolean => {
  // 정확한 일치
  if (currentPath === targetRoute) return true
  
  // 동적 라우트 패턴 매칭 (간단한 버전)
  const targetPattern = targetRoute.replace(/\[.*?\]/g, '[^/]+')
  const regex = new RegExp(`^${targetPattern}$`)
  return regex.test(currentPath)
}

/**
 * 브레드크럼 경로 생성
 */
export const createBreadcrumbs = (currentPath: string): Array<{ name: string; href: string }> => {
  const pathSegments = currentPath.split('/').filter(Boolean)
  const breadcrumbs: Array<{ name: string; href: string }> = []
  
  // 홈 추가
  breadcrumbs.push({ name: '홈', href: MAIN_ROUTES.HOME })
  
  // 경로 세그먼트별로 브레드크럼 생성
  let currentHref = ''
  pathSegments.forEach((segment) => {
    currentHref += `/${segment}`
    
    // 세그먼트에 따른 이름 매핑
    const segmentNames: Record<string, string> = {
      'projects': '프로젝트',
      'insights': '인사이트',
      'chat': '채팅',
      'personas': '페르소나',
      'interviews': '인터뷰',
      'settings': '설정',
    }
    
    const name = segmentNames[segment] || segment
    breadcrumbs.push({ name, href: currentHref })
  })
  
  return breadcrumbs
}

/**
 * 라우트 권한 확인 (추후 권한 시스템과 연동)
 */
export const isRouteAuthorized = (_route: string, _userRole: string): boolean => {
  // 기본적으로 모든 라우트 허용
  // 추후 권한별 라우트 접근 제어 로직 구현
  return true
}

// =============================================================================
// 모든 라우트 통합
// =============================================================================

/**
 * 모든 라우트들을 하나로 통합
 */
export const ROUTES = {
  MAIN: MAIN_ROUTES,
  AUTH: AUTH_ROUTES,
  PROJECT: PROJECT_ROUTES,
  CHAT: CHAT_ROUTES,
  PERSONA: PERSONA_ROUTES,
  INTERVIEW: INTERVIEW_ROUTES,
  SETTINGS: SETTINGS_ROUTES,
  ERROR: ERROR_ROUTES,
  EXTERNAL: EXTERNAL_LINKS,
} as const

// =============================================================================
// 타입 정의
// =============================================================================

/**
 * 라우트 타입
 */
export type Route = string | ((id: string) => string)

/**
 * 라우트 그룹 타입
 */
export type RouteGroup = Record<string, Route>

/**
 * 네비게이션 아이템 타입
 */
export type NavigationItem = {
  href: string
  name: string
  icon?: string
  description?: string
}

// =============================================================================
// 레거시 호환성 (점진적 마이그레이션용)
// =============================================================================

/**
 * 기존 코드와의 호환성을 위한 개별 export
 * @deprecated ROUTES를 사용하세요
 */
export const PATHS = {
  HOME: '/',
  PROJECTS: '/projects',
  INSIGHTS: '/insights',
  LOGIN: '/login',
} as const