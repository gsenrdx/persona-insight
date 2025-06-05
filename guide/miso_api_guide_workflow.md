# 모듈 API

## 모듈 실행하기

### Request Body

```bash
curl -X POST '{endpoint_address}/workflows/run' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
"inputs": {},
"mode": "streaming",
"user": "abc-123"
}'
```

API-URL은 각사 설치 환경에 따라 달라집니다.

- **inputs (object) 필수**: 앱(App) 내에서 정의된 변수에 대한 값들을 입력합니다.
  - 여러 개의 key/value 쌍으로 구성되며, 각각의 key는 변수명, value는 해당 변수의 입력값입니다.
  - 최소 1개 이상의 key/value 쌍이 필요합니다.
  - 파일 타입 변수의 경우, 아래 files 항목에서 설명하는 형식에 맞는 객체로 입력해야 합니다.
- **mode (string) 필수**: 응답 반환 방식으로, 다음 두 가지 모드를 지원합니다:
  - `streaming`: 스트리밍 모드 (권장)
    - Server-Sent Events(SSE)를 활용하여 결과를 순차적으로 반환합니다.
  - `blocking`: 블로킹 모드
    - 모든 실행이 완료된 후 결과를 한 번에 반환합니다.
- **user (string) 필수**: 최종 사용자 식별자
  - 통계 및 조회 목적 사용할 사용자 이름입니다.
  - 필요에 따라 임의로 지정하여 사용합니다.
- **files (array[object]) 선택**: 텍스트 이해 및 질문 응답에 파일 입력이 필요한 경우 사용합니다.
  - 해당 모델이 파일 파싱 및 이해 기능을 지원하는 경우에만 사용 가능합니다.
  - **type**: 지원되는 파일 타입
    - 문서(Document): TXT, MD, MARKDOWN, PDF, HTML, XLSX, XLS, DOCX, CSV, EML, MSG, PPTX, PPT, XML, EPUB
    - 이미지(Image): JPG, JPEG, PNG, GIF, WEBP, SVG
    - 오디오(Audio): MP3, M4A, WAV, WEBM, AMR
    - 비디오(Video): MP4, MOV, MPEG, MPGA
    - 기타(Custom): 기타 확장자 파일
  - **transfer_method (string)**: 파일 전달 방식 설정:
    - `remote_url`: URL을 통한 이미지 전달
    - `local_file`: 파일 업로드 API를 통해 업로드한 파일 ID를 이용
  - **url (string)**: transfer_method가 remote_url일 경우 사용
    - 전달할 이미지의 URL 입력
  - **upload_file_id (string)**: transfer_method가 local_file일 경우 사용
    - 파일 업로드 API를 통해 사전 업로드한 파일의 ID 입력

### Response

- **response_mode에 따른 응답 형식**
  - `blocking` 모드일 경우: CompletionResponse 객체를 반환
  - `streaming` 모드일 경우: ChunkCompletionResponse 스트림을 반환

### Errors

- **400, invalid_param**: 잘못된 파라미터 입력
- **400, app_unavailable**: 앱(App) 설정 정보를 사용할 수 없음
- **400, provider_not_initialize**: 사용할 수 있는 모델 인증 정보가 없음
- **400, provider_quota_exceeded**: 모델 호출 쿼터(Quota) 초과
- **400, model_currently_not_support**: 현재 모델을 사용할 수 없음
- **400, workflow_request_error**: 워크플로우 실행 실패
- **500, internal_server_error**: 내부 서버 오류

## 모듈 실행 세부 정보 받기

```bash
curl -X GET 'https://<your-endpoint>/ext/v1/workflows/run/:workflow_id' \
-H 'Authorization: Bearer {api_key}' \
-H 'Content-Type: application/json'
```

모듈 실행 ID를 기반으로 해당 모듈 태스크의 현재 실행 결과를 조회합니다.

API-URL은 각사 설치 환경에 따라 달라집니다.

- **path**
  - **workflow_id (string)**: 모듈 ID
    - 스트리밍 청크 응답에서 획득 가능

### Response

- **id (string)**: 모듈 실행 ID
- **workflow_id (string)**: 관련 모듈 ID
- **status (string)**: 실행 상태 (running, succeeded, failed, stopped)
- **inputs (json)**: 입력 값 내용
- **outputs (json)**: 출력 값 내용
- **error (string)**: 오류 사유
- **total_steps (int)**: 전체 실행 단계 수
- **total_tokens (int)**: 사용된 전체 토큰 수
- **created_at (timestamp)**: 실행 시작 시각
- **finished_at (timestamp)**: 실행 완료 시각
- **elapsed_time (float)**: 전체 소요 시간(초)

## 답변 생성 중단

```bash
curl -X POST 'https://<your-endpoint>/ext/v1/workflows/tasks/:task_id/stop' \
-H 'Authorization: Bearer {api_key}' \
-H 'Content-Type: application/json' \
--data-raw '{"user": "abc-123"}'
```

스트리밍 모드에서만 지원되는 응답 중단 요청 API입니다.

### Path Parameter

- **task_id (string)**: 태스크 ID
  - 스트리밍 청크 응답에서 획득 가능

### Request Body

- **user (string) 필수**: 최종 사용자 식별자
  - 초기 요청(send message) 시 전달된 user 값과 동일해야 함

### Response

- **result (string)**: 항상 "success" 반환

## 실행 로그 가져오기

```bash
curl -X GET 'https://<your-endpoint>/ext/v1/workflows/logs'\
--header 'Authorization: Bearer {api_key}'
```

모듈 실행 로그를 조회하는 API입니다.

최신 로그부터 역순으로 반환되며, 첫 페이지에서는 {limit} 개수만큼 가장 최근 메시지를 반합니다.

### Query Parameters

- **keyword (string)**: 검색 키워드
- **status (string)**: 실행 상태 필터
  - `succeeded`, `failed`, `stopped` 중 하나
- **page (int)**: 현재 페이지 번호 (기본값: 1)
- **limit (int)**: 한 번에 조회할 로그 메시지 개수 (기본값: 20)
  - 입력값이 시스템 제한을 초과할 경우, 시스템 제한 수만큼 반환됨

### Response

- **page (int)**: 현재 페이지 번호
- **limit (int)**: 반환된 항목 수 (시스템 제한 적용 시 그 값으로 대체됨)
- **total (int)**: 전체 항목 수
- **has_more (bool)**: 다음 페이지 존재 여부
- **data (array[object])**: 로그 목록
  - **id (string)**: 로그 ID
  - **workflow_run (object)**: 실행 정보
    - **id (string)**: 실행 ID
    - **version (string)**: 모듈 버전
    - **status (string)**: 실행 상태 (running, succeeded, failed, stopped)
    - **error (string)**: [선택] 오류 메시지
    - **elapsed_time (float)**: 실행 소요 시간(초)
    - **total_tokens (int)**: 사용된 토큰 수
    - **total_steps (int)**: 실행 단계 수 (기본값 0)
    - **created_at (timestamp)**: 실행 시작 시각
    - **finished_at (timestamp)**: 실행 종료 시각
  - **created_from (string)**: 생성 위치
  - **created_by_role (string)**: 생성한 주체의 역할
  - **created_by_account (string)**: [선택] 생성한 계정 정보
  - **created_by_end_user (object)**: 최종 사용자 정보
    - **id (string)**: 사용자 ID
    - **type (string)**: 사용자 유형
    - **is_anonymous (bool)**: 익명 여부
    - **session_id (string)**: 세션 ID
    - **created_at (timestamp)**: 생성 시각