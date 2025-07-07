# 인터뷰 목록 업데이트 방식 분석

## 현재 구현: Polling + Optimistic Update

### 동작 방식
1. **즉시 UI 업데이트**: 인터뷰 생성 시 즉시 목록에 추가 (Optimistic Update)
2. **서버 동기화**: 30초마다 자동 새로고침으로 서버 상태와 동기화
3. **수동 새로고침**: 사용자가 언제든 수동으로 새로고침 가능

### 장점
- ✅ **빠른 사용자 경험**: 생성 즉시 UI에 반영
- ✅ **안정성**: 네트워크 문제에 강함
- ✅ **단순성**: 구현이 간단하고 디버깅 용이
- ✅ **캐싱**: TanStack Query로 효율적인 캐싱
- ✅ **배터리 효율**: WebSocket 대비 전력 소모 적음

### 단점
- ⚠️ **지연된 동기화**: 다른 사용자 변경사항은 최대 30초 지연
- ⚠️ **네트워크 사용**: 주기적 HTTP 요청

## 대안: SSE (Server-Sent Events)

### SSE 구현 시 동작 방식
```typescript
// SSE 기반 인터뷰 목록
const eventSource = new EventSource(`/api/projects/${projectId}/interviews/stream`)

eventSource.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data)
  
  switch(type) {
    case 'interview_created':
      setInterviews(prev => [data, ...prev])
      break
    case 'interview_updated':
      setInterviews(prev => prev.map(i => i.id === data.id ? data : i))
      break
    case 'interview_deleted':
      setInterviews(prev => prev.filter(i => i.id !== data.id))
      break
  }
}
```

### SSE 장점
- ✅ **실시간 동기화**: 즉시 모든 사용자에게 반영
- ✅ **효율적**: 변경사항만 전송
- ✅ **자동 재연결**: EventSource 기본 기능

### SSE 단점
- ❌ **복잡성**: 서버 이벤트 관리 필요
- ❌ **서버 부하**: 지속적인 연결 유지
- ❌ **디버깅**: 실시간 이벤트 디버깅 어려움

## 권장사항: 현재 Polling 방식 유지

### 이유

1. **인터뷰 특성상 적합**
   - 인터뷰는 생성 빈도가 낮음 (하루 몇 개)
   - 즉시 동기화가 critical하지 않음
   - 파일 업로드 → 분석 과정이 길어서 30초 지연 무의미

2. **사용자 경험**
   - Optimistic Update로 생성자는 즉시 확인
   - 다른 사용자도 30초 내 확인 가능
   - 수동 새로고침으로 필요시 즉시 동기화

3. **안정성**
   - 네트워크 문제에 강함
   - 서버 부하 적음
   - 구현 복잡도 낮음

## 개선된 Polling 구현

### 스마트 새로고침
```typescript
// 페이지 focus 시 자동 새로고침
const useSmartPolling = (projectId) => {
  const { data, refetch } = useQuery({
    queryKey: ['interviews', projectId],
    refetchInterval: 30000,
    refetchOnWindowFocus: true, // 이미 적용됨
    refetchOnMount: true
  })
  
  // 사용자 액션 후 짧은 interval
  const [isActive, setIsActive] = useState(false)
  
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(refetch, 5000) // 5초
      const timeout = setTimeout(() => setIsActive(false), 60000) // 1분 후 일반 모드
      
      return () => {
        clearInterval(interval)
        clearTimeout(timeout)
      }
    }
  }, [isActive, refetch])
  
  return { data, refetch, setActive: setIsActive }
}
```

### 인터뷰 상태 기반 업데이트
```typescript
// 처리 중인 인터뷰가 있으면 더 자주 새로고침
const getRefreshInterval = (interviews) => {
  const hasProcessing = interviews.some(i => i.workflow_status === 'processing')
  return hasProcessing ? 10000 : 30000 // 10초 vs 30초
}
```

## 결론

**현재 Polling 방식이 인터뷰 관리에 최적**

1. **생성 즉시 반영**: Optimistic Update
2. **30초 자동 동기화**: 충분히 빠름
3. **수동 새로고침**: 필요시 즉시 업데이트
4. **안정성**: 네트워크 문제에 강함
5. **효율성**: 배터리 및 서버 리소스 절약

SSE는 채팅이나 실시간 협업 도구에는 적합하지만, 인터뷰 목록 관리에는 과도한 복잡성을 추가할 뿐입니다.

## 현재 구현 검증

✅ **인터뷰 추가 버튼**: selectedInterviewId가 없을 때만 표시  
✅ **Optimistic Update**: 생성 즉시 목록 상단에 추가  
✅ **자동 새로고침**: 30초마다 서버와 동기화  
✅ **수동 새로고침**: 사용자가 언제든 갱신 가능  
✅ **에러 처리**: 실패 시 토스트 알림 및 롤백