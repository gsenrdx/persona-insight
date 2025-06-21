export interface KeywordFrequency {
  [key: string]: number
}

export interface InsightData {
  title: string
  summary: string
  keywords: Array<{ name: string; weight: number }>
  quotes: Array<{ text: string; persona: string }>
  mentionCount: number
  priority: number
}

export interface InterviewDetail {
  topic_name?: string
  need?: string[] | string
  painpoint?: string[] | string
  need_keyword?: string[] | string
  painpoint_keyword?: string[] | string
  keyword_cluster?: string[] | string
  insight_quote?: string[] | string
}

export interface IntervieweeWithDetail {
  id?: string
  interview_detail?: InterviewDetail[] | string
  interviewee_fake_name?: string
  user_type?: string
  user_description?: string
  session_date?: string
}