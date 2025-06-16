/**
 * MISO Knowledge API 연동 함수들
 * 페르소나별 데이터셋에서 topic별 문서 생성/업데이트
 */

import { supabaseAdmin } from '@/lib/supabase-server'

// 환경 변수
const MISO_API_URL = process.env.MISO_API_URL || 'https://api.holdings.miso.gs'
const MISO_KNOWLEDGE_API_KEY = process.env.MISO_KNOWLEDGE_API_KEY

// API 키 존재 여부 확인
console.log('MISO Knowledge API 설정:', {
  MISO_API_URL,
  hasKnowledgeKey: !!MISO_KNOWLEDGE_API_KEY,
  keyPrefix: MISO_KNOWLEDGE_API_KEY?.substring(0, 10)
})

// 타입 정의
export interface InterviewTopicData {
  interview_id: string
  topic_data: {
    topic_name: string
    painpoint?: string[]
    need?: string[]
    insight_quote?: string[]
    keyword_cluster?: string[]
    painpoint_keyword?: string[]
    need_keyword?: string[]
  }
}




/**
 * interview_detail 문자열을 파싱하여 JSON 배열로 변환
 * workflow route의 로직을 기반으로 구현
 */
function parseInterviewDetail(interviewDetail: any): any[] | null {
  if (!interviewDetail) return null
  
  try {
    // 이미 객체/배열인 경우
    if (typeof interviewDetail !== 'string') {
      return Array.isArray(interviewDetail) ? interviewDetail : null
    }

    // 문자열인 경우 정리 및 파싱
    let cleanedData = interviewDetail.trim()
    
    // 먼저 이중 인코딩된 JSON 문자열인지 확인 (맨 앞과 뒤에 따옴표가 있는 경우)
    if (cleanedData.startsWith('"') && cleanedData.endsWith('"')) {
      try {
        // 이중 인코딩된 경우 한 번 파싱해서 실제 JSON 문자열 추출
        cleanedData = JSON.parse(cleanedData)
      } catch (e) {
        // 파싱 실패 시 따옴표만 제거
        cleanedData = cleanedData.slice(1, -1)
      }
    }
    
    // 백슬래시 이스케이프 처리
    cleanedData = cleanedData.replace(/\\"/g, '"')
    cleanedData = cleanedData.replace(/\\n/g, '\n')
    cleanedData = cleanedData.replace(/\\\\/g, '\\')
    
    // 마크다운 코드 블록과 중복 내용 제거 (첫 번째 JSON 배열만 사용)
    // 괄호 매칭을 사용하여 완전한 JSON 배열 추출
    const startIndex = cleanedData.indexOf('[')
    if (startIndex !== -1) {
      let bracketCount = 0
      let endIndex = -1
      
      for (let i = startIndex; i < cleanedData.length; i++) {
        if (cleanedData[i] === '[') {
          bracketCount++
        } else if (cleanedData[i] === ']') {
          bracketCount--
          if (bracketCount === 0) {
            endIndex = i
            break
          }
        }
      }
      
      if (endIndex !== -1) {
        cleanedData = cleanedData.substring(startIndex, endIndex + 1)
      }
    }
    
    // 마크다운 코드 블록 제거
    cleanedData = cleanedData.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    cleanedData = cleanedData.replace(/^```\s*/, '').replace(/\s*```$/, '')
    
    // 앞뒤 줄바꿈 및 공백 제거
    cleanedData = cleanedData.trim()

    // JSON 파싱 시도
    if (cleanedData.startsWith('[') && cleanedData.endsWith(']')) {
      const parsed = JSON.parse(cleanedData)
      
      // 파싱된 결과 검증
      if (Array.isArray(parsed)) {
        return parsed
      } else {
        return null
      }
    } 
    // 단일 객체인 경우 배열로 변환 시도
    else if (cleanedData.startsWith('{') && cleanedData.endsWith('}')) {
      const singleObject = JSON.parse(cleanedData)
      
      if (singleObject && typeof singleObject === 'object') {
        return [singleObject] // 배열로 감싸서 반환
      } else {
        return null
      }
    } 
    else {
      return null
    }
    
  } catch (parseError) {
    console.error('interview_detail 파싱 실패:', parseError)
    console.error('파싱 시도한 데이터 길이:', 
      typeof interviewDetail === 'string' ? interviewDetail.length : 'not string'
    )
    console.error('원본 데이터 (처음 300자):', 
      typeof interviewDetail === 'string' 
        ? interviewDetail.substring(0, 300) 
        : JSON.stringify(interviewDetail).substring(0, 300)
    )
    return null
  }
}

/**
 * 인터뷰들에서 topic별로 데이터 그룹핑
 */
export function groupInterviewsByTopic(interviews: any[]): Map<string, InterviewTopicData[]> {
  const topicGroups = new Map<string, InterviewTopicData[]>()

  interviews.forEach(interview => {
    if (!interview.interview_detail) return

    const details = parseInterviewDetail(interview.interview_detail)
    if (!details) return

    details.forEach((topicData: any) => {
        if (!topicData.topic_name) return

        const topicName = topicData.topic_name.trim()
        
        if (!topicGroups.has(topicName)) {
          topicGroups.set(topicName, [])
        }
        
        topicGroups.get(topicName)!.push({
          interview_id: interview.id,
          topic_data: topicData
      })
    })
  })

  return topicGroups
}

/**
 * 단일 인터뷰의 topic들을 페르소나에 동기화
 * synthesis 시점에 호출됨
 */
export async function syncInterviewTopicsToPersona(
  interviewId: string,
  personaId: string,
  personaDatasetId: string
): Promise<void> {
  const syncId = `sync-interview-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  console.log(`[${syncId}] 인터뷰 Topic 동기화 시작:`, { interviewId, personaId, personaDatasetId })

  try {
    // 1. 인터뷰 데이터 조회
    const { data: interview, error: interviewError } = await supabaseAdmin
      .from('interviewees')
      .select('id, interview_detail, company_id, project_id')
      .eq('id', interviewId)
      .single()

    if (interviewError || !interview) {
      console.error(`[${syncId}] 인터뷰 조회 실패:`, interviewError)
      throw new Error('인터뷰를 찾을 수 없습니다')
    }

    if (!interview.interview_detail) {
      console.log(`[${syncId}] 인터뷰에 topic 데이터가 없습니다`)
      return
    }

    // 2. 인터뷰의 topic들 파싱
    const details = parseInterviewDetail(interview.interview_detail)
    if (!details) {
      console.log(`[${syncId}] interview_detail 파싱 실패 또는 배열이 아님`)
      return
    }

    console.log(`[${syncId}] ${details.length}개 topic 발견`)

    // 3. 각 topic별로 처리
    for (const topicData of details) {
      if (!topicData.topic_name) continue

      try {
        await syncSingleTopicToPersona(
          syncId,
          topicData,
          personaId,
          personaDatasetId,
          interview.company_id,
          interview.project_id
        )
      } catch (topicError) {
        console.error(`[${syncId}] Topic "${topicData.topic_name}" 동기화 실패:`, topicError)
        // 하나의 topic 실패해도 다른 topic들은 계속 처리
      }
    }

    console.log(`[${syncId}] 인터뷰 Topic 동기화 완료`)

  } catch (error) {
    console.error(`[${syncId}] 인터뷰 Topic 동기화 오류:`, error)
    throw error
  }
}

/**
 * 단일 topic을 페르소나에 동기화
 */
async function syncSingleTopicToPersona(
  syncId: string,
  topicData: any,
  personaId: string,
  personaDatasetId: string,
  companyId: string,
  projectId: string | null
): Promise<void> {
  const topicName = topicData.topic_name.trim()
  console.log(`[${syncId}] Topic "${topicName}" 동기화 시작`)

  try {
    // 1. main_topics에서 topic ID 조회/생성
    const topicId = await getOrCreateTopicId(topicName, companyId, projectId)

    // 2. 해당 페르소나의 모든 인터뷰에서 동일 topic 데이터 수집
    const { data: allInterviews, error: allInterviewsError } = await supabaseAdmin
      .from('interviewees')
      .select('id, interview_detail')
      .eq('persona_id', personaId)
      .eq('persona_reflected', true)
      .not('interview_detail', 'is', null)

    if (allInterviewsError) {
      console.error(`[${syncId}] 전체 인터뷰 조회 오류:`, allInterviewsError)
      throw allInterviewsError
    }

    // 3. 동일 topic을 가진 모든 인터뷰 데이터 수집
    const topicInterviews: InterviewTopicData[] = []
    
    for (const interview of allInterviews || []) {
      const details = parseInterviewDetail(interview.interview_detail)
      if (!details) continue

      const matchingTopic = details.find((t: any) => t.topic_name === topicName)
      if (matchingTopic) {
        topicInterviews.push({
          interview_id: interview.id,
          topic_data: matchingTopic
        })
      }
    }

    console.log(`[${syncId}] Topic "${topicName}"에 대해 ${topicInterviews.length}개 인터뷰 발견`)

    // 4. 기존 문서 확인
    const { data: existingDoc, error: docSelectError } = await supabaseAdmin
      .from('persona_topic_documents')
      .select('miso_document_id')
      .eq('persona_id', personaId)
      .eq('topic_id', topicId)
      .maybeSingle()

    if (docSelectError) {
      console.error(`[${syncId}] 기존 문서 조회 오류:`, docSelectError)
      throw docSelectError
    }

    let documentId: string

    if (existingDoc?.miso_document_id) {
      // 6a. 기존 문서에 세그먼트 추가
      console.log(`[${syncId}] 기존 문서에 세그먼트 추가: ${existingDoc.miso_document_id}`)
      documentId = existingDoc.miso_document_id
      
      // 바로 세그먼트 추가 (인덱싱 대기 없음)
      await addSegmentsToDocument(
        syncId,
        personaDatasetId,
        documentId,
        topicInterviews,
        topicName
      )
    } else {
      // 6b. 새 문서 생성 (세그먼트 없이)
      console.log(`[${syncId}] 새 문서 생성 (세그먼트 없이)`)
      documentId = await createMisoDocumentOnly(
        personaDatasetId,
        topicName,
        topicInterviews.length
      )
      
      // 인덱싱 완료 후 세그먼트 추가
      await waitForDocumentIndexingAndAddSegments(
        syncId,
        personaDatasetId,
        documentId,
        topicInterviews,
        topicName
      )
    }

    // 7. persona_topic_documents 테이블 업데이트
    const { error: upsertError } = await supabaseAdmin
      .from('persona_topic_documents')
      .upsert({
        persona_id: personaId,
        topic_id: topicId,
        miso_document_id: documentId,
        document_title: topicName,
        interview_count: topicInterviews.length,
        last_synced_at: new Date().toISOString()
      }, {
        onConflict: 'persona_id,topic_id'
      })

    if (upsertError) {
      console.error(`[${syncId}] persona_topic_documents 업데이트 오류:`, upsertError)
      throw upsertError
    }

    console.log(`[${syncId}] Topic "${topicName}" 동기화 완료 (문서 ID: ${documentId})`)

  } catch (error) {
    console.error(`[${syncId}] Topic "${topicName}" 동기화 오류:`, error)
    throw error
  }
}

/**
 * 새 문서 생성 (세그먼트 없이)
 */
async function createMisoDocumentOnly(
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
 * 문서 인덱싱 완료 대기 후 세그먼트 추가
 */
async function waitForDocumentIndexingAndAddSegments(
  syncId: string,
  datasetId: string,
  documentId: string,
  topicInterviews: InterviewTopicData[],
  topicName: string
): Promise<void> {
  console.log(`[${syncId}] 문서 인덱싱 완료 대기 중...`)
  
  // 문서 인덱싱 완료 대기 (최대 2분)
  const maxWaitTime = 120000 // 2분
  const checkInterval = 3000  // 3초
  let waitTime = 0
  let documentReady = false

  while (waitTime < maxWaitTime && !documentReady) {
    await new Promise(resolve => setTimeout(resolve, checkInterval))
    waitTime += checkInterval

    try {
      // 문서 상태 확인 - batch ID 없이 직접 문서 상태 확인
      const statusUrl = `${MISO_API_URL}/ext/v1/datasets/${datasetId}/docs`
      const statusResponse = await fetch(statusUrl, {
        headers: {
          'Authorization': `Bearer ${MISO_KNOWLEDGE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (statusResponse.ok) {
        const statusResult = await statusResponse.json()
        const docStatus = statusResult.data?.find((doc: any) => doc.id === documentId)
        
        if (docStatus?.indexing_status === 'completed' || docStatus?.display_status === 'available') {
          documentReady = true
          console.log(`[${syncId}] 문서 인덱싱 완료 (${waitTime}ms 대기)`)
        } else {
          console.log(`[${syncId}] 인덱싱 진행 중... 상태: ${docStatus?.indexing_status || 'unknown'}`)
        }
      }
    } catch (statusError) {
      console.log(`[${syncId}] 상태 확인 실패, 계속 대기...`)
    }
  }

  if (!documentReady) {
    console.warn(`[${syncId}] 문서 인덱싱 완료를 ${maxWaitTime}ms 동안 기다렸지만 완료되지 않음. 세그먼트 추가 건너뜀`)
    return
  }

  // 인덱싱 완료 후 세그먼트 추가
  await addSegmentsToDocument(syncId, datasetId, documentId, topicInterviews, topicName)
}

/**
 * 문서에 세그먼트 추가
 */
async function addSegmentsToDocument(
  syncId: string,
  datasetId: string,
  documentId: string,
  topicInterviews: InterviewTopicData[],
  topicName: string
): Promise<void> {
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

/**
 * Topic ID 조회/생성
 */
export async function getOrCreateTopicId(
  topicName: string, 
  companyId: string,
  projectId?: string | null
): Promise<string> {
  try {
    // 기존 topic 조회
    const { data: existingTopic, error: selectError } = await supabaseAdmin
      .from('main_topics')
      .select('id')
      .eq('topic_name', topicName.trim())
      .eq('company_id', companyId)
      .maybeSingle()

    if (selectError) {
      console.error('Topic 조회 오류:', selectError)
      throw selectError
    }

    if (existingTopic) {
      return existingTopic.id
    }

    // 새 topic 생성
    const { data: newTopic, error: insertError } = await supabaseAdmin
      .from('main_topics')
      .insert({
        topic_name: topicName.trim(),
        company_id: companyId,
        project_id: projectId
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Topic 생성 오류:', insertError)
      throw insertError
    }

    if (!newTopic) {
      throw new Error('Topic 생성 후 ID를 받지 못했습니다')
    }

    console.log(`새 topic 생성됨: ${topicName} (${newTopic.id})`)
    return newTopic.id

  } catch (error) {
    console.error(`Topic ID 조회/생성 실패 (${topicName}):`, error)
    throw error
  }
}