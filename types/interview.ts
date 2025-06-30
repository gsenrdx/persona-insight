// cleaned_script의 각 대화 항목 타입
export interface CleanedScriptItem {
  id: number[];
  speaker: 'question' | 'answer';
  category: 'painpoint' | 'needs' | null;
  cleaned_sentence: string;
}

// 인터뷰 메타데이터 타입
export interface InterviewMetadata {
  total_sentences: number;
  categories_count: {
    painpoint?: number;
    needs?: number;
  };
  speakers: {
    question: number;
    answer: number;
  };
}

// 세션 정보
export interface SessionInfo {
  session_date: string;
  interview_topic: string;
}

// 인터뷰 대상자 프로필
export interface IntervieweeProfile {
  profile_summary: string;
  demographics: {
    age_group: string;
    gender: string;
    occupation_context: string;
  };
}

// 인터뷰 품질 평가
export interface InterviewQualityAssessment {
  overall_quality: {
    score: number; // 1-5
    assessment: string;
  };
}

// 주요 문제점/니즈 항목
export interface InsightItem {
  description: string;
  evidence: number[]; // cleaned_script id 참조
}

// HMW 질문
export interface HMWQuestion {
  hmw_questions: string;
}

// AI 페르소나 정의 (관계 데이터)
export interface AIPersonaDefinition {
  id: string;
  name_ko: string;
  name_en: string;
  description?: string;
  tags: string[];
}

// 인터뷰 타입 (DB 기반)
export interface Interview {
  id: string;
  company_id: string;
  project_id: string | null;
  raw_text: string | null;
  cleaned_script: CleanedScriptItem[] | null;
  metadata: InterviewMetadata | null;
  summary: string | null;
  title: string | null;
  interview_date: string | null;
  persona_id: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // 새로운 필드들
  session_info: SessionInfo[] | null;
  interviewee_profile: IntervieweeProfile[] | null;
  interview_quality_assessment: InterviewQualityAssessment[] | null;
  key_takeaways: string[] | null;
  primary_pain_points: InsightItem[] | null;
  primary_needs: InsightItem[] | null;
  hmw_questions: HMWQuestion[] | null;
  // AI 페르소나 매칭 결과
  ai_persona_match?: string | null; // persona_definitions 테이블 참조 (외래키)
  ai_persona_explanation?: string | null;
  // 관계 데이터
  created_by_profile?: {
    id: string;
    name: string;
  };
  persona?: {
    id: string;
    persona_type: string;
    persona_title: string | null;
  };
  ai_persona_definition?: AIPersonaDefinition; // AI 페르소나 정의 관계 데이터
  note_count?: number;
}

// 인터뷰 목록 필터
export interface InterviewFilters {
  category?: 'painpoint' | 'needs' | 'all';
  speaker?: 'question' | 'answer' | 'all';
  searchTerm?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// 인터뷰 생성/업데이트 DTO
export interface CreateInterviewDto {
  project_id: string;
  raw_text: string;
  title?: string;
  interview_date?: string;
}

export interface UpdateInterviewDto {
  title?: string;
  summary?: string;
  persona_id?: string;
  status?: Interview['status'];
}