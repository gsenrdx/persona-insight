# 기존 인터뷰 시스템 정리 문서

## 개요
현재 코드베이스에는 두 가지 인터뷰 시스템이 혼재되어 있습니다:
1. **기존 시스템**: `interviewees` 테이블 기반 (레거시)
2. **새로운 시스템**: `interviews` 테이블 기반 (현재 사용 중)

## 현재 상태 분석 결과
- **API 디렉토리**: `/app/api/interviews/`만 존재 (interviewees API는 이미 제거됨)
- **컴포넌트**: `/components/interview/`만 존재 (interviewee 컴포넌트는 이미 제거됨)
- **워크플로우**: `interviews` 테이블 사용 중
- **페르소나 생성**: ⚠️ 아직 `interviewees` 테이블 사용 중 (수정 필요)

## 수정이 필요한 파일 목록 (interviewees 테이블 참조)

### 1. API 라우트
- `/app/api/personas/synthesis/route.ts` - interviewees 테이블 사용 → interviews 테이블로 변경 필요
- `/app/api/interviews/search-with-permissions/route.ts` - interviewees 참조 확인 필요
- `/app/api/insights/years/route.ts` - interviewees 참조
- `/app/api/insights/batch/route.ts` - interviewees 참조
- `/app/api/files/download/route.ts` - interviewees 참조
- `/app/api/projects/route.ts` - interviewees 카운트 사용

### 2. 서비스 파일
- `/lib/services/projects/projects.service.ts` - interviewees 카운트
- `/lib/services/personas/personas.service.ts` - interviewees 참조
- `/lib/services/miso/workflow.ts` - interviewees 관련 타입
- `/lib/services/insights/insights.service.ts` - interviewees 데이터 조회

### 3. 컴포넌트
- `/components/project/tabs/project-interviews.tsx` - IntervieweeData 타입 사용 (일부 수정 필요)

### 4. 타입 정의
- `/types/interviewee.ts` - 아직 사용 중이므로 유지 (점진적 마이그레이션)

## 유지해야 할 파일

### 1. 새로운 인터뷰 시스템
- `/app/api/interviews/` - 새로운 인터뷰 API
- `/components/interview/` - 새로운 인터뷰 컴포넌트
- `/types/interview.ts` - 새로운 인터뷰 타입
- `/hooks/use-interview-notes.ts` - 인터뷰 메모 훅

### 2. 공통 사용 컴포넌트
- `/components/project/tabs/project-interviews.tsx` - 프로젝트 인터뷰 탭 (새 시스템 사용)
- 워크플로우 관련 파일들 (인터뷰 생성에 사용)

## 마이그레이션 계획

### Phase 1: 데이터베이스 스키마 확인
1. `interviewees` 테이블과 `interviews` 테이블의 스키마 차이 분석
2. 필요한 필드 매핑 정의
3. 데이터 마이그레이션 스크립트 작성

### Phase 2: 코드 수정 (우선순위 순)
1. **페르소나 생성 API** (`/app/api/personas/synthesis/route.ts`)
   - interviewees → interviews 테이블 변경
   - 필드명 매핑 적용

2. **프로젝트 통계** (`/app/api/projects/route.ts`, `/lib/services/projects/projects.service.ts`)
   - interviewees 카운트 → interviews 카운트로 변경

3. **인사이트 관련** (`/app/api/insights/`, `/lib/services/insights/`)
   - interviewees 데이터 조회 → interviews 데이터 조회로 변경

4. **파일 다운로드** (`/app/api/files/download/route.ts`)
   - file_path 필드 참조 방식 변경

### Phase 3: 타입 정리
1. `IntervieweeData` 타입의 사용처를 `Interview` 타입으로 점진적 교체
2. 완전히 교체 후 `/types/interviewee.ts` 파일 제거

## 주의사항

1. **페르소나 관련 기능**: 일부 페르소나 생성/반영 기능이 기존 시스템과 연동되어 있을 수 있음
2. **워크플로우**: 파일 업로드 및 분석 워크플로우가 어느 시스템을 사용하는지 확인 필요
3. **프로젝트 통계**: 대시보드나 통계 기능에서 기존 테이블을 참조할 가능성

## 제거 순서 제안

1. 먼저 새 시스템으로 모든 기능이 정상 작동하는지 확인
2. 기존 API 라우트 제거
3. 기존 컴포넌트 제거
4. 타입 정의 정리
5. 사용하지 않는 import 정리

## 확인 필요 사항

- [ ] 페르소나 생성/반영 워크플로우가 새 시스템과 호환되는지
- [ ] 대시보드 통계가 올바른 테이블을 참조하는지  
- [ ] 검색 기능이 새 시스템에서 작동하는지
- [x] 파일 업로드 워크플로우가 새 테이블에 데이터를 저장하는지 (확인됨: interviews 테이블 사용)

## 필드 매핑 가이드

| interviewees 테이블 | interviews 테이블 | 비고 |
|-------------------|------------------|------|
| id | id | 동일 |
| interviewee_fake_name | title | 인터뷰 제목으로 사용 |
| interviewee_summary | summary | 요약 정보 |
| interview_detail | cleaned_script | 상세 내용 (구조 다름) |
| user_type | - | metadata에 포함 가능 |
| x_axis, y_axis | - | 페르소나 분석 결과 |
| persona_reflected | status | 상태로 관리 |
| file_path | file_path | 동일 (null 가능) |