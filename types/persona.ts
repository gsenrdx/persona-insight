import { PersonaRow, PersonaInsert, PersonaUpdate } from './database'

// 페르소나 데이터 타입 (Supabase 기반)
export interface PersonaData extends PersonaRow {}

// 페르소나 생성용 타입 (Supabase 기반)
export interface PersonaInsertData extends PersonaInsert {}

// 페르소나 업데이트용 타입 (Supabase 기반)
export interface PersonaUpdateData extends PersonaUpdate {}

// API 응답 타입
export interface PersonaApiResponse {
  data: PersonaData[]
}

// 페르소나 타입별 정보
export interface PersonaTypeInfo {
  title: string
  subtitle: string
  color: string
  description: string
}

// 페르소나 타입 맵핑
export const PERSONA_TYPE_MAP: Record<string, PersonaTypeInfo> = {
  'A': {
    title: 'Type A',
    subtitle: 'Home-centric / Cost-driven',
    color: 'blue',
    description: '출퇴근, 생활권 중심으로 가성비를 최우선하는 실속파'
  },
  'B': {
    title: 'Type B',
    subtitle: 'Home-centric / Tech/Brand-driven',
    color: 'green',
    description: '스마트홈·브랜드 경험을 중시하는 도시형 얼리어답터'
  },
  'C': {
    title: 'Type C',
    subtitle: 'Road-centric / Cost-driven',
    color: 'purple',
    description: '장거리 이동이 잦고 충전 비용 절감에 민감한 여행족'
  },
  'D': {
    title: 'Type D',
    subtitle: 'Road-centric / Tech/Brand-driven',
    color: 'orange',
    description: '초고속 충전과 고급 서비스를 추구하는 프리미엄 장거리 이용자'
  }
}

// 유틸리티 함수: 페르소나 타입별 정보 가져오기
export function getPersonaTypeInfo(personaType: string): PersonaTypeInfo {
  return PERSONA_TYPE_MAP[personaType] || {
    title: '기타 유형',
    subtitle: 'Unknown Type',
    color: 'gray',
    description: '세부 유형에 대한 설명이 지정되지 않았습니다.'
  }
} 