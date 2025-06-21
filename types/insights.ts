// Insights dashboard type definitions

export interface KeywordFrequency {
  [key: string]: number
}

export interface Keyword {
  name: string
  weight: number
}

export interface Quote {
  text: string
  persona: string
}

export interface InsightData {
  title: string
  summary: string
  keywords: Keyword[]
  quotes: Quote[]
  mentionCount: number
  priority: number
}

export interface YearData {
  intervieweeCount: number
  insights: InsightData[]
}

export interface InsightDataByYear {
  [year: string]: YearData
}

export interface InsightMetadata {
  generatedAt: string
  totalTopics: number
  totalQuotes: number
  rawInterviewCount?: number
  detailedInterviewCount?: number
  message?: string
}

export interface InsightResponse {
  year: number
  intervieweeCount: number
  insights: InsightData[]
  metadata?: InsightMetadata
}

export interface BatchInsightRequest {
  company_id: string
  years: string[]
}

export interface BatchInsightResponse {
  results: {
    [year: string]: InsightResponse
  }
}

// Interview detail types
export interface InterviewDetail {
  topic_name: string
  need?: string[]
  painpoint?: string[]
  need_keyword?: string[]
  painpoint_keyword?: string[]
  keyword_cluster?: string[]
  insight_quote?: string[]
}

export interface IntervieweeWithDetail {
  id: string
  user_type: string
  user_description?: string
  interviewee_fake_name?: string
  interview_detail?: InterviewDetail[] | string | null
  session_date: string
  company_id: string
  project_id?: string
}

// Internal transformation types
export interface InsightMapData {
  title: string
  summary: string
  keywords: Map<string, number>
  quotes: Quote[]
  mentionCount: number
  needs: string[]
  painpoints: string[]
}