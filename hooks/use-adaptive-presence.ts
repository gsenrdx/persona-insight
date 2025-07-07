'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { usePresenceSSE, PresenceUser } from './use-presence-sse'
import { useAdaptiveRealtime } from './use-adaptive-realtime'
import { useAuth } from './use-auth'

/**
 * 적응형 Presence 훅
 * 네트워크 상태에 따라 SSE와 Polling을 자동으로 전환
 * UI는 변경하지 않음
 */
export function useAdaptivePresence(projectId: string) {
  const { 
    strategy, 
    trackConnection, 
    untrackConnection,
    trackMessage,
    trackError 
  } = useAdaptiveRealtime('presence')
  
  // SSE 기반 presence
  const sseResult = usePresenceSSE(projectId, {
    enabled: strategy === 'sse',
    onError: (error) => {
      trackError()
    }
  })
  
  // Polling 기반 presence (폴백)
  const pollingResult = usePresencePolling(projectId, {
    enabled: strategy === 'polling',
    interval: 60000, // 1분
    onError: () => {
      trackError()
    }
  })
  
  // 연결 추적
  useEffect(() => {
    if (strategy === 'sse' && sseResult.isConnected) {
      trackConnection(`presence-sse-${projectId}`, 'sse')
    } else if (strategy === 'polling') {
      trackConnection(`presence-polling-${projectId}`, 'polling')
    }
    
    return () => {
      untrackConnection(`presence-sse-${projectId}`)
      untrackConnection(`presence-polling-${projectId}`)
    }
  }, [strategy, sseResult.isConnected, projectId, trackConnection, untrackConnection])
  
  // 메시지 추적
  useEffect(() => {
    if (strategy === 'sse' && sseResult.users.length > 0) {
      trackMessage()
    } else if (strategy === 'polling' && pollingResult.users.length > 0) {
      trackMessage()
    }
  }, [strategy, sseResult.users, pollingResult.users, trackMessage])
  
  // 전략에 따라 적절한 결과 반환
  const activeResult = strategy === 'sse' ? sseResult : pollingResult
  
  return {
    ...activeResult,
    strategy, // 현재 사용 중인 전략 노출 (디버그용)
  }
}

/**
 * Polling 기반 Presence 구현
 * SSE가 작동하지 않을 때 폴백으로 사용
 */
function usePresencePolling(
  projectId: string, 
  options: {
    enabled?: boolean
    interval?: number
    onError?: (error: Error) => void
  } = {}
) {
  const { enabled = true, interval = 60000, onError } = options
  const [users, setUsers] = useState<PresenceUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { session } = useAuth()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const fetchPresence = useCallback(async () => {
    if (!session?.access_token || !projectId) return
    
    try {
      const response = await fetch(`/api/presence/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch presence')
      }
      
      const data = await response.json()
      setUsers(data.users || [])
      setIsConnected(true)
      setError(null)
    } catch (err) {
      const error = err as Error
      setError(error)
      setIsConnected(false)
      onError?.(error)
    }
  }, [projectId, session?.access_token, onError])
  
  // Polling 설정
  useEffect(() => {
    if (!enabled) {
      setIsConnected(false)
      return
    }
    
    // 초기 조회
    fetchPresence()
    
    // 주기적 조회
    intervalRef.current = setInterval(fetchPresence, interval)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsConnected(false)
    }
  }, [enabled, interval, fetchPresence])
  
  // updateMyPresence 구현
  const updateMyPresence = useCallback(async (data: {
    location?: string
    status?: string
  }) => {
    if (!session?.access_token || !projectId) return
    
    try {
      const response = await fetch(`/api/presence/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update presence')
      }
      
      // 즉시 presence 다시 조회
      await fetchPresence()
    } catch (err) {
      // Error updating presence
    }
  }, [projectId, session?.access_token, fetchPresence])
  
  return {
    users,
    isConnected,
    error,
    updateMyPresence
  }
}