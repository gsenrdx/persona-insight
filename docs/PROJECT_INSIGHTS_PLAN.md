# 프로젝트 인사이트 페이지 기획 문서

## 1. 개요

### 1.1 목적
프로젝트 상세 페이지의 인사이트 탭에서 사용자에게 프로젝트별 심층 분석 정보를 제공하여, 인터뷰 데이터로부터 도출된 통찰을 체계적으로 탐색하고 활용할 수 있도록 합니다.

### 1.2 핵심 가치
- **프로젝트별 맞춤 분석**: 각 프로젝트의 특성과 목적에 맞는 인사이트 제공
- **시각적 직관성**: 복잡한 데이터를 이해하기 쉬운 시각적 형태로 표현
- **실행 가능한 통찰**: 단순 정보 제공을 넘어 의사결정에 활용 가능한 인사이트 도출
- **실시간 업데이트**: 새로운 인터뷰 추가 시 즉시 반영되는 동적 분석

## 2. 사용자 분석 정보

### 2.1 핵심 인사이트 (Core Insights)
#### 2.1.1 인사이트 요약 카드
- **우선순위 기반 정렬**: 언급 빈도, 임팩트, 최신성을 고려한 자동 정렬
- **시각적 요소**:
  - 인사이트 제목과 한 줄 요약
  - 관련 키워드 태그 (최대 6개)
  - 언급 횟수 및 관련 인터뷰 수
  - 우선순위 표시 (색상 또는 아이콘)

#### 2.1.2 상세 분석 뷰
- **확장 가능한 카드 UI**: 클릭 시 상세 정보 표시
- **포함 정보**:
  - Pain Points와 Needs의 상관관계
  - 관련 고객 인용구 (최대 5개)
  - 시간대별 언급 추이 그래프
  - 연관 페르소나 목록

### 2.2 시계열 분석 (Temporal Analysis)
#### 2.2.1 인사이트 트렌드
- **월별/분기별 추이 차트**: 주요 인사이트의 시간대별 변화
- **신규 인사이트 알림**: 최근 추가된 새로운 통찰 하이라이트
- **변화 지표**: 이전 기간 대비 증감률 표시

#### 2.2.2 인터뷰 통계
- **인터뷰 볼륨**: 시간대별 인터뷰 수 추이
- **품질 지표**: 인터뷰 품질 평가 점수 분포
- **응답자 다양성**: 페르소나 분포 변화

### 2.3 토픽 기반 분석 (Topic Analysis)
#### 2.3.1 토픽 맵
- **인터랙티브 버블 차트**: 토픽 크기는 언급 빈도, 색상은 카테고리
- **연관성 시각화**: 토픽 간 연결선으로 관계 표현
- **필터링 옵션**: Pain Point/Need/Insight별 필터

#### 2.3.2 키워드 클라우드
- **가중치 기반 크기**: 중요도에 따른 키워드 크기 조절
- **인터랙티브 기능**: 클릭 시 관련 인사이트 필터링
- **색상 코딩**: 긍정/부정/중립 감정 표시

### 2.4 페르소나별 인사이트 (Persona Insights)
#### 2.4.1 페르소나 매트릭스 뷰
- **2x2 매트릭스**: 프로젝트 설정에 따른 X/Y축 기준
- **페르소나 카드**: 각 세그먼트별 주요 특성 요약
- **비교 분석**: 페르소나 간 차이점 하이라이트

#### 2.4.2 페르소나별 상세 분석
- **개별 페르소나 뷰**: 특정 페르소나의 심층 분석
- **공통점과 차이점**: 다른 페르소나와의 비교
- **대표 인용구**: 해당 페르소나의 실제 목소리

### 2.5 실행 가능한 인사이트 (Actionable Insights)
#### 2.5.1 HMW (How Might We) 질문
- **자동 생성된 HMW**: AI가 도출한 기회 영역
- **우선순위 매핑**: 실행 가능성과 임팩트 기준 정렬
- **팀 협업 기능**: HMW에 대한 코멘트 및 투표

#### 2.5.2 추천 액션
- **다음 단계 제안**: 인사이트 기반 실행 계획
- **리소스 연결**: 관련 문서, 도구, 참고자료 링크
- **진행 상황 추적**: 액션 아이템 체크리스트

## 3. UI/UX 설계

### 3.1 레이아웃 구조
```
┌─────────────────────────────────────────────────┐
│                  헤더 영역                       │
├─────┬───────────────────────────────────────────┤
│     │  필터 바 (기간, 페르소나, 토픽)            │
│ 사  ├───────────────────────────────────────────┤
│ 이  │  주요 지표 요약 (4개 카드)                │
│ 드  ├───────────────────────────────────────────┤
│ 바  │  메인 콘텐츠 영역                         │
│     │  - 탭: 핵심 인사이트 | 트렌드 | 토픽 |    │
│ 네  │        페르소나 | 액션 플랜               │
│ 비  │  - 선택된 탭에 따른 동적 콘텐츠          │
│     │                                           │
└─────┴───────────────────────────────────────────┘
```

### 3.2 인터랙션 디자인
#### 3.2.1 필터링 시스템
- **다중 필터 조합**: 기간 + 페르소나 + 토픽 동시 적용
- **빠른 필터**: 자주 사용하는 필터 조합 저장
- **실시간 업데이트**: 필터 변경 시 즉시 반영

#### 3.2.2 네비게이션
- **사이드바 인사이트 목록**: 스크롤 시 따라오는 목차
- **앵커 네비게이션**: 클릭 시 해당 섹션으로 스크롤
- **브레드크럼**: 현재 위치 표시 및 빠른 이동

#### 3.2.3 반응형 디자인
- **데스크톱**: 3열 그리드 레이아웃
- **태블릿**: 2열 그리드로 자동 조정
- **모바일**: 단일 열, 접을 수 있는 섹션

### 3.3 시각화 컴포넌트
#### 3.3.1 차트 라이브러리
- **Recharts**: 기본 차트 (라인, 바, 파이)
- **D3.js**: 복잡한 시각화 (네트워크, 버블)
- **Framer Motion**: 차트 애니메이션

#### 3.3.2 차트 타입
- **트렌드 차트**: 시계열 데이터용 라인/에어리어 차트
- **분포 차트**: 카테고리별 분포용 파이/도넛 차트
- **관계 차트**: 토픽/키워드 관계용 네트워크 차트
- **히트맵**: 시간대별 활동 패턴 시각화

## 4. 개발 구조

### 4.1 컴포넌트 구조
```typescript
// 메인 컴포넌트
components/project/components/project-insights.tsx
├── InsightsSummary.tsx        // 요약 지표 카드
├── InsightsFilter.tsx         // 필터 바
├── InsightsTabs.tsx           // 탭 네비게이션
└── tabs/
    ├── CoreInsights.tsx       // 핵심 인사이트 탭
    ├── TrendsAnalysis.tsx     // 트렌드 분석 탭
    ├── TopicAnalysis.tsx      // 토픽 분석 탭
    ├── PersonaInsights.tsx    // 페르소나 인사이트 탭
    └── ActionPlan.tsx         // 액션 플랜 탭
```

### 4.2 데이터 구조
```typescript
interface ProjectInsightData {
  // 프로젝트 메타데이터
  projectId: string
  dateRange: { start: Date; end: Date }
  
  // 요약 지표
  summary: {
    totalInterviews: number
    totalInsights: number
    avgQualityScore: number
    topPainPoints: string[]
    topNeeds: string[]
  }
  
  // 핵심 인사이트
  insights: Array<{
    id: string
    title: string
    summary: string
    type: 'pain_point' | 'need' | 'opportunity'
    priority: number
    mentionCount: number
    relatedInterviews: string[]
    keywords: Array<{ name: string; weight: number }>
    quotes: Array<{ text: string; personaId: string }>
    trend: 'rising' | 'stable' | 'declining'
  }>
  
  // 시계열 데이터
  temporalData: Array<{
    date: Date
    insightCounts: Record<string, number>
    interviewCount: number
    newInsights: string[]
  }>
  
  // 토픽 데이터
  topics: Array<{
    id: string
    name: string
    category: string
    frequency: number
    relatedKeywords: string[]
    sentiment: number // -1 to 1
  }>
  
  // 페르소나별 데이터
  personaInsights: Array<{
    personaId: string
    personaName: string
    matrixPosition: { x: number; y: number }
    topInsights: string[]
    uniqueCharacteristics: string[]
  }>
}
```

### 4.3 API 엔드포인트
```typescript
// 기존 API 확장
GET /api/projects/[id]/insights
  ?startDate=2024-01-01
  &endDate=2024-12-31
  &personas=persona1,persona2
  &topics=topic1,topic2

// 새로운 엔드포인트
GET /api/projects/[id]/insights/summary     // 요약 지표
GET /api/projects/[id]/insights/trends      // 시계열 분석
GET /api/projects/[id]/insights/topics      // 토픽 분석
GET /api/projects/[id]/insights/personas    // 페르소나별 분석
GET /api/projects/[id]/insights/actions     // 추천 액션
```

### 4.4 상태 관리
```typescript
// Custom Hooks
useProjectInsights(projectId, filters)      // 메인 데이터 페칭
useInsightFilters()                         // 필터 상태 관리
useInsightNavigation()                      // 네비게이션 상태
useInsightExport()                          // 내보내기 기능

// Query Keys
['project-insights', projectId, filters]
['project-insights-summary', projectId]
['project-insights-trends', projectId, dateRange]
```

### 4.5 성능 최적화
- **데이터 페이징**: 대량 인사이트 처리를 위한 무한 스크롤
- **캐싱 전략**: 5분 stale time, 10분 cache time
- **차트 최적화**: 가상화 및 디바운싱 적용
- **레이지 로딩**: 탭별 컴포넌트 동적 임포트

## 5. 구현 우선순위

### Phase 1: 핵심 기능 (2주)
1. 기존 API 연결 및 데이터 구조 설정
2. 요약 지표 카드 구현
3. 핵심 인사이트 목록 및 상세 뷰
4. 기본 필터링 기능

### Phase 2: 시각화 (2주)
1. 트렌드 차트 구현
2. 토픽 버블 차트
3. 키워드 클라우드
4. 페르소나 매트릭스

### Phase 3: 고급 기능 (1주)
1. HMW 질문 생성 및 관리
2. 액션 플랜 기능
3. 내보내기 기능 (PDF, Excel)
4. 공유 및 협업 기능

### Phase 4: 최적화 (1주)
1. 성능 최적화
2. 반응형 디자인 완성
3. 접근성 개선
4. 사용자 피드백 반영

## 6. 기술 스택

### 필수 라이브러리
- **React Query**: 서버 상태 관리
- **Recharts**: 기본 차트
- **D3.js**: 고급 시각화
- **Framer Motion**: 애니메이션
- **date-fns**: 날짜 처리
- **jsPDF**: PDF 내보내기

### 선택적 라이브러리
- **react-window**: 대량 데이터 가상화
- **fuse.js**: 클라이언트 사이드 검색
- **papaparse**: CSV 내보내기

## 7. 측정 지표

### 사용성 지표
- 평균 페이지 체류 시간
- 인사이트별 클릭률
- 필터 사용 빈도
- 내보내기 기능 사용률

### 성능 지표
- 초기 로딩 시간 < 2초
- 필터 적용 시간 < 500ms
- 차트 렌더링 시간 < 1초
- 메모리 사용량 < 100MB

## 8. 향후 확장 계획

### 단기 (3개월)
- AI 기반 인사이트 자동 요약
- 멀티 프로젝트 비교 분석
- 실시간 협업 코멘트

### 장기 (6개월)
- 예측 분석 기능
- 외부 데이터 소스 연동
- 커스텀 대시보드 빌더
- API 공개 및 임베딩 지원