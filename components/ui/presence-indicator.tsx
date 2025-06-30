'use client'

import React from 'react'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Viewer {
  userId: string
  userName?: string
  user_name?: string
  email?: string
  isCurrentUser?: boolean
}

interface PresenceIndicatorProps {
  viewers: Viewer[]
  currentUserId?: string
  className?: string
  maxDisplay?: number
}

export function PresenceIndicator({
  viewers,
  currentUserId,
  className,
  maxDisplay = 3,
}: PresenceIndicatorProps) {
  // 중복 제거 및 현재 사용자를 포함한 전체 viewers 목록 생성
  const uniqueViewers = viewers.reduce((acc: Viewer[], viewer) => {
    if (!acc.some(v => v.userId === viewer.userId)) {
      acc.push(viewer)
    }
    return acc
  }, [])
  
  const allViewers = uniqueViewers.map(viewer => ({
    ...viewer,
    isCurrentUser: viewer.userId === currentUserId,
    displayName: viewer.userName || viewer.user_name || '알 수 없는 사용자',
  }))

  // 현재 사용자를 먼저, 그 다음 다른 사용자들 정렬
  const sortedViewers = [
    ...allViewers.filter(v => v.isCurrentUser),
    ...allViewers.filter(v => !v.isCurrentUser),
  ]

  const displayViewers = sortedViewers.slice(0, maxDisplay)
  const remainingCount = sortedViewers.length - maxDisplay

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (userId: string) => {
    const colors = [
      'bg-sky-500',
      'bg-blue-500',
      'bg-cyan-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-purple-500',
      'bg-violet-500',
    ]
    const index = userId.charCodeAt(0) % colors.length
    return colors[index]
  }

  if (sortedViewers.length === 0) return null

  return (
    <TooltipProvider delayDuration={100}>
      <div className={cn(
        "flex items-center gap-3 p-3 bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl",
        className
      )}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/70 rounded-lg flex items-center justify-center shadow-sm">
            <Users className="h-4 w-4 text-sky-600" />
          </div>
          
          <p className="text-sm font-medium text-sky-900">
            {sortedViewers.length === 1 && sortedViewers[0].isCurrentUser
              ? '현재 보는 중'
              : `${sortedViewers.length}명이 함께 보는 중`}
          </p>
        </div>

        <div className="flex items-center -space-x-2 ml-auto">
          {displayViewers.map((viewer, index) => (
            <Tooltip key={viewer.userId} delayDuration={0}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "relative transition-transform hover:scale-110",
                    index !== 0 && "ml-[-8px]"
                  )}
                  style={{ zIndex: displayViewers.length - index }}
                >
                  <Avatar className="h-9 w-9 ring-2 ring-white/80 shadow-sm cursor-pointer">
                    <AvatarFallback 
                      className={cn(
                        getAvatarColor(viewer.userId),
                        "text-white text-xs font-medium"
                      )}
                    >
                      {getInitials(viewer.displayName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                className="bg-gray-900 text-white px-3 py-2 rounded-lg"
                sideOffset={8}
              >
                <div className="space-y-1">
                  <p className="font-medium text-sm">
                    {viewer.displayName}
                    {viewer.isCurrentUser && ' (나)'}
                  </p>
                  {viewer.email && (
                    <p className="text-xs text-gray-300">{viewer.email}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}

          {remainingCount > 0 && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div
                  className="relative transition-transform hover:scale-110 ml-[-8px]"
                  style={{ zIndex: 0 }}
                >
                  <Avatar className="h-9 w-9 ring-2 ring-white/80 shadow-sm cursor-pointer">
                    <AvatarFallback className="bg-sky-100 text-sky-700 text-xs font-medium">
                      +{remainingCount}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                className="bg-gray-900 text-white px-3 py-2 rounded-lg"
                sideOffset={8}
              >
                <p className="text-sm">{remainingCount}명이 더 보는 중</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

// Compact 버전 (작은 공간용)
export function PresenceIndicatorCompact({
  viewers,
  currentUserId,
  className,
}: PresenceIndicatorProps) {
  // 중복 제거 및 현재 사용자를 포함한 전체 viewers 목록 생성
  const uniqueViewers = viewers.reduce((acc: Viewer[], viewer) => {
    if (!acc.some(v => v.userId === viewer.userId)) {
      acc.push(viewer)
    }
    return acc
  }, [])
  
  const allViewers = uniqueViewers.map(viewer => ({
    ...viewer,
    isCurrentUser: viewer.userId === currentUserId,
    displayName: viewer.userName || viewer.user_name || '알 수 없는 사용자',
  }))

  if (allViewers.length === 0) return null

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (userId: string) => {
    const colors = [
      'bg-sky-500',
      'bg-blue-500',
      'bg-cyan-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-purple-500',
      'bg-violet-500',
    ]
    const index = userId.charCodeAt(0) % colors.length
    return colors[index]
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1 group cursor-pointer",
            className
          )}>
            <div className="flex -space-x-1.5">
              {allViewers.slice(0, 3).map((viewer, index) => (
                <Avatar 
                  key={viewer.userId}
                  className="h-6 w-6 border border-white shadow-sm transition-transform group-hover:scale-110"
                  style={{ zIndex: 3 - index }}
                >
                  <AvatarFallback 
                    className={cn(
                      getAvatarColor(viewer.userId),
                      "text-white text-[10px] font-medium"
                    )}
                  >
                    {getInitials(viewer.displayName)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {allViewers.length > 3 && (
                <div 
                  className="h-6 w-6 rounded-full bg-gray-200 border border-white shadow-sm flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ zIndex: 0 }}
                >
                  <span className="text-[10px] font-medium text-gray-600">
                    +{allViewers.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="bg-gray-900 text-white px-3 py-2 rounded-lg max-w-xs"
          sideOffset={8}
        >
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-300 mb-1">
              {allViewers.length}명이 보는 중
            </p>
            {allViewers.map(viewer => (
              <div key={viewer.userId} className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback 
                    className={cn(
                      getAvatarColor(viewer.userId),
                      "text-white text-[9px] font-medium"
                    )}
                  >
                    {getInitials(viewer.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {viewer.displayName}
                    {viewer.isCurrentUser && ' (나)'}
                  </p>
                  {viewer.email && (
                    <p className="text-[10px] text-gray-400 truncate">{viewer.email}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}