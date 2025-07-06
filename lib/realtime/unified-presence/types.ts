/**
 * Unified presence types for Notion-like collaborative experience
 */

export interface UnifiedPresenceUser {
  userId: string
  userName: string
  avatarUrl?: string
  color: string
  isCurrentUser: boolean
  
  // Location context
  location: {
    type: 'project_detail' | 'interview_list' | 'interview_detail' | 'script_editing'
    projectId?: string
    interviewId?: string
  }
  
  // Activity details
  activity: {
    type: 'viewing' | 'editing' | 'commenting'
    details?: {
      scriptId?: string
      cursorPosition?: number
      selection?: { start: number; end: number }
    }
  }
  
  lastActiveAt: string
}

export interface ActivityUpdate {
  type: 'viewing' | 'editing' | 'commenting'
  scriptId?: string
  cursorPosition?: number
  selection?: { start: number; end: number }
  details?: string
}

export interface UnifiedPresenceReturn {
  // All users in current context
  allUsers: UnifiedPresenceUser[]
  
  // Activity-based grouping
  viewers: UnifiedPresenceUser[]     // Simple viewing
  editors: UnifiedPresenceUser[]     // Real-time editing
  commenters: UnifiedPresenceUser[]  // Commenting
  
  // Current user info
  currentUser: UnifiedPresenceUser | null
  
  // Stats
  totalCount: number
  activeEditorsCount: number
  
  // Update functions
  updateActivity: (activity: ActivityUpdate) => void
  
  // Loading states
  isLoading: boolean
  isConnected: boolean
  error: Error | null
}

export interface UnifiedPresenceOptions {
  interviewId?: string
  includeCurrentUser?: boolean
  enableEditing?: boolean
  heartbeatInterval?: number
}

// Activity priority for UI display
export const ACTIVITY_PRIORITY = {
  editing: 3,
  commenting: 2,
  viewing: 1
} as const

// Activity display config
export const ACTIVITY_CONFIG = {
  editing: {
    label: '편집 중',
    dotColor: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    icon: '✏️'
  },
  commenting: {
    label: '댓글 작성 중',
    dotColor: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: '💬'
  },
  viewing: {
    label: '보는 중',
    dotColor: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: '👁️'
  }
} as const