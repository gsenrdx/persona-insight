/**
 * MISO Interview Detail 파싱 유틸리티
 */

// interview_detail 문자열을 JSON 배열로 파싱
export function parseInterviewDetail(interviewDetail: any): any[] | null {
  if (!interviewDetail) return null
  
  try {
    if (typeof interviewDetail !== 'string') {
      return Array.isArray(interviewDetail) ? interviewDetail : null
    }

    let cleanedData = interviewDetail.trim()
    
    // 이중 인코딩 확인
    if (cleanedData.startsWith('"') && cleanedData.endsWith('"')) {
      try {
        cleanedData = JSON.parse(cleanedData)
      } catch (e) {
        cleanedData = cleanedData.slice(1, -1)
      }
    }
    
    cleanedData = cleanedData.replace(/\\"/g, '"')
    cleanedData = cleanedData.replace(/\\n/g, '\n')
    cleanedData = cleanedData.replace(/\\\\/g, '\\')
    
    // 첫 번째 JSON 배열만 추출 (괄호 매칭)
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
    
    cleanedData = cleanedData.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    cleanedData = cleanedData.replace(/^```\s*/, '').replace(/\s*```$/, '')
    
    cleanedData = cleanedData.trim()

    if (cleanedData.startsWith('[') && cleanedData.endsWith(']')) {
      const parsed = JSON.parse(cleanedData)
      
      if (Array.isArray(parsed)) {
        return parsed
      } else {
        return null
      }
    } 
    else if (cleanedData.startsWith('{') && cleanedData.endsWith('}')) {
      const singleObject = JSON.parse(cleanedData)
      
      if (singleObject && typeof singleObject === 'object') {
        return [singleObject]
      } else {
        return null
      }
    } 
    else {
      return null
    }
    
  } catch (parseError) {
    return null
  }
}

// 인터뷰 topic 데이터 타입
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

// topic별로 인터뷰 데이터 그룹핑
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