'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from './use-auth'

export interface PresenceUser {
  userId: string
  userName?: string
  email?: string
  avatarUrl?: string
  lastActiveAt: string
  location?: string
}

interface UsePresenceSSEOptions {
  enabled?: boolean
  onError?: (error: Error) => void
}

export function usePresenceSSE(projectId: string, options: UsePresenceSSEOptions = {}) {
  const { enabled = true, onError } = options
  const { session } = useAuth()
  
  const [users, setUsers] = useState<PresenceUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectDelayRef = useRef(1000) // 초기 재연결 지연 시간
  
  // 재연결 지연 시간 리셋
  const resetReconnectDelay = () => {
    reconnectDelayRef.current = 1000
  }
  
  // 재연결 지연 시간 증가 (지수 백오프)
  const increaseReconnectDelay = () => {
    reconnectDelayRef.current = Math.min(
      reconnectDelayRef.current * 2,
      30000 // 최대 30초
    )
  }
  
  // SSE 연결 생성
  const connect = useCallback(() => {
    if (!enabled || !projectId || !session?.access_token) {
      return
    }
    
    try {
      // 기존 연결 정리
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      
      // Authorization 헤더를 URL 파라미터로 전달 (SSE는 헤더 설정 불가)
      const url = new URL(`/api/presence/${projectId}/stream`, window.location.origin)
      url.searchParams.set('token', session.access_token)
      
      const eventSource = new EventSource(url.toString())
      eventSourceRef.current = eventSource
      
      // 연결 성공
      eventSource.onopen = () => {
        setIsConnected(true)
        setError(null)
        resetReconnectDelay()
      }
      
      // 메시지 수신
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setUsers(data.users || [])
        } catch (err) {
          // Failed to parse presence data
        }
      }
      
      // 에러 처리
      eventSource.onerror = (event) => {
        setIsConnected(false)
        
        // EventSource는 자동으로 재연결을 시도하지만,
        // 우리가 직접 제어하기 위해 닫고 재연결
        eventSource.close()
        
        const err = new Error('SSE connection error')
        setError(err)
        onError?.(err)
        
        // 지수 백오프로 재연결 (활성화된 경우에만)
        if (enabled && projectId && session?.access_token) {
          reconnectTimeoutRef.current = setTimeout(() => {
            increaseReconnectDelay()
            connect()
          }, reconnectDelayRef.current)
        }
      }
      
    } catch (err) {
      const error = err as Error
      setError(error)
      onError?.(error)
    }
  }, [enabled, projectId, session?.access_token, onError])
  
  // 연결 관리
  useEffect(() => {
    if (enabled && projectId && session?.access_token) {
      connect()
    }
    
    return () => {
      // 정리
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setIsConnected(false)
      setUsers([])
    }
  }, [enabled, projectId, session?.access_token])
  
  // 자신의 presence 업데이트
  const updateMyPresence = useCallback(async (data: {
    location?: string
    status?: string
  }) => {
    if (!session?.access_token || !projectId) {
      return
    }
    
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
    } catch (err) {
      // Error updating presence
    }
  }, [projectId, session?.access_token])
  
  // 페이지 visibility 변경 시 처리
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 페이지가 백그라운드로 갔을 때
        updateMyPresence({ status: 'away' })
      } else {
        // 페이지가 다시 활성화됐을 때
        updateMyPresence({ status: 'active' })
        // 재연결 (SSE는 백그라운드에서 끊길 수 있음)
        if (!isConnected) {
          connect()
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [updateMyPresence, isConnected, connect])
  
  return {
    users,
    isConnected,
    error,
    updateMyPresence
  }
}