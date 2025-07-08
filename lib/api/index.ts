/**
 * API 레이어 중앙 export
 * 모든 API 모듈을 여기서 관리하여 일관된 import 패턴 제공
 */

// Base API client and utilities
export { 
  apiClient, 
  extractApiData,
  isApiSuccess,
  isApiError
} from './base'

// Error classes from central error management
export { ApiError } from '@/lib/errors'

// Domain-specific API modules
export { authApi } from './auth'
export { interviewsApi } from './interviews'
export { personasApi } from './personas'
export { projectsApi } from './projects'

// Legacy exports for backward compatibility
export {
  fetchProjects,
  createProject,
  deleteProject,
  fetchProjectMembers,
  joinProject
} from './projects'

// Re-export persona-criteria as is (no refactoring needed for now)
export * from './persona-criteria'

// Type exports (이제 types/api.ts에서 중앙 관리됨)
export type {
  // 공통 API 타입들
  ApiResponse,
  PaginatedApiResponse,
  ErrorResponse,
  
  // Auth types
  LoginRequest,
  SignupRequest,
  AuthUser,
  AuthResponse,
  ProfileUpdateRequest,
  
  // Interview types
  Interview,
  InterviewListQuery,
  InterviewProcessingResult,
  
  // Persona types
  PersonaListQuery,
  PersonaSynthesisRequest,
  PersonaSynthesisResult,
  PersonaUpdateRequest,
  PersonaChatMessage,
  PersonaChatRequest,
  PersonaChatResponse,
  
  // Project types
  ProjectListQuery,
  ProjectUpdateRequest,
  ProjectJoinRequest,
  ProjectMemberInviteRequest,
  ProjectInsight
} from '@/types/api'