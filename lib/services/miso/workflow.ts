/**
 * MISO Knowledge 워크플로우 관리 - 페르소나 문서 동기화
 */

import { supabaseAdmin } from '@/lib/supabase-server'
import { parseInterviewDetail, type InterviewTopicData } from './parser'
import { createMisoDocumentOnly, checkDocumentStatus, addSegmentsToDocument } from './api'

// synthesis 시 인터뷰 topic 동기화
export async function syncInterviewTopicsToPersona(
  interviewId: string,
  personaId: string,
  personaDatasetId: string
): Promise<void> {
  const syncId = `sync-interview-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

  try {
    const { data: interview, error: interviewError } = await supabaseAdmin
      .from('interviewees')
      .select('id, interview_detail, company_id, project_id')
      .eq('id', interviewId)
      .single()

    if (interviewError || !interview) {
      throw new Error('인터뷰를 찾을 수 없습니다')
    }

    if (!interview.interview_detail) {
      return
    }

    const details = parseInterviewDetail(interview.interview_detail)
    if (!details) {
      return
    }

    // 각 topic별로 처리
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
        // 하나의 topic 실패해도 다른 topic들은 계속 처리
      }
    }

  } catch (error) {
    throw error
  }
}

// 단일 topic을 페르소나에 동기화
async function syncSingleTopicToPersona(
  syncId: string,
  topicData: any,
  personaId: string,
  personaDatasetId: string,
  companyId: string,
  projectId: string | null
): Promise<void> {
  const topicName = topicData.topic_name.trim()

  try {
    const topicId = await getOrCreateTopicId(topicName, companyId, projectId)

    // 해당 페르소나의 모든 인터뷰에서 동일 topic 데이터 수집
    const { data: allInterviews, error: allInterviewsError } = await supabaseAdmin
      .from('interviewees')
      .select('id, interview_detail')
      .eq('persona_id', personaId)
      .eq('persona_reflected', true)
      .not('interview_detail', 'is', null)

    if (allInterviewsError) {
      throw allInterviewsError
    }

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

    // 기존 문서 확인
    const { data: existingDoc, error: docSelectError } = await supabaseAdmin
      .from('persona_topic_documents')
      .select('miso_document_id')
      .eq('persona_id', personaId)
      .eq('topic_id', topicId)
      .maybeSingle()

    if (docSelectError) {
      throw docSelectError
    }

    let documentId: string

    if (existingDoc?.miso_document_id) {
      // 기존 문서에 세그먼트 추가
      documentId = existingDoc.miso_document_id
      
      await addSegmentsToDocument(
        syncId,
        personaDatasetId,
        documentId,
        topicInterviews,
        topicName
      )
    } else {
      // 새 문서 생성 (세그먼트 없이)
      documentId = await createMisoDocumentOnly(
        personaDatasetId,
        topicName,
        topicInterviews.length
      )
      
      await waitForDocumentIndexingAndAddSegments(
        syncId,
        personaDatasetId,
        documentId,
        topicInterviews,
        topicName
      )
    }

    // persona_topic_documents 테이블 업데이트
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
      throw upsertError
    }

  } catch (error) {
    throw error
  }
}

// 문서 인덱싱 완료 대기 후 세그먼트 추가
async function waitForDocumentIndexingAndAddSegments(
  syncId: string,
  datasetId: string,
  documentId: string,
  topicInterviews: InterviewTopicData[],
  topicName: string
): Promise<void> {
  // 문서 인덱싱 완료 대기 (최대 2분)
  const maxWaitTime = 120000
  const checkInterval = 3000
  let waitTime = 0
  let documentReady = false

  while (waitTime < maxWaitTime && !documentReady) {
    await new Promise(resolve => setTimeout(resolve, checkInterval))
    waitTime += checkInterval

    try {
      const docStatus = await checkDocumentStatus(datasetId, documentId)
      
      if (docStatus?.indexing_status === 'completed' || docStatus?.display_status === 'available') {
        documentReady = true
      }
    } catch (statusError) {
    }
  }

  if (!documentReady) {
    return
  }

  await addSegmentsToDocument(syncId, datasetId, documentId, topicInterviews, topicName)
}

// Topic ID 조회/생성
export async function getOrCreateTopicId(
  topicName: string, 
  companyId: string,
  projectId?: string | null
): Promise<string> {
  try {
    const { data: existingTopic, error: selectError } = await supabaseAdmin
      .from('main_topics')
      .select('id')
      .eq('topic_name', topicName.trim())
      .eq('company_id', companyId)
      .maybeSingle()

    if (selectError) {
      throw selectError
    }

    if (existingTopic) {
      return existingTopic.id
    }

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
      throw insertError
    }

    if (!newTopic) {
      throw new Error('Topic 생성 후 ID를 받지 못했습니다')
    }

    return newTopic.id

  } catch (error) {
    throw error
  }
}