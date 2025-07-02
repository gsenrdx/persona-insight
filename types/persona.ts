// 페르소나 관련 타입 정의

import { Database } from './supabase'

// Supabase 테이블 기반 타입들
export type PersonaData = Database['public']['Tables']['personas']['Row']
export type PersonaInsertData = Database['public']['Tables']['personas']['Insert']
export type PersonaUpdateData = Database['public']['Tables']['personas']['Update']

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