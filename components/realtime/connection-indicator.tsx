'use client'

import { useInterviewRealtime } from '@/lib/realtime'
import { cn } from '@/lib/utils'
import { WifiIcon, WifiOffIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function ConnectionIndicator() {
  const { isSubscribed, error } = useInterviewRealtime()

  const getStatus = () => {
    if (error) return { color: 'bg-red-500', label: '연결 오류', icon: WifiOffIcon }
    if (!isSubscribed) return { color: 'bg-yellow-500', label: '연결 중...', icon: WifiIcon }
    return { color: 'bg-green-500', label: '실시간 연결됨', icon: WifiIcon }
  }

  const status = getStatus()
  const Icon = status.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <div className={cn('h-2 w-2 rounded-full', status.color)} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{status.label}</p>
          {error && (
            <p className="text-xs text-muted-foreground mt-1">
              {error.message}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}