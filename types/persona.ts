// 페르소나 관련 타입 정의

import { Database } from './supabase'

// 새로운 페르소나 데이터 구조 (페르소나 조합 기반)
export interface PersonaData {
  id: string
  persona_code: string
  title: string
  description: string
  thumbnail: string | null
  type_ids: string[]
  company_id: string
  created_at: string
  updated_at: string
  
  // 인터뷰 데이터 연동
  interviewData?: {
    insights: string          // 핵심 인사이트 요약
    painPoints: string        // 주요 고민점들
    needs: string            // 주요 니즈들
    keyQuotes: string        // 인상적인 인터뷰 발언들
    profileContext: string   // 대화 컨텍스트용 프로필 요약
  }
  
  // 레거시 호환성 (필요시 제거 가능)
  persona_type?: string
  persona_title?: string
  persona_description?: string
  persona_summary?: string
  persona_style?: string
  painpoints?: string
  needs?: string
  insight?: string
  insight_quote?: string
  project_id?: string | null
  interview_count?: number
  types?: Array<{
    id: string
    name: string
    description: string
    classification_name?: string
    persona_classifications?: {
      name: string
      description: string
    }
  }>
}

// 레거시 호환성을 위한 타입 유지
export type PersonaInsertData = Partial<PersonaData>
export type PersonaUpdateData = Partial<PersonaData>

export interface PersonaApiResponse {
  data: PersonaData[]
}

// 페르소나 분류 설정에서 생성되는 메타데이터
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