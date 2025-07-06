'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { getUserActivityIcon, ActivityType, LocationType } from '@/lib/realtime/broadcast/types/global-presence.types'
import { useGlobalPresence } from '@/lib/realtime/broadcast/hooks/use-global-presence'

interface ProjectPresenceUser {
  userId: string
  userName?: string
  avatarUrl?: string
  activity: ActivityType
  location: LocationType
  color?: string
  lastActiveAt: string
}

interface ProjectPresenceIndicatorProps {
  projectId: string
  className?: string
  maxUsers?: number
  showCount?: boolean
}

export function ProjectPresenceIndicatorCompact({ 
  projectId, 
  className,
  maxUsers = 3,
  showCount = true 
}: ProjectPresenceIndicatorProps) {
  const { activeUsers: globalUsers } = useGlobalPresence()
  
  // Filter users in this project
  const activeUsers: ProjectPresenceUser[] = globalUsers
    .filter(user => {
      // User is in project detail, interview list, or interview detail for this project
      return user.currentLocation.projectId === projectId &&
        [
          LocationType.PROJECT_DETAIL,
          LocationType.INTERVIEW_LIST, 
          LocationType.INTERVIEW_DETAIL,
          LocationType.INTERVIEW_SCRIPT,
          LocationType.INTERVIEW_INSIGHTS
        ].includes(user.currentLocation.type)
    })
    .map(user => ({
      userId: user.userId,
      userName: user.userName,
      avatarUrl: user.avatarUrl,
      activity: user.activity,
      location: user.currentLocation.type,
      color: user.color,
      lastActiveAt: user.lastActiveAt
    }))
  
  if (activeUsers.length === 0) return null
  
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {/* User avatars */}
      <div className="flex -space-x-1">
        {activeUsers.slice(0, maxUsers).map((user) => (
          <div
            key={user.userId}
            className="relative w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
            style={{ backgroundColor: user.color || '#6B7280' }}
            title={`${user.userName} - ${getUserActivityIcon(user.activity)} ${user.location}`}
          >
            {user.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt={user.userName || 'User'} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full flex items-center justify-center text-white text-xs font-bold">
                {(user.userName || user.userId).charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* Activity indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white rounded-full flex items-center justify-center text-xs">
              {getUserActivityIcon(user.activity)}
            </div>
          </div>
        ))}
        
        {activeUsers.length > maxUsers && (
          <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center">
            <span className="text-xs text-gray-600 font-medium">
              +{activeUsers.length - maxUsers}
            </span>
          </div>
        )}
      </div>
      
      {/* Count text */}
      {showCount && (
        <span className="text-xs text-gray-500 font-medium">
          {activeUsers.length}명
        </span>
      )}
    </div>
  )
}

export function ProjectPresenceIndicatorDetailed({ 
  projectId, 
  className 
}: ProjectPresenceIndicatorProps) {
  const { activeUsers: globalUsers } = useGlobalPresence()
  
  // Filter users in this project
  const activeUsers: ProjectPresenceUser[] = globalUsers
    .filter(user => {
      return user.currentLocation.projectId === projectId &&
        [
          LocationType.PROJECT_DETAIL,
          LocationType.INTERVIEW_LIST, 
          LocationType.INTERVIEW_DETAIL,
          LocationType.INTERVIEW_SCRIPT,
          LocationType.INTERVIEW_INSIGHTS
        ].includes(user.currentLocation.type)
    })
    .map(user => ({
      userId: user.userId,
      userName: user.userName,
      avatarUrl: user.avatarUrl,
      activity: user.activity,
      location: user.currentLocation.type,
      color: user.color,
      lastActiveAt: user.lastActiveAt
    }))
  
  if (activeUsers.length === 0) return null
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-sm font-medium text-gray-700">
        현재 활동 중 ({activeUsers.length}명)
      </div>
      
      <div className="space-y-1">
        {activeUsers.map((user) => (
          <div key={user.userId} className="flex items-center gap-2 text-sm">
            <div
              className="w-5 h-5 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: user.color || '#6B7280' }}
            >
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.userName || 'User'} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {(user.userName || user.userId).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            <span className="text-gray-900">{user.userName}</span>
            <span className="text-gray-500">
              {getUserActivityIcon(user.activity)} {user.location}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}