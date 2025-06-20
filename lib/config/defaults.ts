/**
 * 기본값 및 프리셋 설정
 */

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