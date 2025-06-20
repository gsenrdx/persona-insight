/**
 * MISO Knowledge API 클라이언트
 * 문서 생성, 세그먼트 추가, 상태 확인 등의 API 호출
 */

import type { InterviewTopicData } from './parser'

// 환경 변수
const MISO_API_URL = process.env.MISO_API_URL || 'https://api.holdings.miso.gs'
const MISO_KNOWLEDGE_API_KEY = process.env.MISO_KNOWLEDGE_API_KEY

// API 키 존재 여부 확인
console.log('MISO Knowledge API 설정:', {
  MISO_API_URL,
  hasKnowledgeKey: !!MISO_KNOWLEDGE_API_KEY,
  keyPrefix: MISO_KNOWLEDGE_API_KEY?.substring(0, 10)
})

/**
 * 새 문서 생성 (세그먼트 없이)
 */
export async function createMisoDocumentOnly(
  datasetId: string,
  topicName: string,
  interviewCount: number
): Promise<string> {
  if (!MISO_KNOWLEDGE_API_KEY) {
    throw new Error('MISO_KNOWLEDGE_API_KEY 환경 변수가 설정되지 않았습니다')
  }

  const createDocUrl = `${MISO_API_URL}/ext/v1/datasets/${datasetId}/docs/text`
  
  const createDocResponse = await fetch(createDocUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISO_KNOWLEDGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: topicName,
      text: `${topicName}에 대한 ${interviewCount}개 인터뷰 분석`,
      indexing_type: 'high_quality',
      process_rule: {
        mode: 'custom',
        rules: {
          pre_processing_rules: [
            {
              id: 'remove_extra_spaces',
              enabled: true
            },
            {
              id: 'remove_urls_emails',
              enabled: true
            }
          ],
          segmentation: {
            separator: '###',
            max_tokens: 2000
          }
        }
      }
    })
  })

  if (!createDocResponse.ok) {
    const errorText = await createDocResponse.text()
    console.error('MISO 문서 생성 실패:', errorText)
    throw new Error(`MISO 문서 생성 실패: ${createDocResponse.status} ${createDocResponse.statusText}`)
  }

  const createDocResult = await createDocResponse.json()
  const documentId = createDocResult.document?.id

  if (!documentId) {
    throw new Error('MISO 응답에서 문서 ID를 찾을 수 없습니다')
  }

  return documentId
}

/**
 * 문서 상태 확인
 */
export async function checkDocumentStatus(datasetId: string, documentId: string): Promise<any> {
  if (!MISO_KNOWLEDGE_API_KEY) {
    throw new Error('MISO_KNOWLEDGE_API_KEY 환경 변수가 설정되지 않았습니다')
  }

  const statusUrl = `${MISO_API_URL}/ext/v1/datasets/${datasetId}/docs`
  const statusResponse = await fetch(statusUrl, {
    headers: {
      'Authorization': `Bearer ${MISO_KNOWLEDGE_API_KEY}`,
      'Content-Type': 'application/json'
    }
  })

  if (!statusResponse.ok) {
    throw new Error(`문서 상태 확인 실패: ${statusResponse.status}`)
  }

  const statusResult = await statusResponse.json()
  return statusResult.data?.find((doc: any) => doc.id === documentId)
}

/**
 * 문서에 세그먼트 추가
 */
export async function addSegmentsToDocument(
  syncId: string,
  datasetId: string,
  documentId: string,
  topicInterviews: InterviewTopicData[],
  topicName: string
): Promise<void> {
  if (!MISO_KNOWLEDGE_API_KEY) {
    throw new Error('MISO_KNOWLEDGE_API_KEY 환경 변수가 설정되지 않았습니다')
  }

  console.log(`[${syncId}] ${topicInterviews.length}개 세그먼트 추가 시작`)
  
  const addSegmentsUrl = `${MISO_API_URL}/ext/v1/datasets/${datasetId}/docs/${documentId}/segments`
  
  const segmentsPayload = {
    segments: topicInterviews.map(item => ({
      content: `페인포인트: ${item.topic_data.painpoint?.join(', ') || '없음'}\n니즈: ${item.topic_data.need?.join(', ') || '없음'}`,
      keywords: [
        topicName,
        ...(item.topic_data.keyword_cluster || []),
        ...(item.topic_data.painpoint_keyword || []),
        ...(item.topic_data.need_keyword || [])
      ]
    }))
  }

  const addSegmentsResponse = await fetch(addSegmentsUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISO_KNOWLEDGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(segmentsPayload)
  })

  if (!addSegmentsResponse.ok) {
    const errorText = await addSegmentsResponse.text()
    console.error(`[${syncId}] 세그먼트 추가 실패:`, {
      status: addSegmentsResponse.status,
      statusText: addSegmentsResponse.statusText,
      error: errorText
    })
    throw new Error(`세그먼트 추가 실패: ${addSegmentsResponse.status}`)
  } else {
    console.log(`[${syncId}] 세그먼트 추가 완료`)
  }
}