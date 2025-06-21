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

    // Batch process all topics
    await syncBatchTopicsToPersona(
      syncId,
      details,
      personaId,
      personaDatasetId,
      interview.company_id,
      interview.project_id
    )

  } catch (error) {
    throw error
  }
}

// Batch process multiple topics to persona
async function syncBatchTopicsToPersona(
  syncId: string,
  topicsData: any[],
  personaId: string,
  personaDatasetId: string,
  companyId: string,
  projectId: string | null
): Promise<void> {
  // Filter valid topics
  const validTopics = topicsData.filter(t => t.topic_name)
  if (validTopics.length === 0) return

  // Extract unique topic names
  const topicNames = [...new Set(validTopics.map(t => t.topic_name.trim()))]

  try {
    // Batch fetch/create all topic IDs
    const topicIdMap = await getOrCreateTopicIds(topicNames, companyId, projectId)

    // Fetch all interviews for this persona once
    const { data: allInterviews, error: allInterviewsError } = await supabaseAdmin
      .from('interviewees')
      .select('id, interview_detail')
      .eq('persona_id', personaId)
      .eq('persona_reflected', true)
      .not('interview_detail', 'is', null)

    if (allInterviewsError) {
      throw allInterviewsError
    }

    // Batch fetch existing documents
    const { data: existingDocs, error: docsError } = await supabaseAdmin
      .from('persona_topic_documents')
      .select('topic_id, miso_document_id')
      .eq('persona_id', personaId)
      .in('topic_id', Object.values(topicIdMap))

    if (docsError) {
      throw docsError
    }

    // Create a map of existing documents
    const existingDocsMap = (existingDocs || []).reduce((acc, doc) => {
      acc[doc.topic_id] = doc.miso_document_id
      return acc
    }, {} as Record<string, string>)

    // Process each topic
    const upsertData: any[] = []
    const documentOperations: Promise<void>[] = []

    for (const topicName of topicNames) {
      const topicId = topicIdMap[topicName]
      if (!topicId) continue

      // Collect all interview data for this topic
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

      if (topicInterviews.length === 0) continue

      // Handle document creation/update
      const existingDocId = existingDocsMap[topicId]
      let documentId: string

      if (existingDocId) {
        // Add segments to existing document
        documentId = existingDocId
        documentOperations.push(
          addSegmentsToDocument(
            syncId,
            personaDatasetId,
            documentId,
            topicInterviews,
            topicName
          )
        )
      } else {
        // Create new document and add segments
        documentOperations.push(
          (async () => {
            const newDocId = await createMisoDocumentOnly(
              personaDatasetId,
              topicName,
              topicInterviews.length
            )
            
            await waitForDocumentIndexingAndAddSegments(
              syncId,
              personaDatasetId,
              newDocId,
              topicInterviews,
              topicName
            )

            // Add to upsert data
            upsertData.push({
              persona_id: personaId,
              topic_id: topicId,
              miso_document_id: newDocId,
              document_title: topicName,
              interview_count: topicInterviews.length,
              last_synced_at: new Date().toISOString()
            })
          })()
        )
      }

      // Update existing documents
      if (existingDocId) {
        upsertData.push({
          persona_id: personaId,
          topic_id: topicId,
          miso_document_id: existingDocId,
          document_title: topicName,
          interview_count: topicInterviews.length,
          last_synced_at: new Date().toISOString()
        })
      }
    }

    // Execute all document operations in parallel
    await Promise.all(documentOperations)

    // Batch upsert persona_topic_documents
    if (upsertData.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('persona_topic_documents')
        .upsert(upsertData, {
          onConflict: 'persona_id,topic_id'
        })

      if (upsertError) {
        throw upsertError
      }
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

// Batch get or create topic IDs
async function getOrCreateTopicIds(
  topicNames: string[],
  companyId: string,
  projectId?: string | null
): Promise<Record<string, string>> {
  try {
    // Fetch existing topics
    const { data: existingTopics, error: selectError } = await supabaseAdmin
      .from('main_topics')
      .select('id, topic_name')
      .in('topic_name', topicNames)
      .eq('company_id', companyId)

    if (selectError) {
      throw selectError
    }

    // Create map of existing topics
    const topicIdMap: Record<string, string> = {}
    const existingTopicNames = new Set<string>()
    
    for (const topic of existingTopics || []) {
      topicIdMap[topic.topic_name] = topic.id
      existingTopicNames.add(topic.topic_name)
    }

    // Find topics that need to be created
    const topicsToCreate = topicNames.filter(name => !existingTopicNames.has(name))

    // Batch create new topics
    if (topicsToCreate.length > 0) {
      const newTopicsData = topicsToCreate.map(topicName => ({
        topic_name: topicName,
        company_id: companyId,
        project_id: projectId
      }))

      const { data: newTopics, error: insertError } = await supabaseAdmin
        .from('main_topics')
        .insert(newTopicsData)
        .select('id, topic_name')

      if (insertError) {
        throw insertError
      }

      // Add new topics to map
      for (const topic of newTopics || []) {
        topicIdMap[topic.topic_name] = topic.id
      }
    }

    return topicIdMap

  } catch (error) {
    throw error
  }
}

