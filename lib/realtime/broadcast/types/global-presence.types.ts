/**
 * Global presence types for company-wide collaboration
 */

import type { BroadcastMessage } from './base.types'

// Global broadcast events
export enum GlobalBroadcastType {
  GLOBAL_PRESENCE = 'global_presence',
  PROJECT_PRESENCE = 'project_presence',
  USER_ACTIVITY = 'user_activity'
}

// Location types where users can be present
export enum LocationType {
  PROJECT_LIST = 'project_list',
  PROJECT_DETAIL = 'project_detail', 
  INTERVIEW_LIST = 'interview_list',
  INTERVIEW_DETAIL = 'interview_detail',
  INTERVIEW_SCRIPT = 'interview_script',
  INTERVIEW_INSIGHTS = 'interview_insights',
  PERSONA_ANALYSIS = 'persona_analysis',
  WORKFLOW_QUEUE = 'workflow_queue'
}

// Activity types for different user actions
export enum ActivityType {
  VIEWING = 'viewing',          // Just viewing content
  EDITING = 'editing',          // Actively editing
  COMMENTING = 'commenting',    // Adding notes/comments
  PROCESSING = 'processing',    // Running workflows
  IDLE = 'idle'                // Inactive but connected
}

// Global presence payload
export interface GlobalPresencePayload {
  userId: string
  userName?: string
  avatarUrl?: string
  
  // Current location context
  currentLocation: {
    type: LocationType
    projectId?: string
    interviewId?: string
    scriptId?: string
    persona?: string
  }
  
  // Current activity
  activity: ActivityType
  activityDetails?: string // e.g., "Editing script line 45"
  
  // Metadata
  color?: string           // User's assigned color
  lastActiveAt: string     // ISO timestamp
  sessionId?: string       // Browser session ID
}

// Project-specific presence summary
export interface ProjectPresencePayload {
  projectId: string
  activeUsers: {
    userId: string
    userName?: string
    avatarUrl?: string
    activity: ActivityType
    location: LocationType
    color?: string
    lastActiveAt: string
  }[]
  totalActiveCount: number
}

// Typed broadcast messages
export type GlobalPresenceBroadcastMessage = BroadcastMessage<GlobalPresencePayload>
export type ProjectPresenceBroadcastMessage = BroadcastMessage<ProjectPresencePayload>

// Channel names for global presence
export const getGlobalPresenceChannelName = (companyId: string) => `company:${companyId}:presence`
export const getProjectPresenceChannelName = (projectId: string) => `project:${projectId}:presence`

// Helper functions
export const isUserActive = (presence: GlobalPresencePayload, thresholdMs: number = 90000): boolean => {
  return Date.now() - new Date(presence.lastActiveAt).getTime() < thresholdMs
}

export const getUserActivityIcon = (activity: ActivityType): string => {
  switch (activity) {
    case ActivityType.EDITING: return '✏️'
    case ActivityType.COMMENTING: return '💬'
    case ActivityType.PROCESSING: return '⚡'
    case ActivityType.VIEWING: return '👁️'
    case ActivityType.IDLE: return '💤'
    default: return '👤'
  }
}

export const getLocationDisplayName = (location: LocationType): string => {
  switch (location) {
    case LocationType.PROJECT_LIST: return '프로젝트 목록'
    case LocationType.PROJECT_DETAIL: return '프로젝트 상세'
    case LocationType.INTERVIEW_LIST: return '인터뷰 목록'
    case LocationType.INTERVIEW_DETAIL: return '인터뷰 상세'
    case LocationType.INTERVIEW_SCRIPT: return '대화 스크립트'
    case LocationType.INTERVIEW_INSIGHTS: return '인사이트'
    case LocationType.PERSONA_ANALYSIS: return '페르소나 분석'
    case LocationType.WORKFLOW_QUEUE: return '워크플로 처리'
    default: return '알 수 없음'
  }
}