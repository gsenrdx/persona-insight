# 페르소나 분류 기준 - MISO 데이터셋 통합 구현 계획

## 개요

페르소나 분류 기준(`persona_criteria_configurations`)이 생성될 때, MISO API를 활용하여 빈 지식 데이터셋을 생성하고 해당 데이터셋 ID를 데이터베이스에 저장하는 기능을 구현합니다. 이는 향후 페르소나별 맞춤형 지식 베이스 구축의 기반이 됩니다.

## 현재 시스템 분석

### 데이터베이스 구조
- **personas 테이블**: `criteria_configuration_id`를 통해 분류 기준과 연결
- **persona_criteria_configurations 테이블**: 페르소나 매트릭스 설정 및 출력 구성 관리
- **현재 미존재**: MISO 데이터셋 ID를 저장할 필드

### MISO API 구조 (분석 완료)
- **빈 지식 생성 API**: `POST /ext/v1/datasets`
- **필수 파라미터**: `name`, `permission`
- **응답**: 데이터셋 ID 포함한 메타데이터

## 구현 계획

### 1. 데이터베이스 스키마 수정
**personas 테이블에 필드 추가:**
```sql
ALTER TABLE personas 
ADD COLUMN miso_dataset_id VARCHAR(255) NULL;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_personas_miso_dataset_id 
ON personas(miso_dataset_id);
```

**이유:** 각 페르소나별로 개별 데이터셋을 생성하여 맞춤형 지식 베이스를 구축하기 위함

### 2. 지식 관리 API 구현
**API 경로**: `/app/api/knowledge/` (신규 생성)

**구조:**
```
app/api/knowledge/
├── create/route.ts          # 빈 지식 데이터셋 생성
├── [datasetId]/route.ts     # 특정 데이터셋 조회/관리
└── list/route.ts            # 데이터셋 목록 조회
```

**주요 기능:**
- 빈 지식 데이터셋 생성 (`POST /api/knowledge/create`)
- 기존 데이터셋 조회 (`GET /api/knowledge/[datasetId]`)
- 데이터셋 목록 조회 (`GET /api/knowledge/list`)
- 에러 핸들링 및 재시도 로직

**API 호출 구조:**
```javascript
// 빈 지식 생성
POST https://api.holdings.miso.gs/ext/v1/datasets
Headers: {
  'Authorization': 'Bearer {MISO_API_KEY}',
  'Content-Type': 'application/json'
}
Body: {
  "name": "Persona-Criteria-{company_id}-{project_id}-{timestamp}",
  "permission": "only_me"
}
```

### 3. 페르소나 Sync API 수정
**파일**: `/app/api/personas/sync/route.ts`

**수정 사항:**
1. `criteria_configuration_id` 존재 시 데이터셋 ID 확인
2. 데이터셋 ID가 없으면 내부 API (`/api/knowledge/create`) 호출로 새 데이터셋 생성
3. 생성된 데이터셋 ID를 데이터베이스에 저장
4. 기존 페르소나 동기화 로직은 그대로 유지

**새로운 로직 플로우:**
```
페르소나별 데이터셋 처리:
1. 각 페르소나 처리 시 miso_dataset_id 확인
2. miso_dataset_id가 null인가?
   ├─ Yes: POST /api/knowledge/create 호출
   │       페르소나별 데이터셋 생성 (이름: Persona-{persona_type}-{timestamp})
   │       생성된 ID를 해당 personas.miso_dataset_id에 저장
   └─ No: 기존 데이터셋 ID 사용
3. 페르소나 데이터 저장/업데이트
```

**API 호출 예시:**
```javascript
// 페르소나별 데이터셋 생성
const response = await fetch('/api/knowledge/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: `Persona-${persona.persona_type}-${Date.now()}`
  })
});
```

### 4. 환경 변수 확인
**필요한 환경 변수:**
- `MISO_API_URL`: api.holdings.miso.gs (이미 존재)
- `MISO_KNOWLEDGE_API_KEY`: MISO 지식 API 전용 키 (신규 추가)

## 구현 세부사항

### 데이터셋 명명 규칙
```
"{company_name}-{persona_type}"
```
**예시:**
- `MISO홀딩스-실용주의자`
- `테크스타트업-혁신가`
- `글로벌기업-보수주의자`

**제한사항:**
- MISO API 제한으로 최대 40자
- 특수문자 제거 (영문, 숫자, 한글만 허용)
- 회사명 조회 실패 시 company_id 사용

### 에러 처리 전략
1. **MISO API 호출 실패**: 3회 재시도 후 에러 반환
2. **네트워크 타임아웃**: 10초 타임아웃 설정
3. **데이터베이스 저장 실패**: 트랜잭션 롤백

### 로깅 전략
- 데이터셋 생성 요청/응답 로그
- 데이터베이스 저장 성공/실패 로그
- 에러 발생 시 상세 로그 (API 응답, 스택 트레이스)

## 보안 고려사항

1. **API 키 관리**: 환경 변수로 관리, 코드에 하드코딩 금지
2. **권한 설정**: MISO 데이터셋 권한을 `only_me`로 설정
3. **입력 검증**: company_id, project_id 유효성 검사

## 테스트 계획

### 단위 테스트
- MISO API 호출 함수 테스트
- 데이터셋 ID 저장 로직 테스트
- 에러 처리 시나리오 테스트

### 통합 테스트
- 전체 페르소나 동기화 플로우 테스트
- 기존 데이터셋 재사용 시나리오 테스트
- 동시성 처리 테스트 (여러 사용자가 동시에 페르소나 생성)

## 마이그레이션 전략

### 기존 데이터 처리
- 이미 존재하는 `persona_criteria_configurations`의 `miso_dataset_id`는 NULL 상태
- 다음 페르소나 동기화 시 자동으로 데이터셋 생성 및 ID 저장
- 데이터 일관성 유지를 위한 점진적 마이그레이션

## 예상 성능 영향

- **MISO API 호출**: 최초 1회만 발생 (이후 재사용)
- **데이터베이스 쿼리**: 1회 추가 SELECT/UPDATE
- **전체 응답 시간**: 최초 생성 시 +2-3초, 이후 변화 없음

## 향후 확장 계획

1. **페르소나별 지식 추가**: 생성된 데이터셋에 페르소나 관련 문서 추가
2. **지식 검색 기능**: 페르소나별 맞춤형 정보 검색
3. **데이터셋 관리**: 불필요한 데이터셋 정리 및 관리 기능

## 구현 우선순위

1. **High**: 데이터베이스 스키마 수정
2. **High**: MISO API 통합 함수 구현
3. **Medium**: 페르소나 Sync API 수정
4. **Low**: 테스트 및 문서화

---

이 계획을 통해 페르소나 분류 기준과 MISO 지식 데이터셋을 연결하여, 향후 AI 기반 페르소나 인사이트 기능의 기반을 마련할 수 있습니다.