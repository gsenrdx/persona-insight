# MISO 새로운 인터뷰 포맷 구현 계획

## 1. 개요

MISO API가 반환하는 인터뷰 분석 결과에 새로운 필드들이 추가되었습니다. 기존의 `cleaned_script`에 더해 인터뷰 품질 평가, 주요 통찰, 고객 문제점/니즈 분석 등이 포함됩니다.

## 2. 새로운 데이터 구조

### 2.1 전체 구조
```json
{
  "cleaned_script": [...],              // 기존 - 정제된 대화 스크립트
  "session_info": [...],                // 신규 - 인터뷰 세션 정보
  "interviewee_profile": [...],         // 신규 - 인터뷰 대상자 프로필
  "interview_quality_assessment": [...], // 신규 - 인터뷰 품질 평가
  "key_takeaways": [...],               // 신규 - 핵심 인사이트
  "primary_pain_points": [...],         // 신규 - 주요 고객 문제점
  "primary_needs": [...],               // 신규 - 주요 고객 니즈
  "hmw_questions": [...]                // 신규 - How Might We 질문
}
```

### 2.2 각 필드 상세

#### session_info
```json
{
  "session_date": "2024-07-22",
  "interview_topic": "전기차 충전 서비스 사용 경험"
}
```

#### interviewee_profile
```json
{
  "profile_summary": "전주 거주, 30대 후반 택배업 종사자...",
  "demographics": {
    "age_group": "30대 후반",
    "gender": "남성",
    "occupation_context": "택배업, 아내와 차량 공동 사용, 전주 거주"
  }
}
```

#### interview_quality_assessment
```json
{
  "overall_quality": {
    "score": 4,  // 1-5 점수
    "assessment": "경험 기반의 구체적인 답변..."
  }
}
```

#### key_takeaways (문자열 배열)
```json
[
  "충전기 고장, 통신 장애 등 실시간 정보와 실제 상황 불일치...",
  "충전소 접근성, 충전 대기 및 사용 편의성..."
]
```

#### primary_pain_points / primary_needs
```json
{
  "description": "충전기 고장, 통신 장애 등으로...",
  "evidence": [93, 94, 215, 223]  // cleaned_script의 id 참조
}
```

#### hmw_questions
```json
{
  "hmw_questions": "어떻게 하면 충전소 정보가..."
}
```

## 3. 데이터베이스 스키마 변경

### 3.1 interviews 테이블 컬럼 추가

```sql
-- Supabase SQL Editor에서 실행
ALTER TABLE interviews 
ADD COLUMN session_info JSONB,
ADD COLUMN interviewee_profile JSONB,
ADD COLUMN interview_quality_assessment JSONB,
ADD COLUMN key_takeaways TEXT[],
ADD COLUMN primary_pain_points JSONB,
ADD COLUMN primary_needs JSONB,
ADD COLUMN hmw_questions JSONB;

-- 인덱스 추가 (선택적 - 검색 성능 향상)
CREATE INDEX idx_interviews_quality_score ON interviews 
  ((interview_quality_assessment->'overall_quality'->>'score')::integer);
```

### 3.2 타입 정의 업데이트

`types/database.ts` 수정:
```typescript
interviews: {
  Row: {
    // 기존 컬럼들...
    session_info: Json | null
    interviewee_profile: Json | null
    interview_quality_assessment: Json | null
    key_takeaways: string[] | null
    primary_pain_points: Json | null
    primary_needs: Json | null
    hmw_questions: Json | null
  }
  // Insert, Update 타입도 동일하게 추가
}
```

## 4. 타입 정의 추가

### 4.1 types/interview.ts 업데이트

```typescript
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

// 전체 분석 결과
export interface InterviewAnalysisResult {
  cleaned_script: CleanedScriptItem[];
  session_info: SessionInfo[];
  interviewee_profile: IntervieweeProfile[];
  interview_quality_assessment: InterviewQualityAssessment[];
  key_takeaways: string[];
  primary_pain_points: InsightItem[];
  primary_needs: InsightItem[];
  hmw_questions: HMWQuestion[];
}

// Interview 인터페이스 업데이트
export interface Interview {
  // 기존 필드들...
  session_info: SessionInfo[] | null;
  interviewee_profile: IntervieweeProfile[] | null;
  interview_quality_assessment: InterviewQualityAssessment[] | null;
  key_takeaways: string[] | null;
  primary_pain_points: InsightItem[] | null;
  primary_needs: InsightItem[] | null;
  hmw_questions: HMWQuestion[] | null;
}
```

## 5. API 및 서비스 업데이트

### 5.1 MISO API 응답 파싱 수정

`lib/services/miso/parser.ts`:
```typescript
export function parseInterviewAnalysis(response: any): InterviewAnalysisResult {
  return {
    cleaned_script: response.cleaned_script || [],
    session_info: response.session_info || [],
    interviewee_profile: response.interviewee_profile || [],
    interview_quality_assessment: response.interview_quality_assessment || [],
    key_takeaways: response.key_takeaways || [],
    primary_pain_points: response.primary_pain_points || [],
    primary_needs: response.primary_needs || [],
    hmw_questions: response.hmw_questions || []
  };
}
```

### 5.2 워크플로우 API 수정

`app/api/workflow/route.ts`에서 MISO 응답을 파싱하여 새 컬럼들에 저장하는 로직 추가

## 6. UI/UX 개선 계획

### 6.1 인터뷰 상세 페이지 개선

#### A. 새로운 탭 구조
1. **대화 스크립트** (기존)
2. **인터뷰 요약** (신규)
   - 세션 정보
   - 인터뷰 대상자 프로필
   - 품질 평가
3. **인사이트** (신규)
   - 핵심 시사점
   - Pain Points (근거 문장 링크 포함)
   - Needs (근거 문장 링크 포함)
   - HMW Questions

#### B. 왼쪽 사이드바 메타데이터 확장
- 인터뷰 품질 점수 (별점 표시)
- Pain Points 개수
- Needs 개수
- HMW Questions 개수
- 인터뷰 날짜 및 주제

### 6.2 새로운 컴포넌트 개발

#### components/interview/interview-insights.tsx
```typescript
interface InterviewInsightsProps {
  interview: Interview;
  onEvidenceClick: (scriptId: number) => void;
}

// Pain Points와 Needs를 표시하고 근거 문장으로 이동 가능
```

#### components/interview/interview-summary.tsx
```typescript
interface InterviewSummaryProps {
  interview: Interview;
}

// 세션 정보, 프로필, 품질 평가 표시
```

### 6.3 프로젝트 대시보드 개선

#### 인사이트 대시보드 추가
- 프로젝트 내 모든 인터뷰의 Pain Points/Needs 통합 분석
- 자주 언급되는 문제점/니즈 워드 클라우드
- 평균 인터뷰 품질 점수
- HMW Questions 목록

## 7. 구현 우선순위 및 단계

### Phase 1: 데이터베이스 및 백엔드 (1-2일)
1. ✅ DB 스키마 변경 (ALTER TABLE)
2. ✅ 타입 정의 업데이트
3. ✅ MISO API 파싱 로직 수정
4. ✅ 워크플로우 API 업데이트

### Phase 2: 기본 UI 표시 (2-3일)
1. ✅ 인터뷰 상세 페이지 탭 추가
2. ✅ 기본 데이터 표시 (읽기 전용)
3. ✅ 사이드바 통계 업데이트

### Phase 3: 고급 기능 (3-4일)
1. ✅ 근거 문장 링크 기능
2. ✅ 인사이트 필터링/검색
3. ✅ 프로젝트 레벨 인사이트 대시보드

### Phase 4: 최적화 및 개선 (2일)
1. ✅ 성능 최적화
2. ✅ UX 개선
3. ✅ 테스트 및 버그 수정

## 8. 주의사항

1. **하위 호환성**: 기존 인터뷰 데이터는 새 필드가 null로 저장됨
2. **점진적 마이그레이션**: 새로운 인터뷰부터 새 포맷 적용
3. **에러 처리**: 새 필드가 없는 경우 graceful degradation
4. **성능**: Pain Points/Needs의 evidence 배열이 클 수 있으므로 인덱싱 고려

## 9. 테스트 계획

1. **단위 테스트**
   - 새 포맷 파싱 로직
   - 타입 안정성

2. **통합 테스트**
   - MISO API 응답 처리
   - DB 저장 및 조회

3. **E2E 테스트**
   - 인터뷰 업로드 → 분석 → 표시 전체 플로우

## 10. 향후 확장 가능성

1. **AI 기반 인사이트 클러스터링**
   - 여러 인터뷰의 Pain Points/Needs 자동 그룹화

2. **인사이트 트렌드 분석**
   - 시간에 따른 고객 니즈 변화 추적

3. **페르소나별 인사이트 매핑**
   - 특정 페르소나의 주요 문제점/니즈 자동 연결

4. **HMW 질문 기반 아이디어 관리**
   - 각 HMW에 대한 솔루션 아이디어 추적