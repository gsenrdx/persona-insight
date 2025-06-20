/**
 * MISO Knowledge API 통합 익스포트 (레거시 호환성)
 * @deprecated 새로운 import 경로를 사용하세요: @/lib/services/miso
 */

// 새 구조로의 re-export
export {
  parseInterviewDetail,
  groupInterviewsByTopic,
  syncInterviewTopicsToPersona,
  getOrCreateTopicId,
  type InterviewTopicData
} from './services/miso'