# 실시간 협업 기능 최적화 가이드

## 현재 시스템 분석

### 사용 중인 실시간 기능
1. **인터뷰 메모 및 댓글** - Broadcast WebSocket
2. **사용자 Presence** - Broadcast WebSocket
3. **인터뷰 목록 동기화** - Broadcast WebSocket
4. **스크립트 실시간 편집** - Broadcast WebSocket

### 현재 문제점
- 모든 기능이 실시간으로 구현되어 있어 불필요한 WebSocket 연결 유지
- 일부 기능은 실시간이 필요하지 않음에도 복잡한 구조
- 안정성 이슈와 재연결 처리의 복잡성

## 기능별 최적화 방안

### 1. 인터뷰 메모 및 댓글 ✅ Realtime 유지

**현재 방식**: Broadcast WebSocket
**권장 방식**: **Broadcast WebSocket (유지)**

**이유**:
- 여러 사용자가 동시에 메모를 보고 작성
- 즉각적인 피드백이 중요한 협업 기능
- 10-30ms의 낮은 지연시간 필요

**개선사항**:
```typescript
// 메모 충돌 해결 로직 추가
const handleNoteConflict = (localNote, remoteNote) => {
  // 타임스탬프 기반 자동 병합
  return mergeNotes(localNote, remoteNote)
}

// 오프라인 지원 추가
const queueOfflineNotes = (note) => {
  localStorage.setItem(`offline_notes_${note.id}`, JSON.stringify(note))
}
```

### 2. 사용자 Presence ⚡ Polling으로 전환

**현재 방식**: Broadcast WebSocket (30초 간격)
**권장 방식**: **HTTP Polling (60초 간격)**

**이유**:
- 실시간성이 크게 중요하지 않음
- WebSocket 연결 부담 감소
- 배터리 및 네트워크 사용량 최적화

**구현 예시**:
```typescript
// 새로운 Polling 기반 Presence
const usePresencePolling = (interviewId: string) => {
  const [presence, setPresence] = useState<PresenceData[]>([])
  
  useEffect(() => {
    const updatePresence = async () => {
      const { data } = await fetch(`/api/presence/${interviewId}`)
      setPresence(data)
    }
    
    updatePresence()
    const interval = setInterval(updatePresence, 60000) // 60초
    
    return () => clearInterval(interval)
  }, [interviewId])
  
  return presence
}
```

### 3. 인터뷰 목록 동기화 🔄 Hybrid 방식

**현재 방식**: Broadcast WebSocket
**권장 방식**: **HTTP + 선택적 WebSocket**

**이유**:
- 목록 페이지: HTTP Polling (리프레시 버튼 제공)
- 상세 페이지: WebSocket (편집 중인 항목만)
- 리소스 효율성 극대화

**구현 예시**:
```typescript
// 목록 페이지 - SWR 사용
const { data, mutate } = useSWR(
  `/api/projects/${projectId}/interviews`,
  fetcher,
  {
    refreshInterval: 30000, // 30초 자동 새로고침
    revalidateOnFocus: true
  }
)

// 상세 페이지 - 특정 인터뷰만 구독
const subscribeToInterview = (interviewId: string) => {
  return supabase
    .channel(`interview:${interviewId}`)
    .on('broadcast', { event: 'update' }, handleUpdate)
    .subscribe()
}
```

### 4. 스크립트 실시간 편집 ✍️ 조건부 Realtime

**현재 방식**: Broadcast WebSocket
**권장 방식**: **편집 모드 진입 시에만 WebSocket**

**이유**:
- 읽기 전용일 때는 실시간 불필요
- 편집 시작 시에만 WebSocket 연결
- 리소스 절약 및 안정성 향상

**구현 예시**:
```typescript
const useEditableScript = (interviewId: string) => {
  const [isEditing, setIsEditing] = useState(false)
  const [connection, setConnection] = useState(null)
  
  const startEditing = () => {
    setIsEditing(true)
    // 편집 시작 시에만 WebSocket 연결
    const channel = subscribeToScriptEditing(interviewId)
    setConnection(channel)
  }
  
  const stopEditing = () => {
    setIsEditing(false)
    connection?.unsubscribe()
    setConnection(null)
  }
  
  return { isEditing, startEditing, stopEditing }
}
```

## 새로운 아키텍처 제안

### 계층별 통신 전략

```
┌─────────────────────────────────────────────────────┐
│                   UI Layer                          │
├─────────────────────────────────────────────────────┤
│  실시간 필수  │  조건부 실시간  │  비실시간         │
├───────────────┼─────────────────┼──────────────────┤
│ • 메모/댓글   │ • 스크립트 편집 │ • 인터뷰 목록    │
│ • 채팅        │ • 공동 작업     │ • Presence       │
│               │   (편집 중일 때) │ • 통계/분석      │
└───────────────┴─────────────────┴──────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│                Communication Layer                   │
├─────────────────────────────────────────────────────┤
│  WebSocket    │  HTTP + Cache   │  Background Sync │
├───────────────┼─────────────────┼──────────────────┤
│ • Broadcast   │ • SWR/TanStack  │ • Service Worker │
│ • 10-30ms     │ • 100-300ms     │ • Periodic Sync  │
└───────────────┴─────────────────┴──────────────────┘
```

### 연결 관리 최적화

```typescript
// 통합 연결 관리자
class ConnectionManager {
  private connections = new Map()
  private connectionCounts = new Map()
  
  getConnection(type: 'realtime' | 'polling', resource: string) {
    const key = `${type}:${resource}`
    
    if (type === 'polling') {
      return this.createPollingConnection(resource)
    }
    
    // 실시간은 참조 카운팅으로 관리
    if (!this.connections.has(key)) {
      this.connections.set(key, this.createRealtimeConnection(resource))
      this.connectionCounts.set(key, 0)
    }
    
    this.connectionCounts.set(key, this.connectionCounts.get(key) + 1)
    return this.connections.get(key)
  }
  
  releaseConnection(type: string, resource: string) {
    const key = `${type}:${resource}`
    const count = this.connectionCounts.get(key) - 1
    
    if (count <= 0) {
      this.connections.get(key)?.close()
      this.connections.delete(key)
      this.connectionCounts.delete(key)
    } else {
      this.connectionCounts.set(key, count)
    }
  }
}
```

## 구현 우선순위

### Phase 1 (즉시 적용 가능)
1. **Presence를 Polling으로 전환** (1일)
   - WebSocket 부하 30% 감소 예상
   - 구현 난이도: 낮음

2. **인터뷰 목록 Hybrid 방식 적용** (2일)
   - 페이지 로딩 속도 개선
   - 구현 난이도: 중간

### Phase 2 (단계적 적용)
3. **스크립트 편집 조건부 실시간** (3일)
   - 리소스 사용량 50% 감소 예상
   - 구현 난이도: 높음

4. **오프라인 지원 추가** (5일)
   - 사용자 경험 대폭 개선
   - 구현 난이도: 높음

## 모니터링 지표

### 성능 지표
- WebSocket 동시 연결 수
- 메시지 처리 지연시간
- 재연결 빈도
- 에러율

### 사용자 경험 지표
- 페이지 로딩 시간
- 동기화 지연
- 오프라인 복구 시간
- 사용자 이탈률

## 예상 효과

### 리소스 절감
- **서버**: WebSocket 연결 60% 감소
- **클라이언트**: 메모리 사용량 40% 감소
- **네트워크**: 대역폭 사용량 50% 감소

### 안정성 향상
- 재연결 이슈 70% 감소
- 동기화 오류 80% 감소
- 전체적인 안정성 2배 향상

### 사용자 경험
- 초기 로딩 속도 3배 향상
- 배터리 사용량 30% 감소
- 오프라인 지원으로 신뢰성 향상

## 결론

모든 기능을 실시간으로 구현하는 것은 과도한 접근입니다. 각 기능의 특성에 맞는 통신 방식을 선택하여:

1. **실시간이 필수인 기능**만 WebSocket 사용
2. **조건부로 필요한 기능**은 사용자 액션에 따라 활성화
3. **실시간이 불필요한 기능**은 전통적인 HTTP 방식 사용

이를 통해 안정성과 성능을 모두 확보할 수 있습니다.