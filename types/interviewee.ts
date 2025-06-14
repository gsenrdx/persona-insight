// 인터뷰 대상자 관련 타입 정의

// persona-criteria 설정에 따라 동적으로 결정되는 축 점수
// 예: { "루틴형_score": 80, "즉시형_score": 20 }
export interface AxisScore {
  [key: string]: number
}

// MISO API로 분석된 인터뷰 상세 내용
export interface InterviewDetailItem {
  topic_name: string
  painpoint: string[]
  need: string[]
  insight_quote: string[]
  keyword_cluster: string[]
  painpoint_keyword: string[]
  need_keyword: string[]
}

export interface PersonaInfo {
  id: string
  persona_type: string
  persona_title: string | null
  persona_description: string
}

export interface ProfileInfo {
  id: string
  name: string
}

// Supabase interviewees 테이블의 완전한 데이터 구조
export interface IntervieweeData {
  id: string
  session_date: string
  user_type: string
  user_description: string | null
  x_axis: AxisScore[] | null // persona-criteria 설정에 따라 동적
  y_axis: AxisScore[] | null // persona-criteria 설정에 따라 동적
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
  persona_reflected?: boolean | null
  file_path: string | null
  // 조인된 데이터
  personas?: PersonaInfo | null
  profiles?: ProfileInfo | null
  created_by_profile?: ProfileInfo | null
}

export interface IntervieweeApiResponse {
  data: IntervieweeData[]
}

 