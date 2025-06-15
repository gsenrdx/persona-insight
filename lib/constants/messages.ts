/**
 * UI 메시지 상수 통합 관리
 * 에러 메시지, 성공 메시지, 일반 UI 텍스트 등을 중앙에서 관리
 */

// =============================================================================
// 공통 에러 메시지
// =============================================================================

export const COMMON_ERROR_MESSAGES = {
  // 네트워크 관련
  NETWORK_ERROR: '네트워크 연결을 확인해주세요',
  TIMEOUT_ERROR: '요청 시간이 초과되었습니다. 다시 시도해주세요',
  CONNECTION_LOST: '연결이 끊어졌습니다. 네트워크 상태를 확인해주세요',
  
  // 서버 관련
  SERVER_ERROR: '서버에 일시적인 문제가 발생했습니다',
  MAINTENANCE: '서비스 점검 중입니다. 잠시 후 다시 시도해주세요',
  OVERLOADED: '서버가 과부하 상태입니다. 잠시 후 다시 시도해주세요',
  
  // 일반적인 오류
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다',
  OPERATION_FAILED: '작업을 완료할 수 없습니다',
  TRY_AGAIN: '다시 시도해주세요',
  
  // 권한 관련
  ACCESS_DENIED: '접근 권한이 없습니다',
  INSUFFICIENT_PERMISSIONS: '권한이 부족합니다',
  
  // 데이터 관련
  DATA_NOT_FOUND: '요청한 데이터를 찾을 수 없습니다',
  DATA_CORRUPTED: '데이터가 손상되었습니다',
  
  // 작업 상태
  PROCESSING: '처리 중입니다...',
  LOADING: '로딩 중...',
  SAVING: '저장 중...',
  UPLOADING: '업로드 중...',
} as const

// =============================================================================
// 인증 관련 에러 메시지
// =============================================================================

export const AUTH_ERROR_MESSAGES = {
  // 로그인
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다',
  LOGIN_REQUIRED: '로그인이 필요합니다',
  LOGIN_FAILED: '로그인에 실패했습니다',
  
  // 토큰 관련
  TOKEN_EXPIRED: '로그인이 만료되었습니다. 다시 로그인해주세요',
  TOKEN_INVALID: '인증 정보가 유효하지 않습니다',
  TOKEN_MISSING: '인증 정보가 없습니다',
  
  // 세션 관련
  SESSION_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요',
  SESSION_INVALID: '유효하지 않은 세션입니다',
  
  // 계정 관련
  ACCOUNT_DISABLED: '비활성화된 계정입니다',
  ACCOUNT_LOCKED: '계정이 잠겨있습니다',
  EMAIL_NOT_VERIFIED: '이메일 인증이 필요합니다',
  
  // 권한
  COMPANY_ACCESS_DENIED: '회사 접근 권한이 없습니다',
  PROJECT_ACCESS_DENIED: '프로젝트 접근 권한이 없습니다',
  ADMIN_REQUIRED: '관리자 권한이 필요합니다',
  
  // 회원가입
  EMAIL_ALREADY_EXISTS: '이미 가입된 이메일입니다',
  SIGNUP_FAILED: '회원가입에 실패했습니다',
  PASSWORD_TOO_WEAK: '비밀번호가 너무 약합니다',
} as const

// =============================================================================
// 유효성 검증 에러 메시지
// =============================================================================

export const VALIDATION_ERROR_MESSAGES = {
  // 필수 필드
  REQUIRED_FIELD: '필수 입력 항목입니다',
  REQUIRED_EMAIL: '이메일을 입력해주세요',
  REQUIRED_PASSWORD: '비밀번호를 입력해주세요',
  REQUIRED_NAME: '이름을 입력해주세요',
  
  // 형식 검증
  INVALID_EMAIL: '올바른 이메일 형식이 아닙니다',
  INVALID_PASSWORD: '비밀번호는 8자 이상이어야 합니다',
  INVALID_PHONE: '올바른 전화번호 형식이 아닙니다',
  INVALID_URL: '올바른 URL 형식이 아닙니다',
  INVALID_DATE: '올바른 날짜 형식이 아닙니다',
  
  // 길이 제한
  TOO_SHORT: '너무 짧습니다',
  TOO_LONG: '너무 깁니다',
  LENGTH_LIMIT: (min: number, max: number) => `${min}자 이상 ${max}자 이하로 입력해주세요`,
  
  // 파일 관련
  FILE_REQUIRED: '파일을 선택해주세요',
  FILE_TOO_LARGE: '파일 크기가 너무 큽니다',
  FILE_TYPE_NOT_SUPPORTED: '지원하지 않는 파일 형식입니다',
  FILE_UPLOAD_FAILED: '파일 업로드에 실패했습니다',
  
  // 중복 검증
  DUPLICATE_VALUE: '이미 존재하는 값입니다',
  UNIQUE_CONSTRAINT: '고유해야 하는 값입니다',
} as const

// =============================================================================
// 비즈니스 로직 에러 메시지
// =============================================================================

export const BUSINESS_ERROR_MESSAGES = {
  // 프로젝트 관련
  PROJECT_NOT_FOUND: '프로젝트를 찾을 수 없습니다',
  PROJECT_ACCESS_DENIED: '프로젝트에 접근할 권한이 없습니다',
  PROJECT_LIMIT_EXCEEDED: '프로젝트 생성 한도를 초과했습니다',
  PROJECT_DELETE_FAILED: '프로젝트를 삭제할 수 없습니다',
  
  // 인터뷰 관련
  INTERVIEW_NOT_FOUND: '인터뷰를 찾을 수 없습니다',
  INTERVIEW_PROCESSING: '인터뷰를 처리 중입니다',
  INTERVIEW_FAILED: '인터뷰 분석에 실패했습니다',
  INTERVIEW_UPLOAD_FAILED: '인터뷰 파일 업로드에 실패했습니다',
  
  // 페르소나 관련
  PERSONA_NOT_FOUND: '페르소나를 찾을 수 없습니다',
  PERSONA_GENERATION_FAILED: '페르소나 생성에 실패했습니다',
  PERSONA_SYNTHESIS_IN_PROGRESS: '페르소나 합성이 진행 중입니다',
  PERSONA_UPDATE_FAILED: '페르소나 업데이트에 실패했습니다',
  
  // 멤버십/초대 관련
  INVITATION_EXPIRED: '초대가 만료되었습니다',
  INVITATION_INVALID: '유효하지 않은 초대입니다',
  MEMBER_LIMIT_EXCEEDED: '멤버 수 한도를 초과했습니다',
  ALREADY_MEMBER: '이미 멤버입니다',
  
  // 구독/결제 관련
  SUBSCRIPTION_EXPIRED: '구독이 만료되었습니다',
  PAYMENT_FAILED: '결제에 실패했습니다',
  QUOTA_EXCEEDED: '사용량 한도를 초과했습니다',
} as const

// =============================================================================
// 성공 메시지
// =============================================================================

export const SUCCESS_MESSAGES = {
  // 일반
  SAVED: '저장되었습니다',
  UPDATED: '업데이트되었습니다',
  DELETED: '삭제되었습니다',
  CREATED: '생성되었습니다',
  
  // 인증
  LOGIN_SUCCESS: '로그인되었습니다',
  LOGOUT_SUCCESS: '로그아웃되었습니다',
  PASSWORD_CHANGED: '비밀번호가 변경되었습니다',
  
  // 프로젝트
  PROJECT_CREATED: '프로젝트가 생성되었습니다',
  PROJECT_UPDATED: '프로젝트가 업데이트되었습니다',
  PROJECT_DELETED: '프로젝트가 삭제되었습니다',
  
  // 인터뷰
  INTERVIEW_UPLOADED: '인터뷰가 업로드되었습니다',
  INTERVIEW_PROCESSED: '인터뷰 분석이 완료되었습니다',
  
  // 페르소나
  PERSONA_CREATED: '페르소나가 생성되었습니다',
  PERSONA_UPDATED: '페르소나가 업데이트되었습니다',
  PERSONAS_GENERATED: '페르소나 생성이 완료되었습니다',
  
  // 멤버/초대
  INVITATION_SENT: '초대장이 발송되었습니다',
  MEMBER_ADDED: '멤버가 추가되었습니다',
  MEMBER_REMOVED: '멤버가 제거되었습니다',
} as const

// =============================================================================
// 일반 UI 메시지
// =============================================================================

/**
 * 버튼 텍스트
 */
export const BUTTON_MESSAGES = {
  // 기본 액션
  SAVE: '저장',
  CANCEL: '취소',
  CONFIRM: '확인',
  DELETE: '삭제',
  EDIT: '편집',
  CREATE: '생성',
  UPDATE: '수정',
  UPLOAD: '업로드',
  DOWNLOAD: '다운로드',
  
  // 네비게이션
  BACK: '뒤로가기',
  NEXT: '다음',
  PREVIOUS: '이전',
  HOME: '홈으로',
  
  // 인증
  LOGIN: '로그인',
  LOGOUT: '로그아웃',
  SIGNUP: '회원가입',
  
  // 특수 액션
  RETRY: '다시 시도',
  REFRESH: '새로고침',
  RESET: '초기화',
  SUBMIT: '제출',
  APPLY: '적용',
  CLOSE: '닫기',
  
  // 프로젝트 관련
  JOIN_PROJECT: '프로젝트 참여',
  LEAVE_PROJECT: '프로젝트 나가기',
  INVITE_MEMBER: '멤버 초대',
  
  // 페르소나 관련
  CHAT_WITH_PERSONA: '페르소나와 대화',
  GENERATE_PERSONA: '페르소나 생성',
  
  // 파일 관련
  SELECT_FILES: '파일 선택',
  UPLOAD_FILES: '파일 업로드',
  
  // 로딩 상태
  LOADING: '로딩 중...',
  PROCESSING: '처리 중...',
  SAVING: '저장 중...',
  UPLOADING: '업로드 중...',
} as const

/**
 * 플레이스홀더 메시지
 */
export const PLACEHOLDER_MESSAGES = {
  // 입력 필드
  EMAIL: '이메일을 입력하세요',
  PASSWORD: '비밀번호를 입력하세요',
  NAME: '이름을 입력하세요',
  SEARCH: '검색어를 입력하세요',
  MESSAGE: '메시지를 입력하세요',
  
  // 프로젝트
  PROJECT_NAME: '프로젝트 이름을 입력하세요',
  PROJECT_DESCRIPTION: '프로젝트 설명을 입력하세요',
  
  // 페르소나
  PERSONA_NAME: '페르소나 이름을 입력하세요',
  PERSONA_DESCRIPTION: '페르소나 설명을 입력하세요',
  
  // 채팅
  CHAT_MESSAGE: '메시지를 입력하세요...',
  
  // 파일
  FILE_SELECT: '파일을 선택하거나 드래그하세요',
} as const

/**
 * 확인 메시지
 */
export const CONFIRMATION_MESSAGES = {
  // 삭제 확인
  DELETE_PROJECT: '이 프로젝트를 삭제하시겠습니까?',
  DELETE_PERSONA: '이 페르소나를 삭제하시겠습니까?',
  DELETE_INTERVIEW: '이 인터뷰를 삭제하시겠습니까?',
  DELETE_MEMBER: '이 멤버를 제거하시겠습니까?',
  
  // 나가기 확인
  LEAVE_PROJECT: '프로젝트에서 나가시겠습니까?',
  LOGOUT_CONFIRM: '로그아웃하시겠습니까?',
  
  // 변경사항 확인
  UNSAVED_CHANGES: '저장되지 않은 변경사항이 있습니다. 페이지를 떠나시겠습니까?',
  RESET_FORM: '폼을 초기화하시겠습니까?',
  
  // 작업 확인
  START_PROCESSING: '인터뷰 분석을 시작하시겠습니까?',
  REGENERATE_PERSONA: '페르소나를 다시 생성하시겠습니까?',
} as const

/**
 * 정보 메시지
 */
export const INFO_MESSAGES = {
  // 빈 상태
  NO_PROJECTS: '프로젝트가 없습니다',
  NO_PERSONAS: '페르소나가 없습니다',
  NO_INTERVIEWS: '인터뷰가 없습니다',
  NO_MESSAGES: '메시지가 없습니다',
  NO_RESULTS: '검색 결과가 없습니다',
  
  // 로딩 상태
  LOADING_PROJECTS: '프로젝트를 불러오는 중...',
  LOADING_PERSONAS: '페르소나를 불러오는 중...',
  LOADING_INTERVIEWS: '인터뷰를 불러오는 중...',
  
  // 처리 상태
  PROCESSING_INTERVIEW: '인터뷰를 분석하고 있습니다...',
  GENERATING_PERSONA: '페르소나를 생성하고 있습니다...',
  
  // 파일 관련
  FILE_SIZE_LIMIT: '파일 크기는 10MB 이하여야 합니다',
  SUPPORTED_FORMATS: '지원 형식: PDF, DOCX, TXT, MD',
  
  // 권한 관련
  ADMIN_ONLY: '관리자만 접근할 수 있습니다',
  MEMBER_ONLY: '프로젝트 멤버만 접근할 수 있습니다',
  
  // 기능 안내
  DRAG_DROP_FILES: '파일을 드래그하여 업로드하세요',
  SELECT_PERSONA: '대화할 페르소나를 선택하세요',
  CREATE_FIRST_PROJECT: '첫 번째 프로젝트를 생성하세요',
} as const

/**
 * 상태 메시지
 */
export const STATUS_MESSAGES = {
  // 워크플로우 상태
  WORKFLOW_PENDING: '대기 중',
  WORKFLOW_PROCESSING: '처리 중',
  WORKFLOW_COMPLETED: '완료',
  WORKFLOW_FAILED: '실패',
  
  // 프로젝트 상태
  PROJECT_ACTIVE: '활성',
  PROJECT_ARCHIVED: '보관됨',
  
  // 멤버 상태
  MEMBER_ACTIVE: '활성',
  MEMBER_PENDING: '초대 대기',
  MEMBER_INACTIVE: '비활성',
  
  // 파일 상태
  FILE_UPLOADING: '업로드 중',
  FILE_PROCESSING: '처리 중',
  FILE_READY: '준비됨',
  FILE_ERROR: '오류',
  
  // 연결 상태
  ONLINE: '온라인',
  OFFLINE: '오프라인',
  CONNECTING: '연결 중',
} as const

/**
 * 도움말 메시지
 */
export const HELP_MESSAGES = {
  // 기능 설명
  PROJECT_HELP: '프로젝트를 생성하여 인터뷰를 관리하고 페르소나를 생성할 수 있습니다',
  PERSONA_HELP: 'AI 기반으로 생성된 페르소나와 실제와 같은 대화를 나눌 수 있습니다',
  INTERVIEW_HELP: '다양한 형식의 인터뷰 파일을 업로드하여 자동으로 분석할 수 있습니다',
  INSIGHT_HELP: '수집된 데이터를 바탕으로 트렌드와 인사이트를 확인할 수 있습니다',
  
  // 사용법 안내
  FILE_UPLOAD_HELP: 'PDF, DOCX, TXT, MD 파일을 지원하며, 최대 10MB까지 업로드 가능합니다',
  SEARCH_HELP: '프로젝트명, 페르소나명, 키워드로 검색할 수 있습니다',
  CHAT_HELP: '자연스러운 대화를 통해 페르소나의 특성과 니즈를 파악할 수 있습니다',
  
  // 팁
  TIP_MULTIPLE_FILES: '여러 파일을 한 번에 업로드하면 더 정확한 페르소나를 생성할 수 있습니다',
  TIP_DETAILED_QUESTIONS: '구체적인 질문을 할수록 더 유용한 답변을 얻을 수 있습니다',
  TIP_PROJECT_ORGANIZATION: '프로젝트별로 인터뷰를 구분하여 관리하는 것을 권장합니다',
} as const

// =============================================================================
// 유틸리티 함수
// =============================================================================

/**
 * 에러 코드에 따른 적절한 메시지 반환
 */
export function getErrorMessage(code: string | number): string {
  // HTTP 상태 코드 기반 메시지
  switch (code) {
    case 400:
      return VALIDATION_ERROR_MESSAGES.REQUIRED_FIELD
    case 401:
      return AUTH_ERROR_MESSAGES.LOGIN_REQUIRED
    case 403:
      return COMMON_ERROR_MESSAGES.ACCESS_DENIED
    case 404:
      return COMMON_ERROR_MESSAGES.DATA_NOT_FOUND
    case 408:
      return COMMON_ERROR_MESSAGES.TIMEOUT_ERROR
    case 429:
      return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요'
    case 500:
      return COMMON_ERROR_MESSAGES.SERVER_ERROR
    case 502:
    case 503:
    case 504:
      return COMMON_ERROR_MESSAGES.MAINTENANCE
    default:
      return COMMON_ERROR_MESSAGES.UNKNOWN_ERROR
  }
}

/**
 * 비즈니스 에러 코드에 따른 메시지 반환
 */
export function getBusinessErrorMessage(errorCode: string): string {
  const messages: Record<string, string> = {
    'PROJECT_NOT_FOUND': BUSINESS_ERROR_MESSAGES.PROJECT_NOT_FOUND,
    'INTERVIEW_PROCESSING': BUSINESS_ERROR_MESSAGES.INTERVIEW_PROCESSING,
    'PERSONA_GENERATION_FAILED': BUSINESS_ERROR_MESSAGES.PERSONA_GENERATION_FAILED,
    'QUOTA_EXCEEDED': BUSINESS_ERROR_MESSAGES.QUOTA_EXCEEDED,
    // 더 많은 매핑 추가 가능
  }
  
  return messages[errorCode] || COMMON_ERROR_MESSAGES.UNKNOWN_ERROR
}

/**
 * 유효성 검증 에러 메시지 생성
 */
export function getValidationMessage(field: string, type: string, params?: any): string {
  switch (type) {
    case 'required':
      return `${field}${VALIDATION_ERROR_MESSAGES.REQUIRED_FIELD.replace('필수 입력 항목입니다', '을(를) 입력해주세요')}`
    case 'email':
      return VALIDATION_ERROR_MESSAGES.INVALID_EMAIL
    case 'minLength':
      return `${field}는(은) 최소 ${params.min}자 이상이어야 합니다`
    case 'maxLength':
      return `${field}는(은) 최대 ${params.max}자 이하여야 합니다`
    case 'fileSize':
      return `파일 크기는 ${params.maxSize}MB 이하여야 합니다`
    default:
      return VALIDATION_ERROR_MESSAGES.REQUIRED_FIELD
  }
}

// 타입 export
export type CommonErrorMessage = keyof typeof COMMON_ERROR_MESSAGES
export type AuthErrorMessage = keyof typeof AUTH_ERROR_MESSAGES
export type ValidationErrorMessage = keyof typeof VALIDATION_ERROR_MESSAGES
export type BusinessErrorMessage = keyof typeof BUSINESS_ERROR_MESSAGES
export type SuccessMessage = keyof typeof SUCCESS_MESSAGES