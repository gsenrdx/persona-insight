// 페르소나 관련 유틸리티 함수

import { PersonaTypeInfo } from '@/types/persona'

// 기본 페르소나 타입 맵핑 (하드코딩된 기본값)
// TODO: 향후 persona-criteria 설정으로부터 동적으로 생성하도록 개선
const DEFAULT_PERSONA_TYPE_MAP: Record<string, PersonaTypeInfo> = {
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

// 페르소나 타입별 정보 가져오기
export function getPersonaTypeInfo(personaType: string): PersonaTypeInfo {
  return DEFAULT_PERSONA_TYPE_MAP[personaType] || {
    title: '기타 유형',
    subtitle: 'Unknown Type',
    color: 'gray',
    description: '세부 유형에 대한 설명이 지정되지 않았습니다.'
  }
}