# MISO API 매뉴얼

이 문서는 MISO의 지식 API 사용법을 상세히 안내합니다. 각 API 엔드포인트에 대한 설명, 요청 및 응답 예시, 그리고 관련 필드 정보를 포함하고 있습니다.

## 1. 지식 API Key 발급 받기

상단 메뉴바에서 "지식 관리"를 클릭하여 지식 관리 화면으로 이동합니다.
지식 관리 화면의 우측 상단의 "API" 버튼을 클릭하여 지식 API 키 관리 화면으로 이동합니다.
지식 API 키 관리 화면에서 "API 키 생성" 버튼을 클릭하여 새로운 API키를 발급 받을 수 있습니다. 이 API 키를 header의 `Authorization`에 `Bearer {api_key}` 와 같은 형식으로 입력하여 지식 API를 호출할 수 있습니다.

## 2. 텍스트로 문서 생성하기

기존 지식에 텍스트로 새로운 문서를 생성합니다.

### 요청 예시

```shell
curl --location --request POST 'https://<your-endpoint>/ext/v1/datasets/{id}/docs/text' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "name": "text",
  "text": "text",
  "indexing_type": "high_quality",
  "process_rule": {
    "mode": "automatic"
  }
}'
```

### 입력 필드 설명

| 필드명            | 설명                                   |
|-------------------|----------------------------------------|
| `name`            | 생성할 문서의 이름                       |
| `text`            | 문서에 포함될 실제 텍스트 데이터         |
| `indexing_type`   | 문서를 인덱싱하는 기법. 예: `high_quality` |
| `process_rule`    | 문서 처리 규칙 객체                      |
| `process_rule.mode` | 문서 처리 방식. 예: `"automatic"`      |

### 응답 예시

```json
{
  "document": {
    "id": "",
    "position": 1,
    "data_source_type": "upload_file",
    "data_source_info": {
      "upload_file_id": ""
    },
    "dataset_process_rule_id": "",
    "name": "text.txt",
    "created_from": "api",
    "created_by": "",
    "created_at": 1709999988,
    "tokens": 0,
    "indexing_status": "waiting",
    "error": null,
    "enabled": true,
    "disabled_at": null,
    "disabled_by": null,
    "archived": false,
    "display_status": "queuing",
    "word_count": 0,
    "hit_count": 0,
    "doc_form": "text_model"
  },
  "batch": ""
}
```

### 응답 필드 설명

| 필드명                      | 설명                     |
|-----------------------------|--------------------------|
| `id`                        | 문서의 고유 ID           |
| `position`                  | 문서의 위치              |
| `data_source_type`          | 데이터 소스 유형         |
| `data_source_info`          | 데이터 소스 정보         |
| `upload_file_id`            | 업로드된 파일의 ID       |
| `dataset_process_rule_id`   | 문서 처리 규칙 ID        |
| `name`                      | 문서 이름                |
| `created_from`              | 생성 출처                |
| `created_by`                | 생성자 ID                |
| `created_at`                | 생성 시각 (Unix 시간)    |
| `tokens`                    | 토큰 수                  |
| `indexing_status`           | 인덱싱 상태              |
| `error`                     | 오류 정보                |
| `enabled`                   | 활성화 여부              |
| `disabled_at`               | 비활성화된 시각          |
| `disabled_by`               | 비활성화 처리한 주체     |
| `archived`                  | 아카이브 여부            |
| `display_status`            | 문서의 표시 상태         |
| `word_count`                | 단어 수                  |
| `hit_count`                 | 조회 수                  |
| `doc_form`                  | 문서 형식                |
| `batch`                     | 배치 ID                  |

## 3. 파일로 문서 생성하기

기존 지식에 파일로 새로운 문서를 생성합니다.

### 요청 예시

```shell
curl --location --request POST 'https://<your-endpoint>/ext/v1/datasets/{id}/docs/file' \
--header 'Authorization: Bearer {api_key}' \
--form 'data="{"indexing_type":"high_quality","process_rule":{"rules":{"pre_processing_rules":[{"org_doc_id":"remove_extra_spaces","enabled":true},{"org_doc_id":"remove_urls_emails","enabled":true}],"segmentation":{"separator":"###","max_tokens":500}},"mode":"custom"}}";type=text/plain' \
--form 'file=@"/path/to/file"'
```

### 입력 필드 설명

| 필드명                           | 설명                                                                    |
|----------------------------------|-------------------------------------------------------------------------|
| `file`                           | 업로드할 파일 경로                                                      |
| `data`                           | 문서 처리에 대한 설정 정보 JSON 문자열                                      |
| `indexing_type`                  | 문서를 인덱싱하는 기법. 예: `high_quality`                                |
| `process_rule`                   | 문서 처리 규칙 객체                                                       |
| `process_rule.mode`              | 문서 처리 방식. 예: `"custom"`                                            |
| `pre_processing_rules`           | 사전 처리 규칙 목록                                                       |
| `org_doc_id`                     | 적용할 사전 처리 규칙의 ID (예: `remove_extra_spaces`, `remove_urls_emails`) |
| `enabled`                        | 해당 사전 처리 규칙의 활성화 여부                                         |
| `segmentation.separator`         | 문서 분할 시 사용하는 구분자. 예: `"###"`                                 |
| `segmentation.max_tokens`        | 문서 분할 시 한 세그먼트 내 최대 토큰 수. 예: `500`                         |

### 응답 예시

```json
{
  "document": {
    "id": "",
    "position": 1,
    "data_source_type": "upload_file",
    "data_source_info": {
      "upload_file_id": ""
    },
    "dataset_process_rule_id": "",
    "name": "my_doc.txt",
    "created_from": "api",
    "created_by": "",
    "created_at": 1709999912,
    "tokens": 0,
    "indexing_status": "waiting",
    "error": null,
    "enabled": true,
    "disabled_at": null,
    "disabled_by": null,
    "archived": false,
    "display_status": "queuing",
    "word_count": 0,
    "hit_count": 0,
    "doc_form": "text_model"
  },
  "batch": ""
}
```

### 응답 필드 설명

(응답 필드 설명은 "2. 텍스트로 문서 생성하기"의 응답 필드 설명과 동일합니다.)

## 4. 빈 지식 생성하기

빈 지식을 생성하는 API입니다.

### 요청 예시

```shell
curl --location --request POST 'https://<your-endpoint>/ext/v1/datasets' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "name": "my_knowledge",
  "permission": "only_me"
}'
```

### 입력 필드 설명

| 필드명        | 설명                               |
|---------------|------------------------------------|
| `name`        | 생성할 지식의 이름                 |
| `permission`  | 접근 권한 설정. 예: `only_me`      |

### 응답 예시

```json
{
  "id": "",
  "name": "name",
  "description": null,
  "provider": "vendor",
  "permission": "only_me",
  "data_source_type": null,
  "indexing_technique": null,
  "app_count": 0,
  "document_count": 0,
  "word_count": 0,
  "created_by": "",
  "created_at": 1686706498,
  "updated_by": "",
  "updated_at": 1686706498,
  "embedding_model": null,
  "embedding_model_provider": null,
  "embedding_available": null
}
```

### 응답 필드 설명

| 필드명                       | 설명                     |
|------------------------------|--------------------------|
| `id`                         | 지식의 고유 ID           |
| `name`                       | 지식 이름                |
| `description`                | 지식 설명                |
| `provider`                   | 제공자 정보              |
| `permission`                 | 접근 권한 설정           |
| `data_source_type`           | 데이터 소스 유형         |
| `indexing_type`              | 인덱싱 기법              |
| `app_count`                  | 연결된 애플리케이션 수   |
| `document_count`             | 포함된 문서 수           |
| `word_count`                 | 전체 단어 수             |
| `created_by`                 | 생성자 ID                |
| `created_at`                 | 생성 시각 (Unix 시간)    |
| `updated_by`                 | 마지막 수정자 ID         |
| `updated_at`                 | 마지막 수정 시각 (Unix 시간) |
| `embedding_model`            | 임베딩 모델              |
| `embedding_model_provider`   | 임베딩 모델 제공자       |
| `embedding_available`        | 임베딩 사용 가능 여부    |

## 5. 지식 목록 조회하기

지식 목록을 조회하는 API입니다.

### 요청 예시

```shell
curl --location --request GET 'https://<your-endpoint>/ext/v1/datasets?page=1&limit=30' \
--header 'Authorization: Bearer {api_key}'
```

### 입력 필드 설명

| 필드명    | 설명                         |
|-----------|------------------------------|
| `page`    | 조회할 페이지 번호           |
| `limit`   | 한 페이지에 포함할 항목 개수 |

### 응답 예시

```json
{
  "data": [
    {
      "id": "",
      "name": "name",
      "description": "desc",
      "permission": "only_me",
      "data_source_type": "upload_file",
      "indexing_technique": "",
      "app_count": 3,
      "document_count": 10,
      "word_count": 1300,
      "created_by": "",
      "created_at": "",
      "updated_by": "",
      "updated_at": ""
    }
  ],
  "has_more": true,
  "limit": 30,
  "total": 70,
  "page": 1
}
```

### 응답 필드 설명

| 필드명                  | 설명                     |
|-------------------------|--------------------------|
| `data`                  | 지식 목록 배열           |
| `data[].id`             | 지식의 고유 ID           |
| `data[].name`           | 지식 이름                |
| `data[].description`    | 지식 설명                |
| `data[].permission`     | 접근 권한 설정           |
| `data[].data_source_type`| 데이터 소스 유형         |
| `data[].indexing_technique`| 인덱싱 기법              |
| `data[].app_count`      | 연결된 애플리케이션 수   |
| `data[].document_count` | 포함된 문서 수           |
| `data[].word_count`     | 전체 단어 수             |
| `data[].created_by`     | 생성자 ID                |
| `data[].created_at`     | 생성 시각                |
| `data[].updated_by`     | 마지막 수정자 ID         |
| `data[].updated_at`     | 마지막 수정 시각         |
| `has_more`              | 다음 페이지 존재 여부    |
| `limit`                 | 요청 시 지정한 항목 수   |
| `total`                 | 전체 항목 수             |
| `page`                  | 현재 페이지 번호         |

## 6. 지식 삭제하기

지정한 지식을 삭제하는 API입니다.

### 요청 예시

```shell
curl --location --request DELETE 'https://<your-endpoint>/ext/v1/datasets/{dataset_id}' \
--header 'Authorization: Bearer {api_key}'
```

### 입력 필드 설명

| 필드명        | 설명                             |
|---------------|----------------------------------|
| `dataset_id`  | 삭제할 지식 베이스의 고유 ID     |

### 응답 예시

```
204 No Content
```

### 응답 필드 설명

| 상태 코드 | 설명                                         |
|-----------|----------------------------------------------|
| 204       | 성공적으로 삭제되었음을 의미함. 응답 본문 없음 |

## 7. 텍스트로 문서 업데이트하기

기존 지식의 문서를 텍스트로 업데이트하는 API입니다.

### 요청 예시

```shell
curl --location --request PUT 'https://<your-endpoint>/ext/v1/datasets/{dataset_id}/docs/{doc_id}/text' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "name": "name",
  "text": "text"
}'
```

### 입력 필드 설명

| 필드명        | 설명                                 |
|---------------|--------------------------------------|
| `dataset_id`  | 문서가 포함된 지식 베이스의 ID       |
| `doc_id`      | 업데이트할 문서의 ID                 |
| `name`        | 업데이트할 문서의 이름               |
| `text`        | 문서에 입력될 새로운 텍스트 내용     |

### 응답 예시

```json
{
  "document": {
    "id": "",
    "position": 1,
    "data_source_type": "upload_file",
    "data_source_info": {
      "upload_file_id": ""
    },
    "dataset_process_rule_id": "",
    "name": "name.txt",
    "created_from": "api",
    "created_by": "",
    "created_at": 1694240259,
    "tokens": 0,
    "indexing_status": "waiting",
    "error": null,
    "enabled": true,
    "disabled_at": null,
    "disabled_by": null,
    "archived": false,
    "display_status": "queuing",
    "word_count": 0,
    "hit_count": 0,
    "doc_form": "text_model"
  },
  "batch": ""
}
```

### 응답 필드 설명

(응답 필드 설명은 "2. 텍스트로 문서 생성하기"의 응답 필드 설명과 동일합니다.)

## 8. 파일로 문서 업데이트하기

기존 지식의 문서를 파일로 업데이트하는 API입니다.

### 요청 예시

```shell
curl --location --request PUT 'https://<your-endpoint>/ext/v1/datasets/{dataset_id}/docs/{doc_id}/file' \
--header 'Authorization: Bearer {api_key}' \
--form 'data="{"name":"name","indexing_technique":"high_quality","process_rule":{"rules":{"pre_processing_rules":[{"id":"remove_extra_spaces","enabled":true},{"id":"remove_urls_emails","enabled":true}],"segmentation":{"separator":"###","max_tokens":500}},"mode":"custom"}}";type=text/plain' \
--form 'file=@"/path/to/file"'
```

### 입력 필드 설명

| 필드명                             | 설명                                                              |
|------------------------------------|-------------------------------------------------------------------|
| `dataset_id`                       | 문서가 포함된 지식 베이스의 ID                                    |
| `doc_id`                           | 업데이트할 문서의 ID                                              |
| `file`                             | 업데이트할 파일                                                   |
| `data`                             | 문서 처리 방식 및 인덱싱 설정 정보가 포함된 JSON 문자열           |
| `name`                             | 업데이트할 문서의 이름                                            |
| `indexing_technique`               | 문서를 인덱싱하는 기법. 예: `high_quality`                        |
| `process_rule`                     | 문서 처리 규칙 객체                                               |
| `process_rule.mode`                | 문서 처리 방식. 예: `"custom"`                                    |
| `pre_processing_rules`             | 전처리 규칙 목록                                                  |
| `pre_processing_rules[].id`        | 적용할 전처리 규칙의 ID. 예: `remove_extra_spaces`                  |
| `pre_processing_rules[].enabled`   | 해당 전처리 규칙의 활성화 여부. `true` 또는 `false`               |
| `segmentation.separator`           | 텍스트 세분화 시 사용할 구분자. 예: `"###"`                       |
| `segmentation.max_tokens`          | 세그먼트당 최대 토큰 수. 예: `500`                                  |

### 응답 예시

```json
{
  "document": {
    "id": "",
    "position": 1,
    "data_source_type": "upload_file",
    "data_source_info": {
      "upload_file_id": ""
    },
    "dataset_process_rule_id": "",
    "name": "my_docs.txt",
    "created_from": "api",
    "created_by": "",
    "created_at": 1699728889,
    "tokens": 0,
    "indexing_status": "waiting",
    "error": null,
    "enabled": true,
    "disabled_at": null,
    "disabled_by": null,
    "archived": false,
    "display_status": "queuing",
    "word_count": 0,
    "hit_count": 0,
    "doc_form": "text_model"
  },
  "batch": "20240921160427555684"
}
```

### 응답 필드 설명

(응답 필드 설명은 "2. 텍스트로 문서 생성하기"의 응답 필드 설명과 거의 동일하며, `batch` 필드 값이 구체적인 예시로 제공됩니다.)

## 9. 문서 임베딩 상태 조회 (진행률 확인)

문서의 임베딩(인덱싱) 처리 상태 및 진행률을 조회하는 API입니다.

### 요청 예시

```shell
curl --location --request GET 'https://<your-endpoint>/ext/v1/datasets/{id}/docs/{batch}/status' \
--header 'Authorization: Bearer {api_key}'
```

### 입력 필드 설명

| 필드명  | 설명                                                 |
|---------|------------------------------------------------------|
| `id`    | 지식 ID                                              |
| `batch` | 문서 업로드 또는 처리 요청 시 생성된 배치 ID         |

### 응답 예시

```json
{
  "data": [{
    "id": "",
    "indexing_status": "indexing",
    "processing_started_at": 1703230131.0,
    "parsing_completed_at": 1703230131.0,
    "cleaning_completed_at": 1703230131.0,
    "splitting_completed_at": 1703230131.0,
    "completed_at": null,
    "paused_at": null,
    "error": null,
    "stopped_at": null,
    "completed_segments": 24,
    "total_segments": 100
  }]
}
```

### 응답 필드 설명

| 필드명                       | 설명                         |
|------------------------------|------------------------------|
| `id`                         | 문서의 고유 ID               |
| `indexing_status`            | 인덱싱 상태                  |
| `processing_started_at`      | 처리 시작 시각 (Unix 시간)   |
| `parsing_completed_at`       | 파싱 완료 시각 (Unix 시간)   |
| `cleaning_completed_at`      | 클린업 완료 시각 (Unix 시간) |
| `splitting_completed_at`     | 분할 완료 시각 (Unix 시간)   |
| `completed_at`               | 전체 인덱싱 완료 시각        |
| `paused_at`                  | 일시 중지된 시각             |
| `error`                      | 처리 중 발생한 오류 정보     |
| `stopped_at`                 | 중단된 시각                  |
| `completed_segments`         | 완료된 세그먼트 수           |
| `total_segments`             | 전체 세그먼트 수             |

## 10. 문서 삭제하기

지정한 문서를 삭제하는 API입니다.

### 요청 예시

```shell
curl --location --request DELETE 'https://<your-endpoint>/ext/v1/datasets/{dataset_id}/docs/{docs_id}' \
--header 'Authorization: Bearer {api_key}'
```

### 입력 필드 설명

| 필드명        | 설명                                 |
|---------------|--------------------------------------|
| `dataset_id`  | 문서가 포함된 지식 베이스의 ID       |
| `docs_id`     | 삭제할 문서의 고유 ID                |

### 응답 예시

```json
{
  "result": "success"
}
```

### 응답 필드 설명

| 필드명    | 설명       |
|-----------|------------|
| `result`  | 요청 결과  |

## 11. 지식의 문서 목록 조회하기

지정한 지식 베이스에 포함된 문서 목록을 조회하는 API입니다.

### 요청 예시

```shell
curl --location --request GET 'https://<your-endpoint>/ext/v1/datasets/{dataset_id}/docs' \
--header 'Authorization: Bearer {api_key}'
```

### 입력 필드 설명

| 필드명        | 설명                                 |
|---------------|--------------------------------------|
| `dataset_id`  | 문서를 조회할 지식 베이스의 ID       |

### 응답 예시

```json
{
  "data": [
    {
      "id": "",
      "position": 1,
      "data_source_type": "file_upload",
      "data_source_info": null,
      "dataset_process_rule_id": null,
      "name": "my_doc",
      "created_from": "",
      "created_by": "",
      "created_at": 1706152284,
      "tokens": 0,
      "indexing_status": "waiting",
      "error": null,
      "enabled": true,
      "disabled_at": null,
      "disabled_by": null,
      "archived": false
    }
  ],
  "has_more": false,
  "limit": 20,
  "total": 9,
  "page": 1
}
```

### 응답 필드 설명

| 필드명                          | 설명                     |
|---------------------------------|--------------------------|
| `data`                          | 문서 목록 배열           |
| `data[].id`                     | 문서의 고유 ID           |
| `data[].position`               | 문서의 위치              |
| `data[].data_source_type`       | 데이터 소스 유형         |
| `data[].data_source_info`       | 데이터 소스 정보         |
| `data[].dataset_process_rule_id`| 문서 처리 규칙 ID        |
| `data[].name`                   | 문서 이름                |
| `data[].created_from`           | 생성 출처                |
| `data[].created_by`             | 생성자 ID                |
| `data[].created_at`             | 생성 시각 (Unix 시간)    |
| `data[].tokens`                 | 토큰 수                  |
| `data[].indexing_status`        | 인덱싱 상태              |
| `data[].error`                  | 오류 정보                |
| `data[].enabled`                | 활성화 여부              |
| `data[].disabled_at`            | 비활성화된 시각          |
| `data[].disabled_by`            | 비활성화 처리한 주체     |
| `data[].archived`               | 아카이브 여부            |
| `has_more`                      | 다음 페이지 존재 여부    |
| `limit`                         | 요청 시 지정한 항목 수   |
| `total`                         | 전체 문서 수             |
| `page`                          | 현재 페이지 번호         |

## 12. 문서에 청크(Chunk) 추가하기

지정한 문서에 하나 이상의 청크(세그먼트)를 추가하는 API입니다.

### 요청 예시

```shell
curl --location --request POST 'https://<your-endpoint>/ext/v1/datasets/{dataset_id}/docs/{doc_id}/segments' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "segments": [
    {
      "content": "1",
      "answer": "1",
      "keywords": ["a"]
    }
  ]
}'
```

### 입력 필드 설명

| 필드명        | 설명                                 |
|---------------|--------------------------------------|
| `dataset_id`  | 지식 ID                              |
| `doc_id`      | 청크를 추가할 문서의 ID              |
| `segments`    | 추가할 세그먼트 배열                 |
| `content`     | 세그먼트의 텍스트 내용               |
| `answer`      | 해당 세그먼트에 대한 답변 또는 요약  |
| `keywords`    | 해당 세그먼트에 대한 키워드 목록     |

### 응답 예시

```json
{
  "data": [{
    "id": "",
    "position": 1,
    "document_id": "",
    "content": "1",
    "answer": "1",
    "word_count": 30,
    "tokens": 0,
    "keywords": [
      "a"
    ],
    "index_node_id": "",
    "index_node_hash": "",
    "hit_count": 0,
    "enabled": true,
    "disabled_at": null,
    "disabled_by": null,
    "status": "completed",
    "created_by": "",
    "created_at": 1707793442,
    "indexing_at": 1707793442,
    "completed_at": 1707793442,
    "error": null,
    "stopped_at": null
  }],
  "doc_form": "text_model"
}
```

### 응답 필드 설명

| 필드명                | 설명                               |
|-----------------------|------------------------------------|
| `id`                  | 세그먼트의 고유 ID                 |
| `position`            | 문서 내 세그먼트의 위치            |
| `document_id`         | 세그먼트가 속한 문서의 ID          |
| `content`             | 세그먼트의 텍스트 내용             |
| `answer`              | 세그먼트에 대한 요약 또는 답변     |
| `word_count`          | 세그먼트의 단어 수                 |
| `tokens`              | 세그먼트의 토큰 수                 |
| `keywords`            | 세그먼트와 관련된 키워드 목록      |
| `index_node_id`       | 인덱스 노드 ID                     |
| `index_node_hash`     | 인덱스 노드 해시값                 |
| `hit_count`           | 조회 횟수                          |
| `enabled`             | 활성화 여부                        |
| `disabled_at`         | 비활성화된 시각                    |
| `disabled_by`         | 비활성화 처리한 주체               |
| `status`              | 세그먼트 처리 상태                 |
| `created_by`          | 생성자 ID                          |
| `created_at`          | 생성 시각 (Unix 시간)              |
| `indexing_at`         | 인덱싱 시작 시각                   |
| `completed_at`        | 인덱싱 완료 시각                   |
| `error`               | 오류 정보                          |
| `stopped_at`          | 인덱싱 중단 시각                   |
| `doc_form`            | 문서 형식                          |

## 13. 문서에서 청크(Chunk) 조회하기

지정한 문서에 포함된 청크(세그먼트) 목록을 조회하는 API입니다.

### 요청 예시

```shell
curl --location --request GET 'https://<your-endpoint>/ext/v1/datasets/{dataset_id}/docs/{doc_id}/segments' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json'
```

### 입력 필드 설명

| 필드명        | 설명                                 |
|---------------|--------------------------------------|
| `dataset_id`  | 지식의 ID                            |
| `doc_id`      | 세그먼트를 조회할 문서의 ID          |

### 응답 예시

```json
{
  "data": [{
    "id": "",
    "position": 1,
    "document_id": "",
    "content": "1",
    "answer": "1",
    "word_count": 25,
    "tokens": 0,
    "keywords": [
      "a"
    ],
    "index_node_id": "",
    "index_node_hash": "",
    "hit_count": 0,
    "enabled": true,
    "disabled_at": null,
    "disabled_by": null,
    "status": "completed",
    "created_by": "",
    "created_at": 1695312007,
    "indexing_at": 1695312007,
    "completed_at": 1695312007,
    "error": null,
    "stopped_at": null
  }],
  "doc_form": "text_model"
}
```

### 응답 필드 설명

(응답 필드 설명은 "12. 문서에 청크(Chunk) 추가하기"의 응답 필드 설명과 동일합니다.)

## 14. 문서에서 청크(Chunk) 삭제하기

지정한 문서 내 특정 청크(세그먼트)를 삭제하는 API입니다.

### 요청 예시

```shell
curl --location --request DELETE 'https://<your-endpoint>/ext/v1/datasets/{dataset_id}/docs/{doc_id}/segments/{segment_id}' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json'
```

### 입력 필드 설명

| 필드명         | 설명                                 |
|----------------|--------------------------------------|
| `dataset_id`   | 지식 베이스의 ID                     |
| `document_id`  | 청크가 포함된 문서의 ID              |
| `segment_id`   | 삭제할 세그먼트(청크)의 고유 ID      |

### 응답 예시

```json
{
  "result": "success"
}
```

### 응답 필드 설명

| 필드명    | 설명       |
|-----------|------------|
| `result`  | 요청 결과  |

## 15. 문서 내 청크(Chunk) 업데이트하기

지정한 문서의 특정 청크(세그먼트)를 수정하는 API입니다.

### 요청 예시

```shell
curl --location --request PUT 'https://<your-endpoint>/ext/v1/datasets/{dataset_id}/docs/{doc_id}/segments/{segment_id}' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "segment": {
    "content": "1",
    "answer": "1",
    "keywords": ["a"],
    "enabled": false
  }
}'
```

### 입력 필드 설명

| 필드명         | 설명                                 |
|----------------|--------------------------------------|
| `dataset_id`   | 지식 베이스의 ID                     |
| `doc_id`       | 세그먼트가 포함된 문서의 ID          |
| `segment_id`   | 수정할 세그먼트의 고유 ID            |
| `segment`      | 수정할 세그먼트 정보 객체            |
| `content`      | 세그먼트의 텍스트 내용               |
| `answer`       | 세그먼트에 대한 요약 또는 답변     |
| `keywords`     | 세그먼트에 대한 키워드 목록          |
| `enabled`      | 세그먼트 활성화 여부 (`true` 또는 `false`) |

### 응답 예시

```json
{
  "data": [{
    "id": "",
    "position": 1,
    "document_id": "",
    "content": "1",
    "answer": "1",
    "word_count": 25,
    "tokens": 0,
    "keywords": [
      "a"
    ],
    "index_node_id": "",
    "index_node_hash": "",
    "hit_count": 0,
    "enabled": true,
    "disabled_at": null,
    "disabled_by": null,
    "status": "completed",
    "created_by": "",
    "created_at": 1695312007,
    "indexing_at": 1695312007,
    "completed_at": 1695312007,
    "error": null,
    "stopped_at": null
  }],
  "doc_form": "text_model"
}
```

### 응답 필드 설명

(응답 필드 설명은 "12. 문서에 청크(Chunk) 추가하기"의 응답 필드 설명과 동일합니다.)

## 16. 지식 베이스에서 청크(Chunk) 검색하기

지식에서 쿼리에 따라 관련된 청크(세그먼트)를 검색하는 API입니다.

### 요청 예시

```shell
curl --location --request POST 'https://<your-endpoint>/ext/v1/datasets/{dataset_id}/search' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "query": "test",
  "retrieval_model": {
    "search_method": "keyword_search",
    "reranking_enable": false,
    "reranking_mode": null,
    "reranking_model": {
      "reranking_provider_name": "",
      "reranking_model_name": ""
    },
    "weights": null,
    "top_k": 1,
    "score_threshold_enabled": false,
    "score_threshold": null
  }
}'
```

### 입력 필드 설명

| 필드명                              | 설명                                         |
|-------------------------------------|----------------------------------------------|
| `dataset_id`                        | 지식의 ID                                    |
| `query`                             | 검색할 텍스트 쿼리                           |
| `retrieval_model`                   | 검색 모델 설정 객체                          |
| `search_method`                     | 검색 방식 (`keyword_search` 등)              |
| `reranking_enable`                  | 재정렬 기능 사용 여부                        |
| `reranking_mode`                    | 재정렬 방식 (사용하지 않을 경우 `null`)      |
| `reranking_model`                   | 재정렬 모델 설정 객체                        |
| `reranking_provider_name`           | 재정렬 모델 제공자 이름                      |
| `reranking_model_name`              | 재정렬 모델 이름                             |
| `weights`                           | 가중치 설정 (사용하지 않을 경우 `null`)      |
| `top_k`                             | 상위 검색 결과 개수                          |
| `score_threshold_enabled`           | 점수 기준치 활성화 여부                      |
| `score_threshold`                   | 기준 점수 값 (사용하지 않을 경우 `null`)     |

### 응답 예시

```json
{
  "query": {
    "content": "test"
  },
  "records": [
    {
      "segment": {
        "id": "7fa6f24f-8679-48b3-bc9d-bdf28d73f218",
        "position": 1,
        "document_id": "a8c6c36f-9f5d-4d7a-8472-f5d7b75d71d2",
        "content": "Operation guide",
        "answer": null,
        "word_count": 847,
        "tokens": 280,
        "keywords": [
          "install", "java", "base", "scripts", "jdk",
          "manual", "internal", "opens", "add", "vmoptions"
        ],
        "index_node_id": "39dd8443-d960-45a8-bb46-7275ad7fbc8e",
        "index_node_hash": "0189157697b3c6a418ccf8264a09699f25858975578f3467c76d6bfc94df1d73",
        "hit_count": 0,
        "enabled": true,
        "disabled_at": null,
        "disabled_by": null,
        "status": "completed",
        "created_by": "dbcb1ab5-90c8-41a7-8b78-73b235eb6f6f",
        "created_at": 1728734540,
        "indexing_at": 1728734552,
        "completed_at": 1728734584,
        "error": null,
        "stopped_at": null,
        "document": {
          "id": "a8c6c36f-9f5d-4d7a-8472-f5d7b75d71d2",
          "data_source_type": "upload_file",
          "name": "readme.txt",
          "doc_type": null
        }
      },
      "score": 3.730463140527718e-05,
      "tsne_position": null
    }
  ]
}
```

### 응답 필드 설명

| 필드명                               | 설명                                   |
|--------------------------------------|----------------------------------------|
| `query.content`                      | 사용자가 입력한 검색 쿼리              |
| `records`                            | 검색 결과 세그먼트 배열                |
| `segment.id`                         | 세그먼트의 고유 ID                     |
| `segment.position`                   | 문서 내 세그먼트의 위치                |
| `segment.document_id`                | 세그먼트가 포함된 문서 ID              |
| `segment.content`                    | 세그먼트의 텍스트 내용                 |
| `segment.answer`                     | 세그먼트의 요약 또는 답변              |
| `segment.word_count`                 | 단어 수                                |
| `segment.tokens`                     | 토큰 수                                |
| `segment.keywords`                   | 키워드 목록                            |
| `segment.index_node_id`              | 인덱스 노드 ID                         |
| `segment.index_node_hash`            | 인덱스 노드 해시값                     |
| `segment.hit_count`                  | 조회 수                                |
| `segment.enabled`                    | 활성화 여부                            |
| `segment.disabled_at`                | 비활성화된 시각                        |
| `segment.disabled_by`                | 비활성화 처리한 주체                   |
| `segment.status`                     | 세그먼트 처리 상태                     |
| `segment.created_by`                 | 생성자 ID                              |
| `segment.created_at`                 | 생성 시각 (Unix 시간)                  |
| `segment.indexing_at`                | 인덱싱 시작 시각                       |
| `segment.completed_at`               | 인덱싱 완료 시각                       |
| `segment.error`                      | 오류 정보                              |
| `segment.stopped_at`                 | 인덱싱 중단 시각                       |
| `segment.document.id`                | 문서 ID                                |
| `segment.document.data_source_type`  | 문서의 데이터 소스 유형                |
| `segment.document.name`              | 문서 이름                              |
| `segment.document.doc_type`          | 문서 타입 (값이 없을 수 있음)          |
| `score`                              | 검색 결과의 점수                       |
| `tsne_position`                      | 시각화용 TSNE 위치 (해당 값이 없을 수 있음) |

```