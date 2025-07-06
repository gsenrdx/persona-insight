# Broadcast 시스템 마이그레이션 가이드

## 개요

이 가이드는 기존 Postgres Changes 기반 리얼타임 시스템에서 새로운 Broadcast 기반 시스템으로 마이그레이션하는 방법을 설명합니다.

## 주요 변경사항

### 1. 속도 개선
- **기존**: 400-600ms 지연
- **새로운**: 10-30ms 지연

### 2. 아키텍처
- **기존**: DB → WAL → Realtime Server → WebSocket
- **새로운**: WebSocket Direct Broadcast → DB (비동기)

### 3. 신뢰성
- 메시지 순서 보장
- Optimistic UI 자동 관리
- 자동 재연결 및 에러 처리

## 마이그레이션 단계

### 1단계: Provider 교체

```tsx
// 기존
import { RealtimeProvider } from '@/lib/realtime/interview-realtime-provider'

// 새로운
import { BroadcastRealtimeProvider } from '@/lib/realtime'

// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          <BroadcastRealtimeProvider> {/* 변경 */}
            {children}
          </BroadcastRealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
```

### 2단계: Hook 업데이트

```tsx
// 기존
import { useInterviewNotesRealtime } from '@/hooks/use-interview-notes-realtime'

// 새로운 
import { useInterviewNotesBroadcast } from '@/lib/realtime/broadcast'

// 사용법은 거의 동일
const { 
  notes, 
  isLoading,
  isConnected, // 새로운 속성
  addNote,
  updateNote,
  deleteNote 
} = useInterviewNotesBroadcast({ 
  interviewId,
  enabled: true // 선택적
})
```

### 3단계: 컴포넌트 업데이트

```tsx
// components/interview/interview-notes.tsx

// 기존
import { useInterviewNotesRealtime } from '@/hooks/use-interview-notes-realtime'

export function InterviewNotes({ interviewId }) {
  const { notes, addNote, isLoading } = useInterviewNotesRealtime(interviewId)
  
  // ... 나머지 코드
}

// 새로운
import { useInterviewNotesBroadcast } from '@/lib/realtime/broadcast'

export function InterviewNotes({ interviewId }) {
  const { 
    notes, 
    addNote, 
    isLoading,
    isConnected // 연결 상태 확인 가능
  } = useInterviewNotesBroadcast({ interviewId })
  
  if (!isConnected) {
    return <div>연결 중...</div>
  }
  
  // ... 나머지 코드
}
```

## API 차이점

### 1. Provider API

```tsx
// 기존
const { 
  interviews,
  notes,
  presence,
  subscribeToProject,
  unsubscribe,
  trackPresence,
  refresh
} = useInterviewRealtime()

// 새로운
const {
  interviews,
  notes,
  presence,
  isConnected, // 추가됨
  isLoading,
  error,
  subscribeToProject,
  unsubscribe,
  trackPresence,
  untrackPresence, // 이름 변경
  refresh
} = useBroadcastRealtime()
```

### 2. Notes Hook API

```tsx
// 기존
const {
  notes,
  isLoading,
  error,
  addNote,
  deleteNote,
  addReply,
  deleteReply,
  updateNote, // 디바운싱됨
  getNotesByScriptId
} = useInterviewNotesRealtime(interviewId)

// 새로운
const {
  notes,
  isLoading,
  isConnected, // 추가됨
  error,
  addNote,
  updateNote, // 즉시 업데이트
  deleteNote,
  isAddingNote,
  isDeletingNote
} = useInterviewNotesBroadcast({ interviewId })
```

## 점진적 마이그레이션

두 시스템을 동시에 사용할 수 있습니다:

```tsx
import { 
  LegacyRealtimeProvider,
  BroadcastRealtimeProvider 
} from '@/lib/realtime'

// 단계별 마이그레이션
<LegacyRealtimeProvider>
  <BroadcastRealtimeProvider>
    {/* 새 기능은 Broadcast 사용 */}
    {/* 기존 기능은 Legacy 유지 */}
    {children}
  </BroadcastRealtimeProvider>
</LegacyRealtimeProvider>
```

## 주의사항

1. **Optimistic Updates**: 자동으로 관리되므로 수동 처리 불필요
2. **에러 처리**: 자동 재연결이 포함되어 있음
3. **메시지 중복**: 자동으로 필터링됨
4. **타입 안정성**: 모든 메시지가 타입 체크됨

## 성능 모니터링

```tsx
// 연결 상태 모니터링
const { isConnected, error } = useBroadcastRealtime()

useEffect(() => {
  if (!isConnected) {
    console.log('Realtime disconnected')
  }
  if (error) {
    console.error('Realtime error:', error)
  }
}, [isConnected, error])
```

## 트러블슈팅

### 메시지가 전달되지 않음
- `isConnected` 상태 확인
- 채널 이름이 올바른지 확인
- 네트워크 연결 확인

### Optimistic update가 사라짐
- 정상 동작 (서버 응답으로 교체됨)
- `tempId`와 실제 ID 매핑 자동 처리

### 높은 CPU 사용
- 메시지 핸들러에서 무거운 작업 제거
- React.memo 사용 고려

## 향후 계획

1. **CRDT 지원**: 충돌 해결 자동화
2. **오프라인 지원**: IndexedDB 통합
3. **E2E 암호화**: 민감한 데이터 보호
4. **WebRTC 통합**: P2P 통신 옵션