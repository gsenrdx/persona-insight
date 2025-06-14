// 페르소나 관련 타입 정의

import { PersonaRow, PersonaInsert, PersonaUpdate } from './database'

// Supabase 테이블 기반 타입들
export interface PersonaData extends PersonaRow {}
export interface PersonaInsertData extends PersonaInsert {}
export interface PersonaUpdateData extends PersonaUpdate {}

export interface PersonaApiResponse {
  data: PersonaData[]
}

// persona-criteria 설정에서 생성되는 메타데이터
export interface PersonaTypeInfo {
  title: string
  subtitle: string
  color: string
  description: string
}

// 인터뷰 분석 결과로 결정되는 페르소나 위치
export interface PersonaClassification {
  xIndex: number
  yIndex: number
  personaType: string
  confidence?: number // 0-1
}

// PersonaSynthesisRequest는 api.ts에서 정의됨 - 중복 제거 