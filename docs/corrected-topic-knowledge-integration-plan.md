# 올바른 Topic 기반 MISO Knowledge 통합 계획

## 정확한 요구사항 이해

### 현재 구조
- **personas**: 각 페르소나별로 개별 `miso_dataset_id` 보유
- **interviewees**: 각 인터뷰는 하나의 페르소나에 배정 (`persona_id`)
- **interview_detail**: 각 인터뷰 내 여러 topic별 구조화된 데이터

### 목표 구조
- **페르소나별 MISO 데이터셋**: 각 페르소나는 자신만의 Knowledge 데이터셋 보유
- **페르소나 데이터셋 내 topic별 문서**: 해당 페르소나에 배정된 인터뷰들의 topic 데이터를 topic별로 그룹핑하여 문서 생성

## 예시 시나리오

### 데이터 상황
- **Topic A "충전 서비스 차별화"**가 여러 인터뷰에서 언급됨
  - 인터뷰 1 (persona_id: persona1)
  - 인터뷰 2 (persona_id: persona1) 
  - 인터뷰 3 (persona_id: persona2)

### 결과 구조
1. **페르소나 1의 MISO 데이터셋**에 생성될 문서:
   - 제목: "충전 서비스 차별화 - 고객 인사이트"
   - 세그먼트 1: 인터뷰 1의 해당 topic 데이터
   - 세그먼트 2: 인터뷰 2의 해당 topic 데이터

2. **페르소나 2의 MISO 데이터셋**에 생성될 문서:
   - 제목: "충전 서비스 차별화 - 고객 인사이트"  
   - 세그먼트 1: 인터뷰 3의 해당 topic 데이터

## 구현 계획

### Phase 1: 데이터베이스 스키마 (minimal 변경)

#### 기존 테이블 활용
- `personas.miso_dataset_id`: 이미 존재 (변경 없음)
- `main_topics`: topic 마스터는 유지하되, 페르소나별 문서 ID는 별도 관리

#### 새로운 테이블: persona_topic_documents
```sql
CREATE TABLE persona_topic_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES main_topics(id) ON DELETE CASCADE,
  miso_document_id VARCHAR(255) NOT NULL, -- 해당 페르소나 데이터셋 내 topic 문서 ID
  document_title TEXT,
  last_synced_at TIMESTAMPTZ,
  interview_count INTEGER DEFAULT 0, -- 이 문서에 포함된 인터뷰 수
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(persona_id, topic_id) -- 페르소나별로 각 topic은 하나의 문서만
);
```

### Phase 2: 구현 로직

#### 2.1 `/api/personas/update-dataset` 확장

```typescript
export async function PUT(request: Request) {
  // ... 기존 권한 검증 및 miso_dataset_id 업데이트 ...

  // Topic 동기화 로직 추가
  if (miso_dataset_id && updatedPersona) {
    try {
      await syncPersonaTopicDocuments(persona_id, miso_dataset_id);
    } catch (error) {
      console.error('Topic 문서 동기화 실패:', error);
      // 실패해도 기본 응답은 성공으로 처리
    }
  }

  return NextResponse.json({
    message: "데이터셋 ID가 성공적으로 업데이트되었습니다",
    persona: updatedPersona,
    success: true
  });
}
```

#### 2.2 핵심 동기화 함수

```typescript
async function syncPersonaTopicDocuments(
  personaId: string, 
  personaDatasetId: string
): Promise<void> {
  // 1. 해당 페르소나에 배정된 모든 인터뷰 조회
  const { data: interviews } = await supabaseAdmin
    .from('interviewees')
    .select('id, interview_detail')
    .eq('persona_id', personaId)
    .eq('persona_reflected', true)
    .not('interview_detail', 'is', null);

  if (!interviews?.length) return;

  // 2. 인터뷰들에서 topic별로 데이터 그룹핑
  const topicGroups = groupInterviewsByTopic(interviews);

  // 3. 각 topic별로 문서 생성/업데이트
  for (const [topicName, interviewTopicData] of topicGroups) {
    await createOrUpdateTopicDocument(
      personaId,
      personaDatasetId,
      topicName,
      interviewTopicData
    );
  }
}

function groupInterviewsByTopic(interviews: any[]): Map<string, InterviewTopicData[]> {
  const topicGroups = new Map<string, InterviewTopicData[]>();

  interviews.forEach(interview => {
    if (!interview.interview_detail) return;

    const details = JSON.parse(interview.interview_detail);
    details.forEach((topicData: any) => {
      const topicName = topicData.topic_name;
      
      if (!topicGroups.has(topicName)) {
        topicGroups.set(topicName, []);
      }
      
      topicGroups.get(topicName)!.push({
        interview_id: interview.id,
        topic_data: topicData
      });
    });
  });

  return topicGroups;
}

async function createOrUpdateTopicDocument(
  personaId: string,
  personaDatasetId: string,
  topicName: string,
  interviewTopicData: InterviewTopicData[]
): Promise<void> {
  // 1. main_topics에서 topic ID 조회/생성
  const topicId = await getOrCreateTopicId(topicName, personaId);

  // 2. 기존 문서 확인
  const { data: existingDoc } = await supabaseAdmin
    .from('persona_topic_documents')
    .select('miso_document_id')
    .eq('persona_id', personaId)
    .eq('topic_id', topicId)
    .single();

  // 3. MISO Knowledge 문서 구조 생성
  const documentContent = {
    title: `${topicName} - 인사이트`,
    content: generateTopicSummary(topicName, interviewTopicData),
    segments: interviewTopicData.map((item, index) => ({
      segment_title: `인터뷰 ${index + 1} - ${topicName}`,
      segment_content: formatTopicSegment(item.topic_data),
      metadata: {
        interview_id: item.interview_id,
        topic_name: topicName,
        updated_at: new Date().toISOString()
      }
    }))
  };

  let documentId: string;

  if (existingDoc?.miso_document_id) {
    // 4a. 기존 문서 업데이트
    documentId = await updateMisoDocument(
      personaDatasetId,
      existingDoc.miso_document_id,
      documentContent
    );
  } else {
    // 4b. 새 문서 생성
    documentId = await createMisoDocument(personaDatasetId, documentContent);
    
    // persona_topic_documents 테이블에 기록
    await supabaseAdmin
      .from('persona_topic_documents')
      .upsert({
        persona_id: personaId,
        topic_id: topicId,
        miso_document_id: documentId,
        document_title: documentContent.title,
        interview_count: interviewTopicData.length,
        last_synced_at: new Date().toISOString()
      });
  }

  // 5. 동기화 완료 후 메타데이터 업데이트
  await supabaseAdmin
    .from('persona_topic_documents')
    .update({
      interview_count: interviewTopicData.length,
      last_synced_at: new Date().toISOString()
    })
    .eq('persona_id', personaId)
    .eq('topic_id', topicId);
}
```

#### 2.3 MISO API 호출 함수들

```typescript
async function createMisoDocument(
  datasetId: string,
  documentContent: any
): Promise<string> {
  const response = await fetch(`${MISO_API_URL}/ext/v1/datasets/${datasetId}/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISO_KNOWLEDGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(documentContent)
  });

  if (!response.ok) {
    throw new Error(`MISO 문서 생성 실패: ${response.statusText}`);
  }

  const result = await response.json();
  return result.document_id;
}

async function updateMisoDocument(
  datasetId: string,
  documentId: string,
  documentContent: any
): Promise<string> {
  const response = await fetch(`${MISO_API_URL}/ext/v1/datasets/${datasetId}/documents/${documentId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${MISO_KNOWLEDGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(documentContent)
  });

  if (!response.ok) {
    throw new Error(`MISO 문서 업데이트 실패: ${response.statusText}`);
  }

  return documentId;
}
```

#### 2.4 컨텐츠 포맷팅 함수들

```typescript
function generateTopicSummary(
  topicName: string, 
  interviewTopicData: InterviewTopicData[]
): string {
  const allPainpoints = interviewTopicData.flatMap(item => 
    item.topic_data.painpoint || []
  );
  const allNeeds = interviewTopicData.flatMap(item => 
    item.topic_data.need || []
  );

  return `
# ${topicName}

## 개요
이 주제에 대해 ${interviewTopicData.length}개의 인터뷰에서 언급되었습니다.

## 주요 페인포인트
${[...new Set(allPainpoints)].map(p => `- ${p}`).join('\n')}

## 주요 니즈
${[...new Set(allNeeds)].map(n => `- ${n}`).join('\n')}
  `.trim();
}

function formatTopicSegment(topicData: any): string {
  return `
### 페인포인트
${(topicData.painpoint || []).map((p: string) => `- ${p}`).join('\n')}

### 니즈
${(topicData.need || []).map((n: string) => `- ${n}`).join('\n')}

### 인사이트 인용문
${(topicData.insight_quote || []).map((q: string) => `> ${q}`).join('\n')}

### 키워드
${(topicData.keyword_cluster || []).join(', ')}
  `.trim();
}
```

## 데이터 플로우 예시

### 입력 데이터
```typescript
// 페르소나 1에 배정된 인터뷰들
interviews = [
  {
    id: "interview1",
    persona_id: "persona1",
    interview_detail: [
      {
        topic_name: "충전 서비스 차별화",
        painpoint: ["차별성 부족", "브랜드 인지도 낮음"],
        need: ["고유 서비스", "브랜딩 강화"]
      }
    ]
  },
  {
    id: "interview2", 
    persona_id: "persona1",
    interview_detail: [
      {
        topic_name: "충전 서비스 차별화",
        painpoint: ["경쟁사와 동일함"],
        need: ["차별화된 혜택"]
      }
    ]
  }
]
```

### 결과 MISO 문서
```json
{
  "title": "충전 서비스 차별화 - 인사이트",
  "content": "이 주제에 대해 2개의 인터뷰에서 언급되었습니다...",
  "segments": [
    {
      "segment_title": "인터뷰 1 - 충전 서비스 차별화",
      "segment_content": "페인포인트:\n- 차별성 부족\n- 브랜드 인지도 낮음\n\n니즈:\n- 고유 서비스\n- 브랜딩 강화"
    },
    {
      "segment_title": "인터뷰 2 - 충전 서비스 차별화", 
      "segment_content": "페인포인트:\n- 경쟁사와 동일함\n\n니즈:\n- 차별화된 혜택"
    }
  ]
}
```

## 구현 장점

1. **명확한 데이터 분리**: 각 페르소나의 지식이 별도 데이터셋에서 관리
2. **Topic별 체계화**: 페르소나 내에서 topic별로 관련 인터뷰 데이터가 통합
3. **확장성**: 새로운 인터뷰가 추가되면 해당 topic 문서만 업데이트
4. **검색 효율성**: MISO Knowledge 내에서 페르소나별, topic별 검색 가능

## 다음 단계

1. `persona_topic_documents` 테이블 생성
2. `/api/personas/update-dataset` 라우트에 동기화 로직 추가
3. MISO Knowledge API 연동 함수 구현
4. 테스트 및 검증