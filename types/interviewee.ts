import { IntervieweeRow } from './database'

// 충전 패턴 점수 타입
export interface ChargingPatternScore {
  home_centric_score: number
  road_centric_score: number
}

// 가치 지향 점수 타입
export interface ValueOrientationScore {
  cost_driven_score: number
  tech_brand_driven_score: number
}

// 인터뷰 상세 항목 타입
export interface InterviewDetailItem {
  topic_name: string
  painpoint: string[]
  need: string[]
  insight_quote: string[]
  keyword_cluster: string[]
  painpoint_keyword: string[]
  need_keyword: string[]
}

// 인터뷰 대상자 데이터 타입 (Supabase 기반)
export interface IntervieweeData extends Omit<IntervieweeRow, 'charging_pattern_scores' | 'value_orientation_scores' | 'interview_detail'> {
  charging_pattern_scores: ChargingPatternScore[] | null
  value_orientation_scores: ValueOrientationScore[] | null
  interview_detail: InterviewDetailItem[] | null
}

// API 응답 타입
export interface IntervieweeApiResponse {
  data: IntervieweeData[]
}

// 레거시 호환을 위한 타입 (기존 Google Sheets 형식)
export interface LegacyIntervieweeData {
  session_date: string
  user_type: string
  user_description: string
  charging_pattern_scores: ChargingPatternScore[] | null
  value_orientation_scores: ValueOrientationScore[] | null
  interviewee_summary: string
  interviewee_style: string
  interview_detail: InterviewDetailItem[] | null
  thumbnail: string
} 