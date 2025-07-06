'use client'

import { useCallback } from 'react'
import { useRealtime } from '@/lib/realtime'
import { cn } from '@/lib/utils'
import { Wifi, WifiOff, AlertCircle, RotateCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface RealtimeConnectionStatusProps {
  className?: string
  projectId: string
  onRefresh?: () => void
}

export function RealtimeConnectionStatus({ className, projectId, onRefresh }: RealtimeConnectionStatusProps) {
  const { isConnected: isSubscribed, error, isLoading, subscribeToProject } = useRealtime()
  
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              disabled
              className={cn(
                "p-2.5 rounded-md bg-gray-100 cursor-not-allowed",
                className
              )}
            >
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>연결 중...</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  
  if (error || !isSubscribed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleRefresh}
              className={cn(
                "p-2.5 rounded-md transition-colors",
                error ? "bg-red-50 hover:bg-red-100" : "bg-gray-100 hover:bg-gray-200",
                className
              )}
            >
              {error ? (
                <WifiOff className="w-5 h-5 text-red-600" />
              ) : (
                <RotateCw className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{error ? '연결 오류 - 클릭하여 재연결' : '새로고침'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  
  // 연결됨 상태
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleRefresh}
            className={cn(
              "p-2.5 rounded-md bg-green-50 hover:bg-green-100 transition-colors relative",
              className
            )}
          >
            <Wifi className="w-5 h-5 text-green-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>실시간 연결됨</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}