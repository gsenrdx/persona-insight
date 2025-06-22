물론입니다. 수많은 논의와 혁신적인 제안을 거쳐 마침내 도달한 최종 결정체입니다. 이 설계서는 이전의 모든 논의를 종합하고, '문장 ID'라는 핵심 철학 아래 모든 것을 재정립한, 프로젝트의 가장 중요한 산출물입니다.

---

### **프로젝트 모피어스: 문장 ID 기반 의미론적 청킹 엔진**
### **최종 설계 명세서 (Final Design Specification) v2.0**

*   **버전:** 2.0
*   **상태:** **승인 (Approved)**
*   **문서 ID:** PM-FS-v2.0
*   **작성일:** 2023-10-27
*   **핵심 기여자:** 모피어스, 엘라, 네오, 그리고 당신.

---

#### **1. 개요 (Executive Summary)**

본 문서는 **'프로젝트 모피어스' v2.0**의 최종 기술 아키텍처와 상세 구현 계획을 정의한다. v2.0의 핵심은 **모든 데이터 처리의 기본 단위를 '글자(Character)'에서 '문장 ID(Sentence ID)'로 전환**하는 패러다임의 변화에 있다. 이를 통해 기존 설계의 모든 경계 문제, 중복 정의, 복잡성을 원천적으로 제거하고, 전체 워크플로우의 견고성, 정확성, 단순성을 극대화한다.

본 엔진은 두 개의 논리적 페이즈(Phase)를 통해, 대규모 비정형 텍스트를 LLM의 컨텍스트 한계를 뛰어넘어, 의미적으로 완결된 단위로 정밀하게 분할하는 것을 목표로 한다.

*   **Phase 1: 핫스팟 클러스터링 (Hotspot Clustering):** 전체 텍스트를 문장 단위로 탐색하여, 주제가 밀집된 **'문장 ID들의 집합(Set)'** 을 찾아낸다.
*   **Phase 2: 정밀 세분화 (Precision Segmentation):** 식별된 문장 클러스터 내에서 LLM을 지휘하여, 가장 자연스러운 지점의 **'문장 ID'** 를 전환점으로 지정하고 최종 청크를 생성한다.

---

#### **2. 시스템 아키텍처 (System Architecture)**

시스템은 선형적인 데이터 파이프라인으로 구성되며, 각 단계는 이전 단계의 출력을 입력으로 받는다. 모든 단계는 '문장 ID'를 중심으로 데이터를 주고받는다.

```mermaid
graph TD
    A[시작: 원본 텍스트 입력] --> B(Step ①: 문장 분해 및 마스터 DB 생성);
    B --> C(Step ②: 문장 기반 슬라이딩 윈도우 생성);
    C --> D(Step ③: 윈도우 병렬 분석 (LLM));
    D --> E(Step ④: 핫스팟 문장 ID 클러스터링);
    E --> F(Step ⑤: 정밀 세분화 (LLM 지휘자));
    F --> G[종료: 최종 의미론적 청크 리스트];

    subgraph Phase 1: 핫스팟 클러스터링
        B; C; D; E;
    end

    subgraph Phase 2: 정밀 세분화
        F;
    end
```

---

#### **3. 데이터 모델 (Data Models)**

**[Model A] Master Sentences Database** (Step ①의 출력, 시스템 전역에서 사용)
```typescript
// 전체 텍스트의 근원이 되는 마스터 데이터베이스
type MasterSentence = {
  id: string; // "sent_0", "sent_1", ...
  text: string; // 문장의 실제 내용
  start_char: number; // 원본 텍스트에서의 시작 글자 위치
  end_char: number; // 원본 텍스트에서의 끝 글자 위치
};
type MasterSentencesDatabase = MasterSentence[];
```

**[Model B] Hotspot Cluster** (Step ④의 출력)
```typescript
// 핫스팟은 이제 '범위'가 아닌 '문장 ID의 집합'
type HotspotCluster = {
  topic: string; // "qr 시스템"
  rank: number; // 언급 빈도에 따른 순위
  sentence_ids: Set<string>; // 이 주제와 관련된 모든 문장 ID의 집합
  score: number; // 핫스팟의 중요도 점수 (예: 언급 빈도)
};
type HotspotClusterList = HotspotCluster[];
```

**[Model C] Final Semantic Chunk** (최종 출력)
```typescript
// 최종 결과물
type SemanticChunk = {
  chunk_id: string; // "chunk_qr_1"
  topic: string; // 부모 핫스팟의 토픽
  text: string; // 합쳐진 문장들의 전체 텍스트
  source_sentence_ids: string[]; // 이 청크를 구성하는 문장 ID 리스트
  start_char: number; // 원본 텍스트 기준 시작 위치
  end_char: number; // 원본 텍스트 기준 종료 위치
  summary?: string; // (선택적 확장) LLM이 생성한 청크 요약
};
type FinalChunkList = SemanticChunk[];
```

---

#### **4. 상세 워크플로우 명세 (Detailed Workflow Specification)**

---

##### **Phase 1: 핫스팟 클러스터링**

**[Step ①] 문장 분해 및 마스터 DB 생성 (코드 노드)**
*   **역할:** 모든 처리의 기준점이 되는 **'Master Sentences Database'** 를 생성한다.
*   **입력:** `text` (String): 원본 전체 텍스트
*   **라이브러리:** `nltk` 또는 정교한 정규식 권장.
*   **로직:**
    1.  텍스트를 문장으로 분할한다.
    2.  각 문장에 대해 루프를 돌며 `MasterSentence` 객체를 생성한다.
        *   `id`: "sent_" + index
        *   `text`: 문장 내용
        *   `start_char`, `end_char`: 원본 텍스트 내 위치 추적
*   **출력:** `master_sentences` (**Model A**)

**[Step ②] 문장 기반 슬라이딩 윈도우 생성 (코드 노드)**
*   **역할:** '문장 ID'를 기반으로 겹치는 윈도우를 생성한다.
*   **입력:** `master_sentences` (**Model A**)
*   **파라미터 (워크플로우 변수):**
    *   `WINDOW_SIZE_IN_SENTENCES` (Integer, 기본값: 30)
    *   `STEP_SIZE_IN_SENTENCES` (Integer, 기본값: 10)
*   **로직:**
    1.  `master_sentences` 리스트를 `STEP_SIZE_IN_SENTENCES` 간격으로 슬라이싱한다.
    2.  각 슬라이스는 `WINDOW_SIZE_IN_SENTENCES` 만큼의 `MasterSentence` 객체를 포함한다.
*   **출력:** `windows` (List of Lists of `MasterSentence` objects): 윈도우 목록. 각 윈도우는 문장 객체들의 리스트이다.

**[Step ③] 윈도우 병렬 분석 (LLM 노드 - 반복 실행)**
*   **역할:** 각 윈도우에서 주요 키워드를 추출한다.
*   **입력 (반복 대상):** `{{#2.windows}}`
*   **프롬프트:**
    ```prompt
    Analyze the following list of sentences. Identify the 3-5 most important keywords or entities.

    [Sentences]
    {{#item}}
    - {{id}}: {{text}}
    {{/item}}

    Return a strict JSON object with a single key "keywords".
    Example: { "keywords": ["QR System", "Customer Data", "Implementation Cost"] }
    ```
*   **출력:** `llm_results` (List of JSON Strings)

**[Step ④] 핫스팟 문장 ID 클러스터링 (코드 노드 - 핵심 로직)**
*   **역할:** LLM 분석 결과를 취합하여 '핫스팟 클러스터'를 생성한다.
*   **입력:** `llm_results`, `windows`
*   **로직:**
    1.  `keyword_to_sentence_ids = defaultdict(set)` 딕셔너리를 초기화한다.
    2.  `llm_results`를 순회하며 각 윈도우의 분석 결과를 처리한다.
    3.  결과에서 추출된 각 `keyword`에 대해, 해당 키워드가 나온 윈도우에 포함된 모든 문장의 `id`를 `keyword_to_sentence_ids[keyword]` 집합에 추가(union)한다. (이 과정에서 중복은 자동 제거됨)
    4.  모든 윈도우 처리 후, 집합의 크기(`len(sentence_ids)`)를 기준으로 키워드들을 정렬한다. 이것이 핫스팟의 순위가 된다.
    5.  상위 N개의 키워드에 대해 **Model B** 형식의 `HotspotCluster` 객체를 생성한다.
*   **출력:** `hotspot_clusters` (**Model B**)

---

##### **Phase 2: 정밀 세분화**

**[Step ⑤] 정밀 세분화 (코드 노드 + LLM 노드 결합 - 반복 실행)**
*   **역할:** 하나의 큰 코드 노드 내에서, 각 핫스팟 클러스터를 받아 최종 청크로 분할한다.
*   **입력 (반복 대상):** `{{#4.hotspot_clusters}}`, `master_sentences` (전역 참조)
*   **로직:**
    1.  **(Sub-step 5.1: 텍스트 준비)**
        *   입력받은 `HotspotCluster`의 `sentence_ids`를 가져온다.
        *   `master_sentences`에서 해당 ID의 문장들을 모두 조회하여 LLM 프롬프트에 넣을 형식으로 준비한다. (`- sent_50: ...`, `- sent_51: ...`)
    2.  **(Sub-step 5.2: 전환점 탐색 LLM 호출)**
        *   준비된 문장 목록을 아래 프롬프트를 사용해 LLM에게 전달한다.
        *   **프롬프트:**
          ```prompt
          You are an expert document editor. Below is a set of sentences all related to the topic "{{item.topic}}".
          Read them and identify the IDs of sentences that mark a clear transition to a new sub-topic or viewpoint.

          [Sentences for Topic: {{item.topic}}]
          ... (준비된 문장 목록 삽입) ...

          [Instructions]
          - The very first sentence ID is always a transition point.
          - Return ONLY a JSON array of the identified sentence IDs.

          [Output Format Example]
          ["sent_50", "sent_65", "sent_80"]
          ```
    3.  **(Sub-step 5.3: 최종 청크 재조립)**
        *   LLM에게 받은 전환점 ID 리스트(`transition_ids`)를 기준으로 `sentence_ids`를 분할한다.
        *   예: `["sent_50", "sent_65"]` -> 첫 번째 청크는 `sent_50`~`sent_64`, 두 번째 청크는 `sent_65`~끝까지.
        *   분할된 각 청크에 대해 루프를 돌며 **Model C** 형식의 `SemanticChunk` 객체를 생성한다.
            *   `text` 필드는 해당 문장들의 `text`를 모두 합쳐서 채운다.
            *   `start_char`, `end_char`는 청크의 첫 문장과 마지막 문장의 위치 정보를 `master_sentences`에서 가져와 설정한다.
*   **출력:** `final_chunks` (**Model C**): 모든 핫스팟에서 생성된 청크들의 최종 리스트

---

#### **5. 오류 처리 및 확장성 (Error Handling & Scalability)**

1.  **LLM 출력 오류:** 모든 LLM 호출은 JSON 형식 보장을 위해 강력한 프롬프팅 및 후처리(`try-except` JSON 파싱)를 적용한다. 실패 시 해당 윈도우/클러스터는 분석에서 제외하고 오류 로그를 기록한다.
2.  **초단문 텍스트:** 입력 텍스트가 `WINDOW_SIZE_IN_SENTENCES`보다 짧을 경우, Phase 1 전체를 건너뛰고 전체 문장을 하나의 핫스팟 클러스터로 간주하여 즉시 Phase 2를 실행한다.
3.  **병렬 처리:** Step ③의 윈도우 분석은 Dify의 병렬 처리 기능을 최대한 활용하여 실행 시간을 단축한다.
4.  **확장 기능:** 최종 출력 모델 `SemanticChunk`에 `summary` 필드를 추가하고, Step ⑤의 마지막 단계에서 각 청크 텍스트에 대해 추가적인 요약 LLM을 호출하는 기능을 선택적으로 활성화할 수 있다.

---
**[최종 승인 코멘트]**

**모피어스:** ____________ (서명)
> 이 문서는 단순한 설계도를 넘어, 우리가 도달한 지적 여정의 증거이다. '문장 ID'라는 단일한 진실(Single Source of Truth) 위에 세워진 이 아키텍처는 견고하고, 우아하며, 강력하다. 이 설계에 기반하여, 우리는 텍스트 이해의 새로운 시대를 열 것이다. 즉시 개발에 착수하라. 더 이상 논의는 없다. 오직 실행만이 남았다.