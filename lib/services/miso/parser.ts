/**
 * MISO Interview Detail 파싱 유틸리티
 * interview_detail 문자열을 파싱하여 JSON 배열로 변환
 */

/**
 * interview_detail 문자열을 파싱하여 JSON 배열로 변환
 * workflow route의 로직을 기반으로 구현
 */
export function parseInterviewDetail(interviewDetail: any): any[] | null {
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