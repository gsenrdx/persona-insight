/**
 * Unified presence hook for Notion-like collaborative experience
 * Combines global presence and script presence with current user inclusion
 */

import { useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePathname } from 'next/navigation'
import { useGlobalPresence } from '../broadcast/hooks/use-global-presence'
import { useInterviewScriptBroadcast } from '../broadcast/hooks/use-interview-script-broadcast'
import { InterviewScriptHandler } from '../broadcast/handlers/interview-script-handler'
import {
  UnifiedPresenceUser,
  UnifiedPresenceReturn,
  UnifiedPresenceOptions,
  ActivityUpdate,
  ACTIVITY_PRIORITY
} from './types'

export function useUnifiedPresence({
  interviewId,
  includeCurrentUser = true,
  enableEditing = true,
  heartbeatInterval = 20000
}: UnifiedPresenceOptions = {}): UnifiedPresenceReturn {
  
  const { user, profile } = useAuth()
  const pathname = usePathname()
  
  // Use existing hooks
  const globalPresence = useGlobalPresence({
    enabled: true,
    trackLocation: true,
    trackActivityEnabled: true,
    heartbeatInterval: 30000
  })
  
  const scriptPresence = useInterviewScriptBroadcast({
    interviewId: interviewId || '',
    enabled: enableEditing && !!interviewId,
    heartbeatInterval
  })
  
  // Get current user color consistently
  const currentUserColor = useMemo(() => {
    if (!user?.id) return '#6B7280'
    return InterviewScriptHandler.generateUserColor(user.id)
  }, [user?.id])
  
  // Create current user presence data
  const currentUserPresence = useMemo((): UnifiedPresenceUser | null => {
    if (!user || !profile) return null
    
    const location = (() => {
      if (pathname.includes('/interviews/') && interviewId) {
        return {
          type: 'interview_detail' as const,
          projectId: pathname.split('/')[2],
          interviewId
        }
      }
      if (pathname.includes('/interviews')) {
        return {
          type: 'interview_list' as const,
          projectId: pathname.split('/')[2]
        }
      }
      if (pathname.includes('/projects/')) {
        return {
          type: 'project_detail' as const,
          projectId: pathname.split('/')[2]
        }
      }
      return {
        type: 'project_detail' as const
      }
    })()
    
    // Check if user is currently editing
    const isEditing = scriptPresence.isConnected && 
                     Array.from(scriptPresence.presence.values())
                       .some(p => p.userId === user.id)
    
    return {
      userId: user.id,
      userName: profile.name || user.email?.split('@')[0] || 'Unknown',
      avatarUrl: profile.avatar_url || undefined,
      color: currentUserColor,
      isCurrentUser: true,
      location,
      activity: {
        type: isEditing ? 'editing' : 'viewing'
      },
      lastActiveAt: new Date().toISOString()
    }
  }, [user, profile, pathname, interviewId, currentUserColor, scriptPresence.isConnected, scriptPresence.presence])
  
  // Merge and transform presence data
  const unifiedUsers = useMemo((): UnifiedPresenceUser[] => {
    const usersMap = new Map<string, UnifiedPresenceUser>()
    
    // Add current user if enabled
    if (includeCurrentUser && currentUserPresence) {
      usersMap.set(currentUserPresence.userId, currentUserPresence)
    }
    
    // Process global presence users
    globalPresence.activeUsers.forEach(globalUser => {
      if (globalUser.userId === user?.id && !includeCurrentUser) return
      
      const locationContext = globalUser.currentLocation
      const isInCurrentInterview = interviewId && 
        locationContext.interviewId === interviewId
      
      // Only include users in current context or current interview
      if (!isInCurrentInterview && interviewId) return
      
      const unifiedUser: UnifiedPresenceUser = {
        userId: globalUser.userId,
        userName: globalUser.userName || 'Unknown',
        avatarUrl: globalUser.avatarUrl,
        color: globalUser.color || '#6B7280',
        isCurrentUser: globalUser.userId === user?.id,
        location: {
          type: locationContext.type === 'INTERVIEW_DETAIL' ? 'interview_detail' :
                locationContext.type === 'INTERVIEW_LIST' ? 'interview_list' :
                locationContext.type === 'PROJECT_DETAIL' ? 'project_detail' : 'project_detail',
          projectId: locationContext.projectId,
          interviewId: locationContext.interviewId
        },
        activity: {
          type: 'viewing' // Default to viewing for global presence
        },
        lastActiveAt: globalUser.lastActiveAt
      }
      
      usersMap.set(globalUser.userId, unifiedUser)
    })
    
    // Override with script editing presence (higher priority)
    if (interviewId && scriptPresence.presence.size > 0) {
      Array.from(scriptPresence.presence.values()).forEach(scriptUser => {
        const existing = usersMap.get(scriptUser.userId)
        
        const editingUser: UnifiedPresenceUser = {
          userId: scriptUser.userId,
          userName: scriptUser.userName || existing?.userName || 'Unknown',
          avatarUrl: scriptUser.avatarUrl || existing?.avatarUrl,
          color: scriptUser.color || existing?.color || '#6B7280',
          isCurrentUser: scriptUser.userId === user?.id,
          location: existing?.location || {
            type: 'script_editing',
            projectId: pathname.split('/')[2],
            interviewId
          },
          activity: {
            type: 'editing',
            details: {
              scriptId: scriptUser.scriptId,
              cursorPosition: scriptUser.cursorPosition,
              selection: scriptUser.selection
            }
          },
          lastActiveAt: scriptUser.lastActiveAt || new Date().toISOString()
        }
        
        usersMap.set(scriptUser.userId, editingUser)
      })
    }
    
    // Filter out inactive users (older than 2 minutes)
    const activeUsers = Array.from(usersMap.values()).filter(user => {
      const lastActive = new Date(user.lastActiveAt).getTime()
      const now = Date.now()
      return (now - lastActive) < 120000 // 2 minutes
    })
    
    // Sort by activity priority, then by name
    return activeUsers.sort((a, b) => {
      const priorityDiff = ACTIVITY_PRIORITY[b.activity.type] - ACTIVITY_PRIORITY[a.activity.type]
      if (priorityDiff !== 0) return priorityDiff
      return a.userName.localeCompare(b.userName)
    })
    
  }, [
    globalPresence.activeUsers, 
    scriptPresence.presence, 
    currentUserPresence, 
    includeCurrentUser,
    interviewId,
    user?.id,
    pathname
  ])
  
  // Group users by activity
  const viewers = useMemo(() => 
    unifiedUsers.filter(u => u.activity.type === 'viewing'), 
    [unifiedUsers]
  )
  
  const editors = useMemo(() => 
    unifiedUsers.filter(u => u.activity.type === 'editing'), 
    [unifiedUsers]
  )
  
  const commenters = useMemo(() => 
    unifiedUsers.filter(u => u.activity.type === 'commenting'), 
    [unifiedUsers]
  )
  
  // Update activity function
  const updateActivity = useCallback((activity: ActivityUpdate) => {
    if (!interviewId || !enableEditing) return
    
    // Update script presence if editing
    if (activity.type === 'editing' && scriptPresence.updatePresence) {
      scriptPresence.updatePresence({
        scriptId: activity.scriptId,
        cursorPosition: activity.cursorPosition,
        selection: activity.selection
      })
    }
    
    // Update global presence activity
    if (globalPresence.trackActivity) {
      globalPresence.trackActivity(
        activity.type.toUpperCase() as any,
        'INTERVIEW_DETAIL' as any,
        {
          interviewId,
          activityDetails: activity.details
        }
      )
    }
  }, [interviewId, enableEditing, scriptPresence.updatePresence, globalPresence.trackActivity])
  
  return {
    allUsers: unifiedUsers,
    viewers,
    editors,
    commenters,
    currentUser: currentUserPresence,
    totalCount: unifiedUsers.length,
    activeEditorsCount: editors.length,
    updateActivity,
    isLoading: globalPresence.isLoading || scriptPresence.isLoading,
    isConnected: globalPresence.isConnected || scriptPresence.isConnected,
    error: globalPresence.error || scriptPresence.error
  }
}