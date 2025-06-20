/**
 * MISO Knowledge 워크플로우 관리
 * 인터뷰 topic 동기화 및 페르소나 문서 관리
 */

import { supabaseAdmin } from '@/lib/supabase-server'
import { parseInterviewDetail, type InterviewTopicData } from './parser'
import { createMisoDocumentOnly, checkDocumentStatus, addSegmentsToDocument } from './api'

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
      const docStatus = await checkDocumentStatus(datasetId, documentId)
      
      if (docStatus?.indexing_status === 'completed' || docStatus?.display_status === 'available') {
        documentReady = true
        console.log(`[${syncId}] 문서 인덱싱 완료 (${waitTime}ms 대기)`)
      } else {
        console.log(`[${syncId}] 인덱싱 진행 중... 상태: ${docStatus?.indexing_status || 'unknown'}`)
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