# 버전 관리 시스템 설계

## 문제점 분석

현재 시스템의 주요 문제점:
1. **인터뷰 삭제 시 데이터 정합성 문제**
   - `project_summaries.interview_count_at_creation`과 실제 인터뷰 수 불일치
   - 삭제된 인터뷰로 인한 통계 왜곡
   - 새로운 인터뷰 감지 로직 오류

2. **데이터 복구 불가**
   - 삭제된 인터뷰/페르소나 복구 불가능
   - 실수로 삭제한 데이터 영구 손실

3. **변경 이력 추적 불가**
   - 누가, 언제, 무엇을 변경했는지 알 수 없음
   - 문제 발생 시 원인 파악 어려움

## 해결 방안

### 1. Soft Delete 패턴 구현

모든 주요 테이블에 soft delete 필드 추가:

```sql
-- 기존 테이블들에 soft delete 필드 추가
ALTER TABLE interviews ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE interviews ADD COLUMN deleted_by uuid DEFAULT NULL;
ALTER TABLE interviewees ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE interviewees ADD COLUMN deleted_by uuid DEFAULT NULL;
ALTER TABLE personas ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE personas ADD COLUMN deleted_by uuid DEFAULT NULL;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_interviews_deleted_at ON interviews(deleted_at);
CREATE INDEX idx_interviewees_deleted_at ON interviewees(deleted_at);
CREATE INDEX idx_personas_deleted_at ON personas(deleted_at);
```

### 2. Audit Log 시스템

모든 데이터 변경사항을 추적하는 audit 테이블:

```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'RESTORE')),
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  user_id uuid NOT NULL,
  user_email text,
  company_id uuid NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  
  -- 메타데이터
  ip_address inet,
  user_agent text,
  request_id text
);

-- 인덱스
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### 3. 버전 테이블 (인터뷰 히스토리)

중요한 데이터의 전체 버전 관리:

```sql
CREATE TABLE interview_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES interviews(id),
  version_number integer NOT NULL,
  
  -- 스냅샷 데이터 (interviews 테이블의 모든 필드)
  title text,
  summary text,
  raw_text text,
  interview_detail jsonb,
  key_takeaways text[],
  primary_pain_points jsonb,
  primary_needs jsonb,
  hmw_questions jsonb,
  status text,
  metadata jsonb,
  
  -- 버전 메타데이터
  created_at timestamptz DEFAULT NOW(),
  created_by uuid NOT NULL,
  change_reason text,
  
  UNIQUE(interview_id, version_number)
);
```

### 4. 프로젝트 요약 개선

인터뷰 카운트를 더 정확하게 추적:

```sql
ALTER TABLE project_summaries ADD COLUMN interview_ids_at_creation uuid[] DEFAULT '{}';
ALTER TABLE project_summaries ADD COLUMN excluded_interview_ids uuid[] DEFAULT '{}';
ALTER TABLE project_summaries ADD COLUMN version integer DEFAULT 1;
```

### 5. 트리거 구현

자동으로 audit log를 생성하는 트리거:

```sql
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Soft delete로 변환
    UPDATE interviews 
    SET deleted_at = NOW(), 
        deleted_by = current_setting('app.current_user_id')::uuid
    WHERE id = OLD.id;
    RETURN NULL;
  END IF;
  
  -- Audit log 생성
  INSERT INTO audit_logs (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    user_id,
    company_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW),
    current_setting('app.current_user_id')::uuid,
    current_setting('app.current_company_id')::uuid
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 구현 계획

### Phase 1: Soft Delete (1주)
1. 데이터베이스 마이그레이션 실행
2. API 업데이트 (DELETE → UPDATE deleted_at)
3. 쿼리 업데이트 (WHERE deleted_at IS NULL 추가)
4. 휴지통 UI 구현

### Phase 2: Audit Log (1주)
1. Audit log 테이블 및 트리거 생성
2. API 미들웨어에서 user context 설정
3. Audit log 조회 API 구현
4. 관리자 UI에서 변경 이력 표시

### Phase 3: 버전 관리 (2주)
1. 버전 테이블 생성
2. 중요 변경 시 자동 버전 생성
3. 버전 비교 및 복원 기능
4. UI에서 버전 히스토리 표시

### Phase 4: 프로젝트 요약 개선 (1주)
1. 요약 생성 시 interview_ids 저장
2. 삭제된 인터뷰 제외 로직
3. 요약 버전 관리
4. 정확한 "새 인터뷰" 감지

## API 변경사항

### 1. 삭제 API
```typescript
// 기존
DELETE /api/interviews/[id]

// 변경 후
DELETE /api/interviews/[id]  // soft delete
DELETE /api/interviews/[id]?permanent=true  // 영구 삭제 (관리자만)
```

### 2. 조회 API
```typescript
// 기본: 삭제되지 않은 항목만
GET /api/interviews?projectId=xxx

// 삭제된 항목 포함
GET /api/interviews?projectId=xxx&includeDeleted=true

// 삭제된 항목만
GET /api/interviews?projectId=xxx&deletedOnly=true
```

### 3. 복원 API
```typescript
POST /api/interviews/[id]/restore
```

### 4. 버전 관리 API
```typescript
// 버전 목록
GET /api/interviews/[id]/versions

// 특정 버전 조회
GET /api/interviews/[id]/versions/[versionNumber]

// 버전 복원
POST /api/interviews/[id]/versions/[versionNumber]/restore
```

## UI/UX 개선사항

### 1. 휴지통 기능
- 삭제된 항목 보기/복원
- 30일 후 자동 영구 삭제
- 일괄 복원 기능

### 2. 변경 이력
- 각 항목의 변경 이력 타임라인
- 변경자, 시간, 변경 내용 표시
- 이전 버전과 비교

### 3. 프로젝트 인사이트
- 삭제된 인터뷰 제외한 정확한 통계
- 요약 재생성 시 포함할 인터뷰 선택
- 요약 버전 비교

## 보안 고려사항

1. **권한 관리**
   - 삭제: project member 이상
   - 영구 삭제: project owner/admin만
   - 복원: 삭제한 사람 또는 admin
   - Audit log 조회: company admin만

2. **데이터 보호**
   - 삭제된 데이터도 회사별 격리
   - Audit log 변조 방지
   - 민감 정보 마스킹

## 성능 최적화

1. **인덱스 전략**
   - deleted_at 필드에 부분 인덱스
   - audit_logs 테이블 파티셔닝
   - 버전 테이블 아카이빙

2. **쿼리 최적화**
   - deleted_at IS NULL 조건 기본 포함
   - 버전 데이터 지연 로딩
   - Audit log 페이지네이션

## 마이그레이션 전략

1. **무중단 마이그레이션**
   - 새 필드는 NULL 허용으로 추가
   - 기존 API 하위 호환성 유지
   - 점진적 롤아웃

2. **데이터 정합성**
   - 기존 데이터에 deleted_at = NULL 설정
   - project_summaries 재계산
   - 초기 버전 생성