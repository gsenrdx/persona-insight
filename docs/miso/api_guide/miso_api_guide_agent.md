MISO_Agent API Guide

<ui 지침>
- framer 라이브러리를 사용하여 부드러운 애니메이션을 구현한다.
- markdown 관련 라이브러리를 사용하여 메세지 박스에 마크다운서식이 파싱되어 적용되게한다.
- 모바일과 pc 모두 최적화된 반응형 디자인으로 컴포넌트를 하나씩 검토한다.
</ui지침>

<api_guide>

- 사용자가 MISO 서비스에 API를 연동 요청할 경우 사용합니다.
- 사용자가 API 응답을 알 수 있도록 필수 요소를 console.log 로 추가한다.
- 사용자에게 필요한 환경 변수를 miso_api_key 로 추가하도록 가이드한다.

#### 사용 예시
```
채팅 메세지 보내기:
- endpoint: https://https://api.holdings.miso.gs/ext/v1/chat
- Authorization: Bearer {api_key}
- Content-Type: application/json
- Body:
{
  "inputs": {},
  "query": "What are the specs of the iPhone 13 Pro Max?",
  "mode": "blocking",
  "conversation_id": "",
  "user": "abc-123",
  "files": [
    {
      "type": "image",
      "transfer_method": "remote_url",
      "url": "https://miso.ai/logo/logo-site.png"
    }
  ]
}
```

#### 파라미터
- query (string): 사용자의 입력 또는 질문 내용
- inputs (object): 앱에서 정의된 변수들의 값을 입력 (key/value 쌍)
- mode (string): 응답 반환 방식 (streaming | blocking)
- user (string): 최종 사용자 식별자
- conversation_id (string): 이전 대화 ID (있을 경우)
- files (array[object]): 이미지 등 파일 입력 (Vision 지원 모델만)
  - type (string): 지원 타입 (image)
  - transfer_method (string): 전달 방식 (remote_url | local_file)
  - url (string): 이미지 URL (remote_url일 때)
  - upload_file_id (string): 업로드된 파일 ID (local_file일 때)
- auto_gen_name (bool): 대화 제목 자동 생성 여부 (기본값 true)

#### 응답
- response_mode가 blocking: CompletionResponse 객체 반환
- response_mode가 streaming: ChunkCompletionResponse 스트림 반환

#### 에러
- 404: Conversation does not exists
- 400: invalid_param, app_unavailable, provider_not_initialize, provider_quota_exceeded, model_currently_not_support, completion_request_error
- 500: internal_server_error

---

### 파일 업로드 (POST /files/upload)

#### 사용 예시
```
파일 업로드:
- endpoint: https://<your-endpoint>/ext/v1/files/upload
- Authorization: Bearer {api_key}
- Content-Type: multipart/form-data
- file: @localfile;type=image/[png|jpeg|jpg|webp|gif]
- user: abc-123
```

#### 파라미터
- file (File, 필수): 업로드할 파일
- user (string, 필수): 최종 사용자 식별자

#### 응답
- id (uuid): 파일 ID
- name (string): 파일 이름
- size (int): 파일 크기 (바이트)
- extension (string): 파일 확장자
- mime_type (string): MIME 타입
- created_by (uuid): 업로더 ID
- created_at (timestamp): 생성 시각

#### 에러
- 400: no_file_uploaded, too_many_files, unsupported_preview, unsupported_estimate
- 413: file_too_large
- 415: unsupported_file_type
- 503: s3_connection_failed, s3_permission_denied, s3_file_too_large
- 500: internal_server_error

---

### 답변 생성 중지 (POST /chat/:task_id/stop)

#### 사용 예시
```
답변 생성 중지:
- endpoint: https://<your-endpoint>/ext/v1/chat/:task_id/stop
- Authorization: Bearer {api_key}
- Content-Type: application/json
- Body: {"user": "abc-123"}
```

#### 파라미터
- task_id (string, path): 태스크 ID
- user (string): 최종 사용자 식별자

#### 응답
- result (string): 항상 "success"

---

### 다음 추천 질문 가져오기 (GET /messages/{message_id}/suggest-questions)

#### 사용 예시
```
다음 추천 질문 가져오기:
- endpoint: https://<your-endpoint>/ext/v1/messages/{message_id}/suggest-questions?user=abc-123
- Authorization: Bearer {api_key}
- Content-Type: application/json
```

#### 파라미터
- message_id (string, path): 기준 메시지 ID
- user (string): 최종 사용자 식별자

---

### 채팅 메시지 내역 가져오기 (GET /messages)

#### 사용 예시
```
채팅 메시지 내역 가져오기:
- endpoint: https://<your-endpoint>/ext/v1/messages?user=abc-123&conversation_id=
- Authorization: Bearer {api_key}
```

#### 파라미터
- conversation_id (string): 조회할 대화 ID
- user (string): 최종 사용자 식별자
- first_id (string): 현재 페이지 첫 메시지 ID (기본 null)
- limit (int): 반환 메시지 수 (기본 20)

#### 응답
- data (array[object]): 메시지 목록 (id, conversation_id, inputs, query, message_files, agent_thoughts, answer, created_at, feedback 등)
- has_more (bool): 다음 페이지 존재 여부
- limit (int): 반환 메시지 수

---

### 대화 목록 가져오기 (GET /conversations)

#### 사용 예시
```
대화 목록 가져오기:
- endpoint: https://<your-endpoint>/ext/v1/conversations?user=abc-123&last_id=&limit=20
- Authorization: Bearer {api_key}
```

#### 파라미터
- user (string): 최종 사용자 식별자
- last_id (string): 현재 페이지 마지막 대화 ID (기본 null)
- limit (int): 조회 대화 수 (기본 20, 최대 100)
- sort_by (string): 정렬 기준 (기본 -updated_at)

#### 응답
- data (array[object]): 대화 목록 (id, name, inputs, status, introduction, created_at, updated_at 등)
- has_more (bool): 다음 페이지 존재 여부
- limit (int): 반환 대화 수

---

### 대화 삭제하기 (DELETE /conversations/:conversation_id)

#### 사용 예시
```
대화 삭제하기:
- endpoint: https://<your-endpoint>/ext/v1/conversations/:conversation_id
- Authorization: Bearer {api_key}
- Content-Type: application/json
- Body: {"user": "abc-123"}
```

#### 파라미터
- conversation_id (string, path): 삭제할 대화 ID
- user (string): 최종 사용자 식별자

#### 응답
- result (string): 항상 "success"

---

### 대화 이름 변경하기 (POST /conversations/:conversation_id/rename)

#### 사용 예시
```
대화 이름 변경하기:
- endpoint: https://<your-endpoint>/ext/v1/conversations/:conversation_id/rename
- Authorization: Bearer {api_key}
- Content-Type: application/json
- Body: { "name": "", "auto_gen": true, "user": "abc-123" }
```

#### 파라미터
- conversation_id (string, path): 이름 변경할 대화 ID
- name (string): 변경할 대화 이름 (auto_generate true면 생략 가능)
- auto_generate (bool): 자동 생성 여부 (기본 false)
- user (string): 최종 사용자 식별자

#### 응답
- id (string): 대화 ID
- name (string): 변경된 대화 이름
- inputs (object): 사용자 입력 파라미터
- status (string): 대화 상태
- introduction (string): 대화 소개
- created_at (timestamp): 생성 시각
- updated_at (timestamp): 마지막 업데이트 시각

---

### 앱 기본 정보 가져오기 (GET /info)

#### 사용 예시
```
앱 기본 정보 가져오기:
- endpoint: https://<your-endpoint>/ext/v1/info?user=abc-123
- Authorization: Bearer {api_key}
```

#### 파라미터
- user (string): 최종 사용자 식별자

#### 응답
- name: 애플리케이션 이름
- description: 애플리케이션 설명
- tags: 태그 목록

---

### 앱 파라미터 조회 (GET /params)

#### 사용 예시
```
앱 파라미터 조회:
- endpoint: https://<your-endpoint>/ext/v1/params?user=abc-123
```

#### 파라미터
- user (string): 최종 사용자 식별자

---

### 앱 메타 정보 조회 (GET /meta)

#### 사용 예시
```
앱 메타 정보 조회:
- endpoint: https://<your-endpoint>/ext/v1/meta?user=abc-123
- Authorization: Bearer {api_key}
```

#### 파라미터
- user (string): 최종 사용자 식별자