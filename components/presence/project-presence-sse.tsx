'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { usePresenceSSE } from '@/hooks/use-presence-sse'

interface ProjectPresenceSSEProps {
  projectId: string
  className?: string
  maxVisible?: number
  showCount?: boolean
}

export function ProjectPresenceSSE({ 
  projectId, 
  className,
  maxVisible = 3,
  showCount = true 
}: ProjectPresenceSSEProps) {
  const { users, isConnected, error } = usePresenceSSE(projectId)
  
  // 색상 생성 함수 메모화
  const getColorFromId = useMemo(() => {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
      '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
    ]
    
    return (id: string): string => {
      let hash = 0
      for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash)
      }
      return colors[Math.abs(hash) % colors.length]
    }
  }, [])
  
  // 오류 발생 시 숨김
  if (error || !isConnected) {
    return null
  }
  
  if (users.length === 0) {
    return null
  }
  
  const displayUsers = users.slice(0, maxVisible)
  const remainingCount = users.length - maxVisible
  
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {/* 사용자 아바타 */}
      <div className="flex -space-x-1">
        {displayUsers.map((user) => (
          <div
            key={user.userId}
            className="relative group"
          >
            <div
              className="w-7 h-7 rounded-full border-2 border-white shadow-sm transition-all hover:scale-110 hover:z-10"
              style={{ 
                backgroundColor: user.avatarUrl ? 'transparent' : getColorFromId(user.userId) 
              }}
            >
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.userName || 'User'} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full flex items-center justify-center text-white text-xs font-semibold">
                  {(user.userName || user.email || user.userId).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            {/* 툴팁 */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {user.userName || user.email || 'Anonymous'}
              {user.location && <span className="text-gray-400 ml-1">• {user.location}</span>}
            </div>
            
            {/* 활성 상태 표시 */}
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
          </div>
        ))}
        
        {/* 추가 사용자 수 */}
        {remainingCount > 0 && (
          <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center hover:scale-110 transition-all">
            <span className="text-xs text-gray-600 font-medium">
              +{remainingCount}
            </span>
          </div>
        )}
      </div>
      
      {/* 활성 사용자 수 */}
      {showCount && (
        <span className="text-xs text-gray-500 font-medium">
          {users.length}명 활동 중
        </span>
      )}
      
      {/* 연결 상태 표시 (개발 중에만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="flex items-center gap-1">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-red-500"
          )} />
          <span className="text-xs text-gray-400">SSE</span>
        </div>
      )}
    </div>
  )
}


// 상세 뷰 컴포넌트
export function ProjectPresenceSSEDetailed({ 
  projectId, 
  className 
}: ProjectPresenceSSEProps) {
  const { users, isConnected, updateMyPresence } = usePresenceSSE(projectId)
  
  // 색상 생성 함수 메모화
  const getColorFromId = useMemo(() => {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
      '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
    ]
    
    return (id: string): string => {
      let hash = 0
      for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash)
      }
      return colors[Math.abs(hash) % colors.length]
    }
  }, [])
  
  if (!isConnected || users.length === 0) {
    return null
  }
  
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          현재 활동 중 ({users.length}명)
        </h3>
        <button
          onClick={() => updateMyPresence({ status: 'active' })}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          상태 업데이트
        </button>
      </div>
      
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.userId} className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full shadow-sm flex-shrink-0"
              style={{ 
                backgroundColor: user.avatarUrl ? 'transparent' : getColorFromId(user.userId) 
              }}
            >
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.userName || 'User'} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {(user.userName || user.email || user.userId).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.userName || user.email || 'Anonymous'}
              </p>
              {user.location && (
                <p className="text-xs text-gray-500 truncate">
                  {user.location}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>활동 중</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 컴팩트 버전 - 프로젝트 카드용
export function ProjectPresenceIndicatorSSECompact({ 
  projectId, 
  className,
  maxUsers = 3,
  showCount = true 
}: {
  projectId: string
  className?: string
  maxUsers?: number
  showCount?: boolean
}) {
  const { users, isLoading, error } = usePresenceSSE(projectId)
  
  if (isLoading || error || !users || users.length === 0) {
    return null
  }

  const displayUsers = users.slice(0, maxUsers)
  const remainingCount = Math.max(0, users.length - maxUsers)

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Avatar stack */}
      <div className="flex -space-x-1">
        {displayUsers.map((user) => (
          <div
            key={user.userId}
            className="relative w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white shadow-sm flex items-center justify-center text-xs font-medium text-white"
            title={user.userName || user.email || 'Anonymous'}
          >
            {(user.userName || user.email || 'A').charAt(0).toUpperCase()}
            
            {/* Activity indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>
          </div>
        ))}
        
        {remainingCount > 0 && (
          <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center">
            <span className="text-xs text-gray-600 font-medium">
              +{remainingCount}
            </span>
          </div>
        )}
      </div>
      
      {/* Count text */}
      {showCount && (
        <span className="text-xs text-gray-500 font-medium">
          {users.length}명
        </span>
      )}
    </div>
  )
}