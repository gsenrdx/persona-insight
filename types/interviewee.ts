import { IntervieweeRow } from './database'

// X축 점수 타입 (실제 DB 구조에 맞춤)
export interface XAxisScore {
  루틴형_score: number
  즉시형_score: number
}

// Y축 점수 타입 (실제 DB 구조에 맞춤)
export interface YAxisScore {
  가성비_score: number
  '속도/경험_score': number
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

// 페르소나 정보 타입
export interface PersonaInfo {
  id: string
  persona_type: string
  persona_title: string | null
  persona_description: string
  persona_reflected?: boolean
}

// 프로필 정보 타입
export interface ProfileInfo {
  id: string
  name: string
}

// 인터뷰 대상자 데이터 타입 (실제 DB 구조에 맞춤)
export interface IntervieweeData {
  id: string
  session_date: string
  user_type: string
  user_description: string | null
  x_axis: XAxisScore[] | null
  y_axis: YAxisScore[] | null
  interviewee_summary: string | null
  interviewee_style: string | null
  interview_detail: string | InterviewDetailItem[] | null // JSON 문자열 또는 파싱된 배열
  thumbnail: string | null
  created_at: string | null
  updated_at: string | null
  company_id: string
  created_by: string | null
  interviewee_fake_name: string | null
  project_id: string | null
  persona_id: string | null
  personas?: PersonaInfo | null
  profiles?: ProfileInfo | null
  created_by_profile?: ProfileInfo | null
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
  interviewee_fake_name: string
  interview_detail: InterviewDetailItem[] | null
  thumbnail: string
} 