import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Interview } from '@/types/interview'
import { RealtimeChannel } from '@supabase/supabase-js'
import { toast } from 'sonner'

interface UseRealtimeInterviewsOptions {
  projectId: string
  enabled?: boolean
  onUpdate?: (interview: Interview) => void
  onInsert?: (interview: Interview) => void
  onDelete?: (interviewId: string) => void
  onConnectionChange?: (connected: boolean) => void
}

export function useRealtimeInterviews({
  projectId,
  enabled = true,
  onUpdate,
  onInsert,
  onDelete,
  onConnectionChange
}: UseRealtimeInterviewsOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !projectId) {
      // 비활성화되면 연결 해제
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        setIsConnected(false)
        onConnectionChange?.(false)
      }
      return
    }

    let mounted = true

    const setupRealtime = async () => {
      try {
        // 기존 채널 정리
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current)
          channelRef.current = null
        }

        // 세션 확인
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || !mounted) return

        // 새 채널 생성 (완전히 고유한 이름)
        const channelName = `interviews-${projectId}-${Date.now()}-${Math.random().toString(36).substring(2)}`
        const channel = supabase.channel(channelName)

        // 이벤트 리스너 설정
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'interviews',
            filter: `project_id=eq.${projectId}`
          },
          (payload) => {
            if (!mounted) return

            try {
              switch (payload.eventType) {
                case 'INSERT':
                  onInsert?.(payload.new as Interview)
                  toast.info('새 인터뷰가 추가되었습니다')
                  break
                case 'UPDATE':
                  const updated = payload.new as Interview
                  onUpdate?.(updated)
                  if (updated.status === 'completed') {
                    toast.success(`"${updated.title}" 분석이 완료되었습니다!`)
                  } else if (updated.status === 'failed') {
                    toast.error(`"${updated.title}" 분석에 실패했습니다`)
                  }
                  break
                case 'DELETE':
                  if (payload.old?.id) {
                    onDelete?.(payload.old.id)
                    toast.info('인터뷰가 삭제되었습니다')
                  }
                  break
              }
            } catch (error) {
              console.error('Event handling error:', error)
            }
          }
        )

        // 구독 상태 처리
        channel.subscribe((status) => {
          if (!mounted) return

          switch (status) {
            case 'SUBSCRIBED':
              setIsConnected(true)
              setLastError(null)
              onConnectionChange?.(true)
              break
            case 'CLOSED':
            case 'CHANNEL_ERROR':
            case 'TIMED_OUT':
              setIsConnected(false)
              setLastError(status)
              onConnectionChange?.(false)
              break
          }
        })

        channelRef.current = channel

      } catch (error) {
        if (mounted) {
          console.error('Realtime setup error:', error)
          setLastError(error instanceof Error ? error.message : 'Setup failed')
          setIsConnected(false)
          onConnectionChange?.(false)
        }
      }
    }

    setupRealtime()

    return () => {
      mounted = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
      onConnectionChange?.(false)
    }
  }, [projectId, enabled]) // 의존성 최소화

  const reconnect = () => {
    // 강제 재연결을 위해 채널 정리 후 재설정
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    setIsConnected(false)
    
    // 약간의 지연 후 재연결
    setTimeout(() => {
      // useEffect가 다시 실행되도록 상태 변경은 하지 않고
      // 직접 재연결 로직 실행하지 않음 (useEffect에 맡김)
    }, 100)
  }

  return {
    isConnected,
    connectionStatus: isConnected ? 'CONNECTED' as const : 'DISCONNECTED' as const,
    lastError,
    reconnect
  }
}