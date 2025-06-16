# Topic Integration 테스트 가이드

## 개요
Topic 동기화는 이제 **페르소나 synthesis (병합)** 시점에 자동으로 실행됩니다.
- 인터뷰가 페르소나에 병합될 때 해당 인터뷰의 topic들이 페르소나 데이터셋에 동기화됨
- 페르소나에 `miso_dataset_id`가 있어야 동기화가 실행됨

## 테스트 시나리오

### 1. 사전 준비 사항
- MISO_KNOWLEDGE_API_KEY 환경변수가 설정되어야 함
- 페르소나에 miso_dataset_id가 미리 할당되어야 함 (`/api/personas/update-dataset`)
- 병합할 인터뷰에 interview_detail 데이터가 있어야 함

### 2. 테스트 데이터 확인

#### 현재 시스템의 테스트 데이터
```sql
-- 페르소나 및 연관 인터뷰 확인
SELECT 
  p.id as persona_id,
  p.persona_type,
  p.miso_dataset_id,
  COUNT(i.id) as interview_count
FROM personas p
LEFT JOIN interviewees i ON i.persona_id = p.id 
WHERE p.miso_dataset_id IS NOT NULL
  AND i.persona_reflected = true
  AND i.interview_detail IS NOT NULL
GROUP BY p.id, p.persona_type, p.miso_dataset_id;
```

#### 인터뷰 상세 데이터 확인
```sql
-- 특정 페르소나의 topic 분포 확인
SELECT 
  i.id,
  jsonb_array_elements(i.interview_detail)->>'topic_name' as topic_name
FROM interviewees i
WHERE i.persona_id = 'dbbd14d4-e684-4156-9cf5-8c9a3437c443'  -- 실제 persona_id
  AND i.persona_reflected = true
  AND i.interview_detail IS NOT NULL;
```

### 3. API 테스트 흐름

#### 3.1 먼저 페르소나에 데이터셋 ID 할당
```bash
# 페르소나에 MISO 데이터셋 ID 할당
curl -X PUT "http://localhost:3000/api/personas/update-dataset" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "persona_id": "persona_uuid",
    "miso_dataset_id": "dataset_id",
    "user_id": "user_uuid"
  }'
```

#### 3.2 인터뷰를 페르소나에 병합 (synthesis)
```bash
# 인터뷰를 페르소나에 병합하면서 topic 동기화 트리거
curl -X POST "http://localhost:3000/api/personas/synthesis" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "selectedInterviewee": {
      "id": "interview_uuid",
      "user_description": "...",
      "interview_detail": [...]
    },
    "personaType": "H",
    "personaId": "persona_uuid"
  }'
```

### 4. 기대 결과

#### 4.1 성공 응답
```json
{
  "message": "데이터셋 ID가 성공적으로 업데이트되었습니다",
  "persona": { ... },
  "success": true
}
```

#### 4.2 로그 확인 포인트 (synthesis 시)
```
Topic 동기화 시작: 인터뷰 interview_uuid → 페르소나 persona_uuid
[sync-interview-xxxxx] 인터뷰 Topic 동기화 시작
[sync-interview-xxxxx] N개 topic 발견
[sync-interview-xxxxx] Topic "topic_name" 동기화 시작
[sync-interview-xxxxx] Topic "topic_name"에 대해 N개 인터뷰 발견
[create-doc-xxxxx] MISO 문서 생성 시작 또는 [update-doc-xxxxx] MISO 문서 업데이트 시작
[sync-interview-xxxxx] Topic "topic_name" 동기화 완료 (문서 ID: doc_id)
[sync-interview-xxxxx] 인터뷰 Topic 동기화 완료
Topic 동기화 완료: 인터뷰 interview_uuid
```

#### 4.3 데이터베이스 변화 확인
```sql
-- persona_topic_documents 테이블 확인
SELECT 
  ptd.*,
  mt.topic_name
FROM persona_topic_documents ptd
JOIN main_topics mt ON mt.id = ptd.topic_id
WHERE ptd.persona_id = 'dbbd14d4-e684-4156-9cf5-8c9a3437c443'
ORDER BY ptd.created_at DESC;
```

#### 4.4 MISO Knowledge 확인
- 페르소나의 데이터셋에 topic별 문서가 생성되었는지 확인
- 각 문서에 올바른 세그먼트가 포함되었는지 확인

### 5. 오류 시나리오 테스트

#### 5.1 잘못된 MISO API 키
```bash
# 환경변수 임시 변경
export MISO_KNOWLEDGE_API_KEY="invalid_key"
# API 호출 → 에러 발생해도 기본 응답은 성공
```

#### 5.2 존재하지 않는 데이터셋 ID
```bash
# 존재하지 않는 데이터셋 ID로 테스트
curl -X PUT "http://localhost:3000/api/personas/update-dataset" \
  -d '{"persona_id": "...", "miso_dataset_id": "nonexistent", "user_id": "..."}'
```

#### 5.3 권한 없는 사용자
```bash
# 다른 회사 사용자 토큰으로 테스트
```

### 6. 성능 테스트

#### 6.1 대량 인터뷰 처리
- 많은 인터뷰를 가진 페르소나로 테스트
- 처리 시간 측정

#### 6.2 동시 요청 처리
- 여러 페르소나에 대해 동시에 API 호출
- 데이터 정합성 확인

### 7. 문제 해결 가이드

#### 7.1 MISO API 응답 확인
```javascript
// MISO Knowledge API 직접 호출 테스트
const response = await fetch(`${MISO_API_URL}/ext/v1/datasets/${datasetId}/documents`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${MISO_KNOWLEDGE_API_KEY}`,
    'Content-Type': 'application/json'
  }
});
```

#### 7.2 데이터 검증
```sql
-- 누락된 main_topics 확인
SELECT DISTINCT 
  jsonb_array_elements(i.interview_detail)->>'topic_name' as topic_name
FROM interviewees i
WHERE i.persona_reflected = true
  AND i.interview_detail IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM main_topics mt 
    WHERE mt.topic_name = jsonb_array_elements(i.interview_detail)->>'topic_name'
  );
```

#### 7.3 로그 레벨 조정
```javascript
// 더 상세한 로깅이 필요한 경우
console.log('[DEBUG]', JSON.stringify(data, null, 2));
```

### 8. 워크플로우 요약

1. **페르소나 생성/준비**
   - 페르소나 생성 또는 기존 페르소나 선택
   - `/api/personas/update-dataset`로 MISO 데이터셋 ID 할당

2. **인터뷰 병합 (Topic 동기화 트리거)**
   - `/api/personas/synthesis`로 인터뷰를 페르소나에 병합
   - 자동으로 해당 인터뷰의 topic들이 페르소나 데이터셋에 동기화

3. **결과 확인**
   - 페르소나 데이터셋에 topic별 문서 생성/업데이트
   - 동일 topic의 다른 인터뷰들도 함께 문서에 포함

### 9. 수동 검증 체크리스트

- [ ] 페르소나에 miso_dataset_id가 할당됨
- [ ] synthesis 실행 시 인터뷰가 페르소나에 병합됨
- [ ] persona_topic_documents 테이블에 레코드 생성됨
- [ ] main_topics 테이블에 새로운 topic들 추가됨
- [ ] MISO Knowledge에 topic별 문서 생성됨
- [ ] 문서 내용이 예상과 일치함
- [ ] 세그먼트 수가 해당 topic을 가진 인터뷰 수와 일치함
- [ ] 메타데이터가 올바르게 설정됨
- [ ] miso_dataset_id가 없는 페르소나는 topic 동기화 건너뜀
- [ ] 에러 상황에서도 synthesis 기본 기능 동작함