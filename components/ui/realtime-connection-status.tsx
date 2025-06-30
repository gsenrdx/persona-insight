'use client'

import { useCallback } from 'react'
import { useInterviewRealtime } from '@/lib/realtime/interview-realtime-provider'
import { cn } from '@/lib/utils'
import { Wifi, WifiOff, AlertCircle, RotateCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface RealtimeConnectionStatusProps {
  className?: string
  projectId: string
  onRefresh?: () => void
}

export function RealtimeConnectionStatus({ className, projectId, onRefresh }: RealtimeConnectionStatusProps) {
  const { isSubscribed, error, isLoading, subscribeToProject } = useInterviewRealtime()
  
  const handleRefresh = useCallback(() => {
    if (isSubscribed) {
      // 연결되어 있으면 단순 새로고침 메시지
      toast.success('데이터가 실시간으로 동기화되고 있습니다')
      onRefresh?.()
    } else {
      // 연결이 끊어진 경우 재연결 시도
      toast.info('재연결을 시도합니다...')
      subscribeToProject(projectId)
      onRefresh?.()
    }
  }, [isSubscribed, projectId, subscribeToProject, onRefresh])
  
  if (isLoading) {
    return (
      <button
        disabled
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-sm cursor-not-allowed",
          className
        )}
      >
        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
        <span className="text-gray-700">연결 중...</span>
      </button>
    )
  }
  
  if (error || !isSubscribed) {
    return (
      <button
        onClick={handleRefresh}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
          error ? "bg-red-50 hover:bg-red-100 text-red-700" : "bg-gray-100 hover:bg-gray-200 text-gray-700",
          className
        )}
      >
        <RotateCw className="w-4 h-4" />
        <span>새로고침</span>
      </button>
    )
  }
  
  // 연결됨 상태
  return (
    <button
      onClick={handleRefresh}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-sm transition-colors",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-green-700">연결됨</span>
      </div>
    </button>
  )
}