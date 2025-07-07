# SSE (Server-Sent Events) 구현 가이드

## SSE란?

Server-Sent Events는 서버에서 클라이언트로 단방향 실시간 데이터를 전송하는 웹 표준입니다.

### WebSocket vs SSE 비교

| 특성 | WebSocket | SSE |
|-----|-----------|-----|
| 통신 방향 | 양방향 | 서버→클라이언트 |
| 프로토콜 | ws:// | http:// |
| 재연결 | 수동 구현 | 자동 |
| 브라우저 지원 | 모든 모던 브라우저 | IE 제외 모두 |
| 방화벽 | 문제 가능성 | HTTP 기반으로 안전 |
| 메시지 형식 | 모든 형식 | 텍스트만 |

## 현재 프로젝트에 SSE 적용하기

### 1. 사용자 Presence - SSE 구현

#### 서버 (Next.js API Route)
```typescript
// app/api/presence/[projectId]/stream/route.ts
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params
  
  // SSE 헤더 설정
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  }
  
  // 스트림 생성
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      // 초기 presence 데이터 전송
      const sendPresence = async () => {
        const presence = await getProjectPresence(projectId)
        const data = `data: ${JSON.stringify(presence)}\n\n`
        controller.enqueue(encoder.encode(data))
      }
      
      // 즉시 전송
      await sendPresence()
      
      // 30초마다 업데이트
      const interval = setInterval(sendPresence, 30000)
      
      // 연결 종료 시 정리
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })
  
  return new Response(stream, { headers })
}
```

#### 클라이언트 Hook
```typescript
// hooks/use-presence-sse.ts
import { useEffect, useState, useRef } from 'react'

export function usePresenceSSE(projectId: string) {
  const [presence, setPresence] = useState<PresenceData[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  
  useEffect(() => {
    if (!projectId) return
    
    // SSE 연결 생성
    const eventSource = new EventSource(`/api/presence/${projectId}/stream`)
    eventSourceRef.current = eventSource
    
    // 연결 성공
    eventSource.onopen = () => {
      setIsConnected(true)
    }
    
    // 메시지 수신
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setPresence(data)
      } catch (error) {
        console.error('Failed to parse presence data:', error)
      }
    }
    
    // 에러 처리 (자동 재연결됨)
    eventSource.onerror = () => {
      setIsConnected(false)
      // EventSource는 자동으로 재연결 시도
    }
    
    // 클린업
    return () => {
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [projectId])
  
  // 수동으로 presence 업데이트 (POST 요청)
  const updateMyPresence = async (status: string) => {
    await fetch(`/api/presence/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({ status })
    })
  }
  
  return {
    presence,
    isConnected,
    updateMyPresence
  }
}
```

### 2. 알림 시스템 - SSE 구현

#### 서버
```typescript
// app/api/notifications/stream/route.ts
export async function GET(request: NextRequest) {
  const { userId } = await getAuthenticatedUser(request)
  
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      // 하트비트 (30초마다)
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(':heartbeat\n\n'))
      }, 30000)
      
      // 데이터베이스 리스너 설정
      const subscription = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          // 새 알림을 SSE로 전송
          const data = `data: ${JSON.stringify(payload.new)}\n\n`
          controller.enqueue(encoder.encode(data))
        })
        .subscribe()
      
      // 클린업
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        subscription.unsubscribe()
        controller.close()
      })
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

#### 클라이언트
```typescript
// components/notifications/notification-provider.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const NotificationContext = createContext<{
  notifications: Notification[]
  unreadCount: number
}>({
  notifications: [],
  unreadCount: 0
})

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  
  useEffect(() => {
    const eventSource = new EventSource('/api/notifications/stream')
    
    eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data)
      
      // 새 알림 추가
      setNotifications(prev => [notification, ...prev])
      
      // 브라우저 알림 표시
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.png'
        })
      }
    }
    
    return () => eventSource.close()
  }, [])
  
  const unreadCount = notifications.filter(n => !n.read).length
  
  return (
    <NotificationContext.Provider value={{ notifications, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
```

### 3. 파일 업로드 진행률 - SSE 구현

#### 서버
```typescript
// app/api/upload/[uploadId]/progress/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { uploadId: string } }
) {
  const { uploadId } = params
  
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      // Redis나 메모리에서 진행률 추적
      const checkProgress = async () => {
        const progress = await getUploadProgress(uploadId)
        
        if (progress) {
          const data = `data: ${JSON.stringify(progress)}\n\n`
          controller.enqueue(encoder.encode(data))
          
          // 완료되면 스트림 종료
          if (progress.percentage === 100) {
            controller.enqueue(encoder.encode('event: complete\ndata: {}\n\n'))
            controller.close()
          }
        }
      }
      
      // 0.5초마다 진행률 확인
      const interval = setInterval(checkProgress, 500)
      
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    }
  })
}
```

#### 클라이언트
```typescript
// hooks/use-upload-progress.ts
export function useUploadProgress(uploadId: string | null) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'complete'>('idle')
  
  useEffect(() => {
    if (!uploadId) return
    
    const eventSource = new EventSource(`/api/upload/${uploadId}/progress`)
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setProgress(data.percentage)
      setStatus('uploading')
    }
    
    eventSource.addEventListener('complete', () => {
      setStatus('complete')
      eventSource.close()
    })
    
    return () => eventSource.close()
  }, [uploadId])
  
  return { progress, status }
}
```

## SSE 모범 사례

### 1. 재연결 처리
```typescript
class RobustEventSource {
  private url: string
  private eventSource: EventSource | null = null
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000
  
  constructor(url: string) {
    this.url = url
    this.connect()
  }
  
  private connect() {
    this.eventSource = new EventSource(this.url)
    
    this.eventSource.onerror = () => {
      this.eventSource?.close()
      
      // 지수 백오프로 재연결
      setTimeout(() => {
        this.reconnectDelay = Math.min(
          this.reconnectDelay * 2,
          this.maxReconnectDelay
        )
        this.connect()
      }, this.reconnectDelay)
    }
    
    this.eventSource.onopen = () => {
      this.reconnectDelay = 1000 // 리셋
    }
  }
}
```

### 2. 메시지 타입 구분
```typescript
// 서버
controller.enqueue(encoder.encode('event: notification\ndata: {"type": "info"}\n\n'))
controller.enqueue(encoder.encode('event: error\ndata: {"message": "Something went wrong"}\n\n'))

// 클라이언트
eventSource.addEventListener('notification', (event) => {
  // 알림 처리
})

eventSource.addEventListener('error', (event) => {
  // 에러 처리
})
```

### 3. 인증 처리
```typescript
// 쿠키 기반 인증 (자동)
const eventSource = new EventSource('/api/stream')

// 토큰 기반 인증 (URL 파라미터)
const token = getAuthToken()
const eventSource = new EventSource(`/api/stream?token=${token}`)

// 또는 EventSource polyfill 사용
import { EventSourcePolyfill } from 'event-source-polyfill'

const eventSource = new EventSourcePolyfill('/api/stream', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

## SSE 적용 체크리스트

### ✅ SSE가 적합한 경우
- [ ] 서버→클라이언트 단방향 통신
- [ ] 텍스트 기반 데이터
- [ ] HTTP 인프라 활용 필요
- [ ] 자동 재연결 필요
- [ ] 프록시/방화벽 우회 필요

### ❌ SSE가 부적합한 경우
- [ ] 양방향 통신 필요
- [ ] 바이너리 데이터 전송
- [ ] IE 지원 필요
- [ ] 초저지연(< 10ms) 필요

## 마이그레이션 예시

### Before (WebSocket)
```typescript
const channel = supabase.channel('presence')
  .on('broadcast', { event: 'update' }, handler)
  .subscribe()
```

### After (SSE)
```typescript
const eventSource = new EventSource('/api/presence/stream')
eventSource.onmessage = handler
```

## 성능 비교

| 메트릭 | WebSocket | SSE |
|-------|-----------|-----|
| 초기 연결 | 100-200ms | 50-100ms |
| 메모리 사용 | 높음 | 낮음 |
| CPU 사용 | 중간 | 낮음 |
| 재연결 시간 | 수동 구현 필요 | 자동 (1-3초) |
| 확장성 | 제한적 | 우수 |

## 결론

SSE는 다음과 같은 경우에 WebSocket보다 나은 선택입니다:

1. **단방향 통신**이 필요한 경우
2. **HTTP 인프라**를 활용하고 싶은 경우
3. **자동 재연결**이 중요한 경우
4. **배터리/리소스 효율**이 중요한 경우

현재 프로젝트의 Presence, 알림, 진행률 표시 등은 SSE로 전환하는 것이 더 효율적입니다.