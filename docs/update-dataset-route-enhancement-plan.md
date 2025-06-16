# update-dataset 라우트 확장 계획

## 개요
`/api/personas/update-dataset/route.ts`를 확장하여 페르소나 데이터셋 업데이트 시 topic별 MISO Knowledge 문서를 자동으로 생성/업데이트하는 기능을 추가합니다.

## 현재 동작
- 페르소나의 `miso_dataset_id` 필드만 업데이트
- 권한 검증 (회사, 프로젝트 레벨)

## 확장 후 동작
1. 페르소나의 `miso_dataset_id` 업데이트 (기존)
2. 페르소나와 연관된 인터뷰 데이터 조회
3. Topic별 데이터 집계
4. MISO Knowledge 문서 생성/업데이트
5. 데이터베이스 관계 업데이트

## 상세 구현 계획

### 1. 필요한 함수 추가

```typescript
// Topic 데이터 추출 및 집계
async function extractAndAggregateTopics(
  personaId: string, 
  companyId: string,
  projectId?: string
): Promise<{
  topics: Map<string, TopicData>;
  intervieweeIds: string[];
}>

// MISO Knowledge 문서 생성/업데이트
async function createOrUpdateTopicDocument(
  topicName: string,
  topicData: TopicData,
  existingDocumentId?: string
): Promise<string>

// Topic-Persona 관계 업데이트
async function updateTopicRelations(
  personaId: string,
  topicMap: Map<string, { topicId: string; documentId: string }>
): Promise<void>
```

### 2. 데이터 구조 정의

```typescript
interface TopicData {
  topic_name: string;
  personas: PersonaTopicContribution[];
  aggregated_painpoints: string[];
  aggregated_needs: string[];
  aggregated_insights: string[];
  aggregated_keywords: string[];
  mention_count: number;
}

interface PersonaTopicContribution {
  persona_id: string;
  persona_type: string;
  persona_title?: string;
  painpoints: string[];
  needs: string[];
  insights: string[];
  contribution_date: string;
}
```

### 3. 업데이트된 라우트 흐름

```typescript
export async function PUT(request: Request) {
  // ... 기존 권한 검증 로직 ...

  // 1. 기존 miso_dataset_id 업데이트
  const { data: updatedPersona } = await updatePersonaDatasetId(persona_id, miso_dataset_id);

  // 2. Topic 동기화 프로세스 시작
  if (updatedPersona) {
    try {
      // 2-1. 페르소나와 연관된 인터뷰 데이터 조회
      const { data: interviews } = await supabaseAdmin
        .from('interviewees')
        .select('id, interview_detail')
        .eq('persona_id', persona_id)
        .eq('persona_reflected', true);

      // 2-2. Topic 데이터 추출 및 집계
      const topicMap = await extractTopicsFromInterviews(interviews);
      
      // 2-3. 각 Topic별로 처리
      for (const [topicName, topicData] of topicMap) {
        // main_topics 테이블에서 기존 topic 확인
        const { data: existingTopic } = await supabaseAdmin
          .from('main_topics')
          .select('id, miso_document_id')
          .eq('topic_name', topicName)
          .eq('company_id', companyId)
          .single();

        let topicId: string;
        let documentId: string;

        if (existingTopic) {
          // 기존 topic이 있으면 문서 업데이트
          topicId = existingTopic.id;
          documentId = await updateTopicDocument(
            existingTopic.miso_document_id,
            topicName,
            topicData,
            persona_id
          );
        } else {
          // 새로운 topic 생성
          const { data: newTopic } = await supabaseAdmin
            .from('main_topics')
            .insert({
              topic_name: topicName,
              company_id: companyId,
              project_id: projectId
            })
            .select()
            .single();

          topicId = newTopic.id;
          documentId = await createTopicDocument(topicName, topicData, persona_id);
          
          // miso_document_id 업데이트
          await supabaseAdmin
            .from('main_topics')
            .update({ miso_document_id: documentId })
            .eq('id', topicId);
        }

        // persona_topics 관계 생성/업데이트
        await supabaseAdmin
          .from('persona_topics')
          .upsert({
            persona_id: persona_id,
            topic_id: topicId,
            contribution_data: {
              painpoints: topicData.personas[0]?.painpoints || [],
              needs: topicData.personas[0]?.needs || [],
              insights: topicData.personas[0]?.insights || [],
              last_updated: new Date().toISOString()
            }
          });
      }

      // 2-4. 페르소나에 연관된 topic UUID 목록 저장 (선택사항)
      // personas 테이블에 topic_ids 컬럼 추가 필요
      const topicIds = Array.from(topicMap.keys()).map(name => /* get topic id */);
      await supabaseAdmin
        .from('personas')
        .update({ related_topic_ids: topicIds })
        .eq('id', persona_id);

    } catch (topicSyncError) {
      console.error('Topic 동기화 실패:', topicSyncError);
      // Topic 동기화 실패해도 기본 응답은 성공으로 처리
    }
  }

  return NextResponse.json({
    message: "데이터셋 ID가 성공적으로 업데이트되었습니다",
    persona: updatedPersona,
    success: true
  });
}
```

### 4. MISO Knowledge 문서 구조

```typescript
async function createTopicDocument(
  topicName: string, 
  topicData: TopicData,
  personaId: string
): Promise<string> {
  const document = {
    title: `${topicName} - 고객 인사이트`,
    content: generateTopicSummary(topicData),
    segments: topicData.personas.map(persona => ({
      segment_title: `${persona.persona_type} 타입 고객`,
      segment_content: formatPersonaInsights(persona),
      metadata: {
        persona_id: persona.persona_id,
        persona_type: persona.persona_type,
        updated_at: new Date().toISOString()
      }
    }))
  };

  // MISO Knowledge API 호출
  const response = await fetch(`${MISO_API_URL}/ext/v1/datasets/${datasetId}/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISO_KNOWLEDGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(document)
  });

  const result = await response.json();
  return result.document_id;
}
```

### 5. 헬퍼 함수들

```typescript
// Topic 데이터 추출
function extractTopicsFromInterviews(
  interviews: any[]
): Map<string, TopicData> {
  const topicMap = new Map<string, TopicData>();

  interviews.forEach(interview => {
    if (!interview.interview_detail) return;

    const details = JSON.parse(interview.interview_detail);
    details.forEach((topic: any) => {
      const topicName = topic.topic_name;
      
      if (!topicMap.has(topicName)) {
        topicMap.set(topicName, {
          topic_name: topicName,
          personas: [],
          aggregated_painpoints: [],
          aggregated_needs: [],
          aggregated_insights: [],
          aggregated_keywords: [],
          mention_count: 0
        });
      }

      const topicData = topicMap.get(topicName)!;
      topicData.aggregated_painpoints.push(...(topic.painpoint || []));
      topicData.aggregated_needs.push(...(topic.need || []));
      topicData.aggregated_insights.push(...(topic.insight_quote || []));
      topicData.aggregated_keywords.push(
        ...(topic.keyword_cluster || []),
        ...(topic.painpoint_keyword || []),
        ...(topic.need_keyword || [])
      );
      topicData.mention_count++;
    });
  });

  return topicMap;
}

// Topic 요약 생성
function generateTopicSummary(topicData: TopicData): string {
  return `
# ${topicData.topic_name}

## 개요
이 토픽은 ${topicData.mention_count}개의 인터뷰에서 언급되었습니다.

## 주요 페인포인트
${[...new Set(topicData.aggregated_painpoints)].map(p => `- ${p}`).join('\n')}

## 주요 니즈
${[...new Set(topicData.aggregated_needs)].map(n => `- ${n}`).join('\n')}

## 주요 키워드
${[...new Set(topicData.aggregated_keywords)].join(', ')}
  `.trim();
}

// 페르소나별 인사이트 포맷
function formatPersonaInsights(persona: PersonaTopicContribution): string {
  return `
### 페인포인트
${persona.painpoints.map(p => `- ${p}`).join('\n')}

### 니즈
${persona.needs.map(n => `- ${n}`).join('\n')}

### 인사이트
${persona.insights.map(i => `- ${i}`).join('\n')}

*최종 업데이트: ${persona.contribution_date}*
  `.trim();
}
```

## 에러 처리 및 롤백

```typescript
// 트랜잭션 처리 예시
async function syncTopicsWithTransaction(personaId: string, topicData: any) {
  const client = await getSupabaseTransaction();
  
  try {
    await client.query('BEGIN');
    
    // 1. main_topics 업데이트
    // 2. persona_topics 업데이트
    // 3. MISO API 호출
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## 테스트 계획

1. **단위 테스트**
   - Topic 추출 로직
   - 데이터 집계 로직
   - MISO API 호출 모킹

2. **통합 테스트**
   - 전체 플로우 테스트
   - 에러 케이스 처리
   - 권한 검증

3. **성능 테스트**
   - 대량 인터뷰 데이터 처리
   - API 호출 최적화

## 모니터링 및 로깅

```typescript
// 상세 로깅
console.log(`[Topic Sync] 시작 - Persona: ${personaId}`);
console.log(`[Topic Sync] ${topicMap.size}개 topic 발견`);
console.log(`[Topic Sync] MISO 문서 생성/업데이트 중...`);
console.log(`[Topic Sync] 완료 - 처리시간: ${elapsed}ms`);
```

## 향후 개선사항

1. **배치 처리**: 여러 페르소나 동시 처리
2. **캐싱**: Topic 데이터 캐싱으로 성능 향상
3. **비동기 처리**: 큐 시스템 도입으로 대량 처리 개선
4. **버전 관리**: Topic 문서의 버전 히스토리 관리