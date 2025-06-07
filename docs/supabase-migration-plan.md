# Supabase 마이그레이션 계획

## 개요
Google Sheets API에서 Supabase PostgreSQL로 인터뷰 데이터를 마이그레이션하는 계획

## 1. 데이터베이스 스키마 설계

### interviewees 테이블 구조

```sql
CREATE TABLE interviewees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_date DATE NOT NULL,
  user_type VARCHAR(100) NOT NULL,
  user_description TEXT,
  charging_pattern_scores JSONB,
  value_orientation_scores JSONB,
  interviewee_summary TEXT,
  interviewee_style VARCHAR(100),
  interview_detail JSONB,
  thumbnail TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### JSON 필드 최적화

1. **JSONB 사용**: JSON 대신 JSONB 사용으로 성능 향상
2. **인덱싱**: 자주 쿼리되는 JSON 필드에 GIN 인덱스 생성
3. **스키마 검증**: JSON 스키마 검증 제약 조건 추가

```sql
-- JSON 필드 인덱스 생성
CREATE INDEX idx_charging_pattern_scores ON interviewees USING GIN (charging_pattern_scores);
CREATE INDEX idx_value_orientation_scores ON interviewees USING GIN (value_orientation_scores);
CREATE INDEX idx_interview_detail ON interviewees USING GIN (interview_detail);

-- 세션 날짜 인덱스
CREATE INDEX idx_session_date ON interviewees (session_date);
CREATE INDEX idx_user_type ON interviewees (user_type);
```

## 2. 마이그레이션 전략

### A. 단계적 마이그레이션 (권장)
1. **Phase 1**: Supabase 테이블 생성 및 기존 데이터 이관
2. **Phase 2**: 읽기 요청을 Supabase로 전환
3. **Phase 3**: 쓰기 요청을 Supabase로 전환
4. **Phase 4**: Google Sheets API 제거

### B. 즉시 마이그레이션
- 모든 기능을 한번에 Supabase로 전환
- 더 간단하지만 위험성 높음

## 3. JSON 데이터 처리 방법

### PostgreSQL JSONB 장점
- **인덱싱**: GIN 인덱스로 JSON 내부 검색 가능
- **타입 검증**: JSON 스키마 제약 조건
- **압축**: 저장 공간 효율성
- **쿼리**: SQL로 JSON 내부 데이터 쿼리 가능

### 예시 쿼리
```sql
-- charging_pattern_scores에서 특정 점수 검색
SELECT * FROM interviewees 
WHERE charging_pattern_scores->>'home_centric_score' > '80';

-- interview_detail에서 특정 키워드 검색
SELECT * FROM interviewees 
WHERE interview_detail @> '[{"topic_name": "충전 인프라"}]';
```

## 4. 데이터 검증 및 제약 조건

```sql
-- JSON 스키마 검증 함수
CREATE OR REPLACE FUNCTION validate_charging_pattern_scores(data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- home_centric_score와 road_centric_score 필드 검증
  RETURN (
    data ? 'home_centric_score' AND 
    data ? 'road_centric_score' AND
    (data->>'home_centric_score')::NUMERIC BETWEEN 0 AND 100 AND
    (data->>'road_centric_score')::NUMERIC BETWEEN 0 AND 100
  );
END;
$$ LANGUAGE plpgsql;

-- 제약 조건 추가
ALTER TABLE interviewees 
ADD CONSTRAINT valid_charging_pattern_scores 
CHECK (charging_pattern_scores IS NULL OR validate_charging_pattern_scores(charging_pattern_scores));
```

## 5. 성능 최적화

### Row Level Security (RLS)
```sql
-- RLS 활성화
ALTER TABLE interviewees ENABLE ROW LEVEL SECURITY;

-- 읽기 정책
CREATE POLICY "Anyone can read interviewees" ON interviewees
FOR SELECT USING (true);
```

### 캐싱 전략
- Supabase 내장 캐싱 활용
- Next.js ISR(Incremental Static Regeneration) 활용
- Redis 캐싱 레이어 추가 고려

## 6. 장단점 비교

### Supabase 장점
- **실시간 기능**: PostgreSQL Change Data Capture
- **타입 안전성**: 자동 TypeScript 타입 생성
- **확장성**: PostgreSQL의 강력한 쿼리 기능
- **보안**: Row Level Security, JWT 인증
- **성능**: 인덱싱, 커넥션 풀링

### 고려사항
- **학습 곡선**: SQL 및 PostgreSQL 지식 필요
- **비용**: 사용량에 따른 과금
- **종속성**: Supabase 서비스 의존도

## 7. 마이그레이션 체크리스트

- [ ] Supabase 프로젝트 설정
- [ ] 테이블 스키마 생성
- [ ] 기존 데이터 이관
- [ ] API 라우터 업데이트
- [ ] 타입 정의 업데이트
- [ ] 테스트 코드 작성
- [ ] 성능 테스트
- [ ] 프로덕션 배포 