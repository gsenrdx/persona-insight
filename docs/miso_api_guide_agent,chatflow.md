# 에이전트 / 챗플로우 API
---
## 채팅 메세지 보내기
### POST `/chat`

```bash
curl -X POST '{endpoint_address}/chat' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "inputs": {},
    "query": "What are the specs of the iPhone 13 Pro Max?",
    "mode": "streaming",
    "conversation_id": "",
    "user": "abc-123",
    "files": [
      {
        "type": "image",
        "transfer_method": "remote_url",
        "url": "https://miso.ai/logo/logo-site.png"
      }
    ]
}'
```

#### Request Body

| 필드 | 타입 | 설명 | 기본값 |
| --- | --- | --- | --- |
| **query** | string | 사용자의 입력 또는 질문 내용 | – |
| **inputs** | object | 앱에서 정의된 변수들의 값을 입력 (여러 key/value 쌍) | `{}` |
| **mode** | string | 응답 반환 방식<br/>• `streaming` (권장, SSE 스트리밍)<br/>• `blocking` (완료 후 일괄 반환) | – |
| **user** | string | 최종 사용자 식별자 (앱 내에서 고유해야 함) | – |
| **conversation_id** | string | 이전 대화를 이어서 진행할 때 이전 메시지의 `conversation_id` 전달 | – |
| **files** | array<object> | (Vision 지원 모델 한정) 첨부 파일 입력 | – |
| &nbsp;&nbsp;• type | string | 지원 타입 `image` 만 가능 | – |
| &nbsp;&nbsp;• transfer_method | string | `remote_url` 또는 `local_file` | – |
| &nbsp;&nbsp;• url | string | 이미지 URL (`remote_url` 방식) | – |
| &nbsp;&nbsp;• upload_file_id | string | 업로드된 파일 ID (`local_file` 방식) | – |
| **auto_gen_name** | bool | 대화 제목 자동 생성 여부 | `true` |

#### Response

* `response_mode` =`blocking` → **CompletionResponse**  
* `response_mode` =`streaming` → **ChunkCompletionResponse** 스트림

#### Errors

| HTTP Code | Error ID | 설명 |
| :--: | --- | --- |
| 404 | Conversation does not exists | 요청한 conversation 없음 |
| 400 | invalid_param | 잘못된 파라미터 입력 |
| 400 | app_unavailable | 앱 설정 정보를 사용할 수 없음 |
| 400 | provider_not_initialize | 모델 인증 정보 미설정 |
| 400 | provider_quota_exceeded | 모델 호출 가능 쿼터 부족 |
| 400 | model_currently_not_support | 현재 모델 사용 불가 |
| 400 | completion_request_error | 텍스트 생성 요청 실패 |
| 500 | internal_server_error | 내부 서버 오류 |

---

## 파일 업로드

### POST `/files/upload`

```bash
curl -X POST 'https://<your-endpoint>/ext/v1/files/upload' \
--header 'Authorization: Bearer {api_key}' \
--form 'file=@localfile;type=image/[png|jpeg|jpg|webp|gif]' \
--form 'user=abc-123'
```

> 이미지 파일을 업로드하여 멀티모달 기능에 활용할 수 있습니다.  
> 지원 형식: **png, jpg, jpeg, webp, gif**

#### Request Body (multipart/form-data)

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | :--: | --- |
| **file** | File | ✓ | 업로드할 파일 |
| **user** | string | ✓ | 최종 사용자 식별자 (앱 내 고유) |

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| **id** | uuid | 파일 ID |
| **name** | string | 파일 이름 |
| **size** | int | 파일 크기 (bytes) |
| **extension** | string | 파일 확장자 |
| **mime_type** | string | MIME 타입 |
| **created_by** | uuid | 업로드한 사용자 ID |
| **created_at** | timestamp | 파일 생성 시각 |

#### Errors

| HTTP Code | Error ID | 설명 |
| :--: | --- | --- |
| 400 | no_file_uploaded | 파일 미제공 |
| 400 | too_many_files | 한 번에 하나만 업로드 가능 |
| 400 | unsupported_preview | 미리보기 미지원 |
| 400 | unsupported_estimate | 용량 추정 미지원 |
| 413 | file_too_large | 파일이 너무 큼 |
| 415 | unsupported_file_type | 허용되지 않은 파일 형식 |
| 503 | s3_connection_failed | S3 연결 실패 |
| 503 | s3_permission_denied | S3 업로드 권한 없음 |
| 503 | s3_file_too_large | S3 제한 초과 |
| 500 | internal_server_error | 내부 서버 오류 |

---

## 답변 생성 중지

### POST `/chat/:task_id/stop`

```bash
curl -X POST 'https://<your-endpoint>/ext/v1/chat/:task_id/stop' \
-H 'Authorization: Bearer {api_key}' \
-H 'Content-Type: application/json' \
--data-raw '{"user": "abc-123"}'
```

*스트리밍 모드에서만 사용 가능*

#### Path Parameter
| 이름 | 타입 | 설명 |
| --- | --- | --- |
| **task_id** | string | 스트리밍 청크 응답에서 획득한 태스크 ID |

#### Request Body
| 필드 | 타입 | 필수 | 설명 |
| --- | --- | :--: | --- |
| **user** | string | ✓ | 최종 사용자 식별자 (초기 user와 동일) |

#### Response

| 필드 | 타입 | 값 |
| --- | --- | --- |
| **result** | string | `"success"` |

---

## 다음 추천 질문 가져오기

### GET `/messages/{message_id}/suggest-questions`

```bash
curl --location --request GET 'https:<your-endpoint>/ext/v1/messages/{message_id}/suggest-questions?user=abc-123' \
--header 'Authorization: Bearer ENTER-YOUR-SECRET-KEY' \
--header 'Content-Type: application/json'
```

#### Path Parameter
| 이름 | 설명 |
| --- | --- |
| **message_id** | 기준 메시지 ID |

#### Query Parameters
| 이름 | 설명 |
| --- | --- |
| **user** | 최종 사용자 식별자 |

---

## 채팅 메시지 내역 가져오기

### GET `/messages`

```bash
curl -X GET 'https://<your-endpoint>/ext/v1/messages?user=abc-123&conversation_id=' \
--header 'Authorization: Bearer {api_key}'
```

> 최초 요청은 최신 `{limit}` 개의 메시지를 역순으로 반환

#### Query Parameters

| 이름 | 타입 | 설명 | 기본값 |
| --- | --- | --- | --- |
| **conversation_id** | string | 조회할 대화 ID | – |
| **user** | string | 최종 사용자 식별자 | – |
| **first_id** | string | 현재 페이지 첫 번째 메시지 ID | `null` |
| **limit** | int | 반환 메시지 수 | `20` (시스템 한도 초과 시 조정) |

#### Response

* **data** (array<object>): 메시지 목록  
  * **id**, **conversation_id**, **inputs**, **query**  
  * **message_files** (array<object>) → `id`, `type`, `url`, `belongs_to`  
  * **agent_thoughts** (array<object>) → `id`, `message_id`, `position`, `thought`, `observation`, `tool`, `tool_input`, `created_at`  
  * **message_files** (array<string>): 참조용 파일 ID  
  * **file_id**, **answer**, **created_at**, **feedback**, **retriever_resources**  
* **has_more** (bool)  
* **limit** (int)

---

## 대화 목록 가져오기

### GET `/conversations`

```bash
curl -X GET 'https://<your-endpoint>/ext/v1/conversations?user=abc-123&last_id=&limit=20' \
--header 'Authorization: Bearer {api_key}'
```

#### Query Parameters

| 이름 | 타입 | 설명 | 기본값 |
| --- | --- | --- | --- |
| **user** | string | 최종 사용자 식별자 | – |
| **last_id** | string | 현재 페이지 마지막 대화 ID | `null` |
| **limit** | int | 조회 대화 수 (1–100) | `20` |
| **sort_by** | string | 정렬 기준 (`created_at`, `-created_at`, `updated_at`, `-updated_at`) | `-updated_at` |

#### Response

* **data** (array<object>): 대화 목록 → `id`, `name`, `inputs`, `status`, `introduction`, `created_at`, `updated_at`  
* **has_more** (bool)  
* **limit** (int)

---

## 대화 삭제하기

### DELETE `/conversations/:conversation_id`

```bash
curl -X DELETE 'https://<your-endpoint>/ext/v1/conversations/:conversation_id' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{ 
 "user": "abc-123"
}'
```

#### Path Parameter
| 이름 | 타입 | 설명 |
| --- | --- | --- |
| **conversation_id** | string | 삭제할 대화 ID |

#### Request Body
| 필드 | 타입 | 필수 | 설명 |
| --- | --- | :--: | --- |
| **user** | string | ✓ | 최종 사용자 식별자 |

#### Response

| 필드 | 타입 | 값 |
| --- | --- | --- |
| **result** | string | `"success"` |

---

## 대화 이름 변경하기

### POST `/conversations/:conversation_id/rename`

```bash
curl -X POST 'https://<your-endpoint>/ext/v1/conversations/:conversation_id/rename' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{ 
 "name": "", 
 "auto_gen": true, 
 "user": "abc-123"
}'
```

#### Path Parameter
| 이름 | 설명 |
| --- | --- |
| **conversation_id** | 이름을 변경할 대화 ID |

#### Request Body

| 필드 | 타입 | 필수 | 설명 | 기본값 |
| --- | --- | :--: | --- | --- |
| **name** | string | – | 변경할 대화 이름 | – |
| **auto_generate** | bool | – | 대화 제목 자동 생성 여부 | `false` |
| **user** | string | ✓ | 최종 사용자 식별자 | – |

#### Response

* `id`, `name`, `inputs`, `status`, `introduction`, `created_at`, `updated_at`

---

## 앱 기본 정보 가져오기

### GET `/info`

```bash
curl -X GET 'https://<your-endpoint>/ext/v1/info?user=abc-123' \
-H 'Authorization: Bearer {api_key}'
```

#### Query Parameters
| 이름 | 설명 |
| --- | --- |
| **user** | 최종 사용자 식별자 |

#### Response

* **name** – 애플리케이션 이름  
* **description** – 애플리케이션 설명  
* **tags** – 태그 목록

---

## 앱 파라미터 조회

### GET `/params`

```bash
curl -X GET 'https://<your-endpoint>/ext/v1/params?user=abc-123'
```

> 기능, 입력 파라미터 이름·타입·기본값 정보를 반환

#### Query Parameters
| 이름 | 설명 |
| --- | --- |
| **user** | 최종 사용자 식별자 |

---

## 앱 메타 정보 조회

### GET `/meta`

```bash
curl -X GET 'https://<your-endpoint>/ext/v1/meta?user=abc-123' \
-H 'Authorization: Bearer {api_key}'
```

#### Query Parameters
| 이름 | 설명 |
| --- | --- |
| **user** | 최종 사용자 식별자 |

---

## 스트리밍 응답 처리 가이드

### 스트리밍 응답 개요

스트리밍 모드(`mode: "streaming"`)는 SSE(Server-Sent Events)를 통해 실시간으로 응답을 전달합니다. 응답 형식:

```plaintext
data: {"event": "agent_message", "answer": "텍스트 일부", "conversation_id": "대화 ID", "message_id": "메시지 ID"}
```

### 서버 측 구현 (Next.js)

```typescript
// app/api/chat/route.ts
export async function POST(request: NextRequest) {
  // SSE 헤더 설정
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  }
  
  // 스트리밍 설정
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  
  // 백그라운드에서 MISO API 요청 및 응답 처리
  ;(async () => {
    try {
      const misoResponse = await fetch("https://api.holdings.miso.gs/ext/v1/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MISO_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ /* MISO API 요청 */ }),
      })
      
      // MISO API 응답 스트림 처리
      const reader = misoResponse.body.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        await writer.write(encoder.encode(chunk))
      }
    } catch (error) {
      console.error("스트리밍 처리 오류:", error)
    } finally {
      await writer.close()
    }
  })()
  
  // 스트리밍 응답 반환
  return new NextResponse(stream.readable, { headers })
}
```

### 클라이언트 측 구현

스트리밍 응답을 클라이언트에서 처리하는 주요 단계:

1. SSE 연결 설정
2. 수신된 이벤트 데이터 파싱
3. 이벤트 유형에 따른 UI 업데이트 처리

```typescript
const processStreamingResponse = async (message: string, messageId: string) => {
  // SSE 연결 설정
  const response = await fetch("/api/chat", { /* 요청 설정 */ })
  
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let currentContent = ""
  
  // 스트리밍 처리
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    const chunk = decoder.decode(value, { stream: true })
    
    // 이벤트 데이터 처리
    const lines = chunk.split("\n")
    for (const line of lines) {
      if (line.startsWith("data:")) {
        try {
          const jsonStr = line.slice(5).trim()
          if (jsonStr === "[DONE]") continue
          
          const data = JSON.parse(jsonStr)
          // 이벤트 타입에 따른 처리
          // - agent_message: 메시지 내용 추가
          // - agent_thought: 에이전트 생각 과정
          // - message_replace: 전체 메시지 대체
        } catch (e) {
          console.error("JSON 파싱 오류:", e)
        }
      }
    }
  }
}
```

### 주요 이벤트 타입

- `agent_message`: 메시지 내용 추가
- `agent_thought`: 에이전트 생각 과정
- `message_replace`: 전체 메시지 대체

### 최적화 팁

1. 불필요한 DOM 업데이트 최소화
2. 메모리 사용량 관리 (오래된 메시지 제거)
3. 효율적인 상태 업데이트 (함수형 업데이트 사용)
4. 디바운싱 및 스로틀링 적용