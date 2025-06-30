# 인터뷰 관리 페이지 API 호출 최적화 분석

## 1. 문제 분석

### 1.1 중복 API 호출 패턴

#### a) 인터뷰 목록 중복 조회
```
GET /api/interviews?project_id=8c08b16c-da3f-4833-9b64-635c9338c29d 200 in 935ms
GET /api/interviews?project_id=8c08b16c-da3f-4833-9b64-635c9338c29d 200 in 1107ms
```
- **원인**: `ProjectInterviews` 컴포넌트와 다른 컴포넌트에서 동일한 인터뷰 목록을 중복 조회
- **영향**: 불필요한 네트워크 트래픽과 서버 부하

#### b) 인터뷰 상세 정보 중복 조회
```
GET /api/interviews/6bd7ca74-6d4b-4bd6-8918-1b008990f166 200 in 341ms
GET /api/interviews/6bd7ca74-6d4b-4bd6-8918-1b008990f166 200 in 515ms
```
- **원인**: 인터뷰 선택 시 여러 컴포넌트에서 동일한 상세 정보 조회
- **영향**: 174ms의 추가 대기 시간

### 1.2 비효율적인 Waterfall 패턴

#### a) 프로젝트 정보 → 멤버 정보 순차 호출
```
GET /api/projects/3b39bc48-8764-4dfb-9217-f1a9b9c9cb4f?user_id=... 200 in 522ms
GET /api/projects/3b39bc48-8764-4dfb-9217-f1a9b9c9cb4f/members 200 in 781ms
```
- **문제**: 프로젝트 정보를 먼저 가져온 후 멤버 정보를 순차적으로 조회
- **영향**: 총 1.3초의 대기 시간 (병렬 처리 시 781ms로 단축 가능)

#### b) 인터뷰 목록 → 개별 인터뷰 조회
```
GET /api/interviews?project_id=... 200 in 749ms
GET /api/interviews/6bd7ca74... 200 in 341ms
GET /api/interviews/.../notes 200 in 337ms
```
- **문제**: 인터뷰 목록을 가져온 후 선택된 인터뷰와 노트를 개별 조회
- **영향**: 순차적 처리로 인한 지연

### 1.3 페이지 네비게이션 문제

#### 불필요한 페이지 리로드
```
GET /projects/8c08b16c-da3f-4833-9b64-635c9338c29d 200 in 10ms
GET /projects/8c08b16c-da3f-4833-9b64-635c9338c29d?interview=... 200 in 6ms
GET /projects/8c08b16c-da3f-4833-9b64-635c9338c29d 200 in 7ms
```
- **원인**: 인터뷰 선택/해제 시 전체 페이지 재렌더링
- **영향**: 불필요한 컴포넌트 마운트/언마운트

## 2. 코드 레벨 문제점

### 2.1 ProjectInterviews 컴포넌트 (`project-interviews-new.tsx`)

#### a) 중복 데이터 페칭
```typescript
// Line 76-115: fetchInterviews 함수에서 인터뷰 목록 조회
const fetchInterviews = useCallback(async () => {
  const response = await fetch(`/api/interviews?project_id=${project.id}`, ...)
}, [])

// Line 126-128: useEffect로 컴포넌트 마운트 시 호출
useEffect(() => {
  fetchInterviews()
}, [fetchInterviews])
```

#### b) 선택된 인터뷰 개별 조회
```typescript
// Line 51-74: selectedInterviewId가 있을 때 별도 API 호출
useEffect(() => {
  if (selectedInterviewId && session?.access_token) {
    const response = await fetch(`/api/interviews/${selectedInterviewId}`, ...)
  }
}, [selectedInterviewId, session?.access_token])
```

### 2.2 React Query 설정 문제

#### a) 캐시 타임 설정 (`use-interviews.ts`)
```typescript
// Line 35-36: 인터뷰 목록 캐시 설정
staleTime: 2 * 60 * 1000, // 2분간 fresh
gcTime: 10 * 60 * 1000,   // 10분간 캐시
```
- **문제**: staleTime이 2분으로 설정되어 있어 페이지 전환 시 재조회 발생

#### b) 프로젝트 정보 캐시 (`use-projects.ts`)
```typescript
// Line 37-39: 프로젝트 캐시 설정
staleTime: options?.staleTime ?? 1 * 60 * 1000, // 1분
refetchOnMount: options?.refetchOnMount ?? true,
```
- **문제**: refetchOnMount가 true로 설정되어 있어 컴포넌트 재마운트 시마다 API 호출

## 3. 개선 방안

### 3.1 즉시 적용 가능한 개선사항

#### a) React Query 캐시 설정 최적화
```typescript
// use-interviews.ts
staleTime: 5 * 60 * 1000,  // 5분으로 증가
gcTime: 30 * 60 * 1000,     // 30분으로 증가
refetchOnMount: false,      // 마운트 시 재조회 방지

// use-projects.ts
staleTime: 10 * 60 * 1000,  // 10분으로 증가
refetchOnMount: false,       // 마운트 시 재조회 방지
```

#### b) 병렬 데이터 페칭
```typescript
// ProjectInterviews에서 React Query 훅 사용
const { data: interviews } = useInterviews({ projectId: project.id })
const { data: selectedInterview } = useInterview(selectedInterviewId || '')
```

#### c) 불필요한 수동 fetch 제거
- `fetchInterviews` 함수 제거하고 React Query 훅으로 대체
- WebSocket 업데이트만 로컬 상태 관리

### 3.2 구조적 개선사항

#### a) 데이터 프리페칭
```typescript
// 프로젝트 목록에서 호버 시 프리페치
const prefetchProjectDetails = (projectId: string) => {
  queryClient.prefetchQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => projectsApi.getProject(token, projectId)
  })
  queryClient.prefetchQuery({
    queryKey: queryKeys.interviews.byProject(projectId),
    queryFn: () => interviewsApi.getInterviews(token, { projectId })
  })
}
```

#### b) 배치 API 엔드포인트
```typescript
// 새로운 배치 엔드포인트 추가
GET /api/projects/{id}/full
// 응답: { project, members, interviews, insights }
```

#### c) Optimistic Updates
```typescript
// 인터뷰 상태 변경 시 즉시 UI 업데이트
const updateInterviewOptimistic = (interviewId: string, updates: Partial<Interview>) => {
  queryClient.setQueryData(
    queryKeys.interviews.detail(interviewId),
    (old) => ({ ...old, ...updates })
  )
}
```

### 3.3 성능 모니터링

#### a) API 호출 추적
```typescript
// API 미들웨어에 로깅 추가
const apiLogger = (req: Request) => {
  console.log(`[API] ${req.method} ${req.url} - ${Date.now()}`)
}
```

#### b) React Query 디버깅
```typescript
// 개발 환경에서 React Query Devtools 활용
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
```

## 4. 예상 개선 효과

### 성능 개선
- **API 호출 감소**: 페이지당 12-15회 → 4-6회
- **초기 로딩 시간**: 2-3초 → 1초 이내
- **페이지 전환**: 즉각적 응답 (캐시 활용)

### 사용자 경험
- 부드러운 페이지 전환
- 로딩 스피너 최소화
- 실시간 업데이트 유지

### 서버 부하
- API 요청 50% 감소
- 데이터베이스 쿼리 최적화
- 네트워크 트래픽 감소

## 5. 캐시 관련 잠재적 문제점 및 대응 방안

### 5.1 데이터 정합성 문제

#### a) 오래된 데이터 표시
**문제**: staleTime을 5-10분으로 늘리면 다른 사용자의 변경사항이 즉시 반영되지 않음
```typescript
// 시나리오: User A가 인터뷰 수정, User B는 캐시된 데이터를 보고 있음
// User B는 최대 5-10분간 구 데이터를 볼 수 있음
```

**대응 방안**:
```typescript
// 1. 실시간 업데이트가 중요한 데이터는 WebSocket 활용
useRealtimeInterviews({
  onUpdate: (updatedInterview) => {
    // 캐시 즉시 업데이트
    queryClient.setQueryData(
      queryKeys.interviews.detail(updatedInterview.id),
      updatedInterview
    )
  }
})

// 2. 중요한 액션 후 수동 리프레시
const handleCriticalAction = async () => {
  await performAction()
  queryClient.invalidateQueries({ queryKey: queryKeys.interviews.all })
}
```

#### b) 권한 변경 시 캐시 문제
**문제**: 사용자 권한이 변경되어도 캐시된 데이터에는 이전 권한 기준의 데이터가 남아있음

**대응 방안**:
```typescript
// 권한 변경 감지 시 전체 캐시 무효화
useEffect(() => {
  if (userRoleChanged) {
    queryClient.clear() // 모든 캐시 삭제
    router.refresh()    // 페이지 새로고침
  }
}, [userRole])
```

### 5.2 메모리 사용량 증가

#### a) 대용량 데이터 캐싱
**문제**: gcTime을 30분으로 설정하면 대용량 인터뷰 데이터가 메모리에 오래 남아있음

**대응 방안**:
```typescript
// 1. 데이터 크기별 차별화된 캐시 전략
const CACHE_CONFIG = {
  // 목록은 오래 캐싱
  list: { staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000 },
  // 상세 데이터는 짧게 캐싱
  detail: { staleTime: 3 * 60 * 1000, gcTime: 10 * 60 * 1000 },
  // 대용량 데이터는 최소 캐싱
  largeData: { staleTime: 1 * 60 * 1000, gcTime: 5 * 60 * 1000 }
}

// 2. 메모리 사용량 모니터링
if (typeof window !== 'undefined' && 'performance' in window) {
  const checkMemoryUsage = () => {
    const memory = (performance as any).memory
    if (memory?.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB 초과
      queryClient.removeQueries({
        predicate: query => query.state.dataUpdateCount > 5
      })
    }
  }
}
```

### 5.3 동시성 문제

#### a) 동일 데이터 다중 수정
**문제**: 캐시된 데이터를 기반으로 여러 사용자가 동시에 수정하면 충돌 발생

**대응 방안**:
```typescript
// 1. Optimistic Update with Rollback
const updateInterview = useMutation({
  mutationFn: updateInterviewAPI,
  onMutate: async (newData) => {
    // 이전 데이터 백업
    const previousData = queryClient.getQueryData(queryKey)
    
    // Optimistic Update
    queryClient.setQueryData(queryKey, newData)
    
    return { previousData }
  },
  onError: (err, newData, context) => {
    // 에러 시 롤백
    queryClient.setQueryData(queryKey, context.previousData)
    toast.error('다른 사용자가 수정 중입니다. 다시 시도해주세요.')
  },
  onSuccess: () => {
    // 성공 시 관련 쿼리 무효화
    queryClient.invalidateQueries({ queryKey: queryKeys.interviews.all })
  }
})

// 2. 버전 관리
interface Interview {
  id: string
  version: number // 버전 추가
  // ... 기타 필드
}

// API 호출 시 버전 체크
const updateInterview = async (id: string, data: any, version: number) => {
  const response = await fetch(`/api/interviews/${id}`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'If-Match': version.toString() // ETag 활용
    },
    body: JSON.stringify(data)
  })
  
  if (response.status === 412) { // Precondition Failed
    throw new Error('데이터가 변경되었습니다. 새로고침 후 다시 시도해주세요.')
  }
}
```

### 5.4 캐시 무효화 전략

#### a) 선택적 무효화
```typescript
// 계층적 캐시 무효화
const invalidateInterviewCaches = (interviewId: string, level: 'detail' | 'list' | 'all') => {
  switch (level) {
    case 'detail':
      // 특정 인터뷰만 무효화
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.interviews.detail(interviewId) 
      })
      break
    case 'list':
      // 목록과 상세 무효화
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.interviews.byProject(projectId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.interviews.detail(interviewId) 
      })
      break
    case 'all':
      // 모든 인터뷰 관련 캐시 무효화
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.interviews.all 
      })
      break
  }
}
```

#### b) 스마트 리프레시
```typescript
// 사용자 활동 기반 리프레시
const useSmartRefresh = () => {
  const [lastActivity, setLastActivity] = useState(Date.now())
  
  useEffect(() => {
    const handleActivity = () => setLastActivity(Date.now())
    
    window.addEventListener('focus', handleActivity)
    window.addEventListener('click', handleActivity)
    
    return () => {
      window.removeEventListener('focus', handleActivity)
      window.removeEventListener('click', handleActivity)
    }
  }, [])
  
  // 5분 이상 비활성 후 돌아오면 리프레시
  useEffect(() => {
    const handleFocus = () => {
      if (Date.now() - lastActivity > 5 * 60 * 1000) {
        queryClient.invalidateQueries({ 
          predicate: query => query.state.dataUpdatedAt < lastActivity 
        })
      }
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [lastActivity])
}
```

### 5.5 디버깅 및 모니터링

#### a) 캐시 상태 모니터링
```typescript
// 개발 환경 캐시 디버거
const CacheDebugger = () => {
  const queryClient = useQueryClient()
  const queries = queryClient.getQueryCache().getAll()
  
  return (
    <div className="fixed bottom-4 right-4 p-4 bg-black/80 text-white text-xs">
      <h3>Cache Status</h3>
      <p>Total Queries: {queries.length}</p>
      <p>Stale: {queries.filter(q => q.isStale()).length}</p>
      <p>Fetching: {queries.filter(q => q.state.fetchStatus === 'fetching').length}</p>
      <details>
        <summary>Details</summary>
        {queries.map(q => (
          <div key={q.queryHash}>
            {JSON.stringify(q.queryKey)} - {q.state.status}
          </div>
        ))}
      </details>
    </div>
  )
}
```

#### b) 성능 메트릭 수집
```typescript
// 캐시 히트율 측정
let cacheHits = 0
let cacheMisses = 0

queryClient.setDefaultOptions({
  queries: {
    queryFn: async (context) => {
      const cached = queryClient.getQueryData(context.queryKey)
      if (cached) {
        cacheHits++
      } else {
        cacheMisses++
      }
      
      // 주기적으로 메트릭 전송
      if ((cacheHits + cacheMisses) % 100 === 0) {
        console.log(`Cache Hit Rate: ${(cacheHits / (cacheHits + cacheMisses) * 100).toFixed(2)}%`)
      }
      
      return defaultQueryFn(context)
    }
  }
})
```

## 6. 구현 우선순위

1. **긴급 (1일 내)**
   - React Query 캐시 설정 조정
   - 중복 fetch 제거
   - WebSocket 실시간 업데이트 확인

2. **단기 (1주 내)**
   - 병렬 데이터 페칭 구현
   - 프리페칭 로직 추가
   - 선택적 캐시 무효화 전략 구현

3. **중기 (2주 내)**
   - 배치 API 엔드포인트 구현
   - Optimistic Updates 적용
   - 버전 관리 시스템 도입

4. **장기 (1개월 내)**
   - 전체적인 데이터 페칭 아키텍처 재설계
   - 성능 모니터링 시스템 구축
   - 캐시 히트율 대시보드 구현