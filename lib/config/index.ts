/**
 * 설정 통합 익스포트
 */

// 개별 설정 파일들
export * from './upload'
export * from './workflow'
export * from './ui'
export * from './api'
export * from './defaults'

// 통합 설정 객체
import { FILE_UPLOAD_CONFIG } from './upload'
import { WORKFLOW_CONFIG, PAGINATION_CONFIG, SEARCH_CONFIG } from './workflow'
import { CHAT_CONFIG, CACHE_CONFIG, UI_CONFIG } from './ui'
import { API_CONFIG, SECURITY_CONFIG, ENV_CONFIG } from './api'

/**
 * 모든 설정을 하나로 통합
 */
export const CONFIG = {
  FILE_UPLOAD: FILE_UPLOAD_CONFIG,
  PAGINATION: PAGINATION_CONFIG,
  WORKFLOW: WORKFLOW_CONFIG,
  SEARCH: SEARCH_CONFIG,
  CHAT: CHAT_CONFIG,
  CACHE: CACHE_CONFIG,
  UI: UI_CONFIG,
  API: API_CONFIG,
  SECURITY: SECURITY_CONFIG,
  ENV: ENV_CONFIG,
} as const

// 타입 정의
export type FileUploadConfig = typeof FILE_UPLOAD_CONFIG
export type PaginationConfig = typeof PAGINATION_CONFIG
export type WorkflowConfig = typeof WORKFLOW_CONFIG
export type SearchConfig = typeof SEARCH_CONFIG
export type ChatConfig = typeof CHAT_CONFIG
export type CacheConfig = typeof CACHE_CONFIG
export type UIConfig = typeof UI_CONFIG
export type APIConfig = typeof API_CONFIG
export type SecurityConfig = typeof SECURITY_CONFIG
export type EnvironmentConfig = typeof ENV_CONFIG