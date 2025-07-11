# 인증 및 캐시 시스템 문제 진단 보고서

## 🚨 문제 현상
- **5분**만 브라우저가 비활성화되어도 데이터 로딩 실패
- 목록을 불러올 수 없게 되며 계정 인증이 풀리는 현상
- 브라우저 새로고침 시 정상화됨
- 백그라운드 탭에서 토큰 갱신 실패로 인한 인증 만료

## 🔍 분석 결과

### 1. 현재 인증 시스템 구조

#### 클라이언트 사이드 인증 (lib/supabase.ts)
```typescript
// 현재 설정
auth: {
  autoRefreshToken: true,        // ✅ 자동 토큰 갱신 활성화
  persistSession: true,          // ✅ 세션 유지 활성화
  detectSessionInUrl: false,     // URL에서 세션 감지 비활성화
  flowType: 'implicit',          // implicit 플로우 사용
  storage: sessionStorage        // ⚠️ sessionStorage 사용 (문제 지점)
}
```

#### 서버 사이드 캐시 (lib/utils/auth-cache.ts)
```typescript
// 캐시 설정
const CACHE_TTL = 5 * 60 * 1000;        // 5분 TTL
const MAX_CACHE_SIZE = 1000;             // 최대 1000개 엔트리
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10분마다 정리
```

#### 인증 상태 관리 (hooks/use-auth.tsx)
```typescript
// AuthProvider에서 onAuthStateChange 리스너 등록
const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    // 세션 상태 변화 처리
  }
)
```

#### 데이터 폴링 시스템 (hooks/use-interviews.ts)
```typescript
// 스마트 폴링: processing 상태가 있을 때만 3초마다 폴링
refetchInterval: (query) => {
  const interviews = query.state.data as Interview[] || []
  const hasProcessing = interviews.some(i => 
    i.workflow_status === 'processing' || i.status === 'processing'
  )
  return hasProcessing ? 3000 : false
}
```

### 2. 🎯 문제점 식별

#### **핵심 문제 1: 5분 캐시 만료와 백그라운드 탭 제한의 충돌**
- **TanStack Query staleTime**: 모든 쿼리가 5분으로 설정
- **auth-cache.ts CACHE_TTL**: 5분으로 설정
- **브라우저 백그라운드 제한**: 탭이 백그라운드에 있을 때 JavaScript 타이머 제한
- **결과**: 5분 후 데이터 refetch 시도 → 백그라운드에서 토큰 갱신 실패 → 401 에러

#### **핵심 문제 2: sessionStorage 사용**
- **현상**: 브라우저 탭이 닫히거나 비활성화되면 sessionStorage의 세션 정보가 유지되지 않음
- **영향**: Supabase 토큰이 sessionStorage에 저장되어 탭 간 공유되지 않고, 비활성 시간이 길어지면 세션 손실

#### **보조 문제들**
1. **백그라운드에서 토큰 갱신 실패**
   - Supabase의 `autoRefreshToken: true` 설정에도 불구하고 백그라운드에서 실행 제한
   - Chrome/Firefox는 백그라운드 탭의 타이머를 최소 1분으로 제한
   
2. **5분 staleTime과 캐시 TTL의 동기화 문제**
   - 모든 캐시가 동시에 만료되어 대량의 재요청 발생
   - 인증 실패 시 연쇄적인 API 호출 실패
   
3. **에러 상태 복구 메커니즘 부족**
   - 401 Unauthorized 에러 발생 시 자동 로그아웃 처리 부족
   - 토큰 갱신 실패 이벤트 처리 미흡

### 3. 🔧 해결 방안

#### **즉시 수정 (High Priority)**

1. **Visibility API를 활용한 토큰 갱신** `hooks/use-auth.tsx`
```typescript
// 탭이 다시 활성화될 때 토큰 상태 확인 및 갱신
useEffect(() => {
  const handleVisibilityChange = async () => {
    if (!document.hidden && session) {
      // 탭이 다시 보이게 되었을 때
      const { data: { session: currentSession }, error } = await supabase.auth.getSession()
      
      if (!currentSession || error) {
        // 세션이 만료되었으면 로그아웃
        await signOut()
      } else if (currentSession.expires_at) {
        // 토큰 만료 시간 확인
        const expiresAt = new Date(currentSession.expires_at * 1000)
        const now = new Date()
        const timeUntilExpiry = expiresAt.getTime() - now.getTime()
        
        // 5분 이내에 만료 예정이면 즉시 갱신
        if (timeUntilExpiry < 5 * 60 * 1000) {
          await supabase.auth.refreshSession()
        }
      }
    }
  }
  
  document.addEventListener('visibilitychange', handleVisibilityChange)
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
}, [session])
```

2. **localStorage로 변경** `lib/supabase.ts:12-28`
```typescript
storage: {
  getItem: (key: string) => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(key) // sessionStorage → localStorage
    }
    return null
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value) // sessionStorage → localStorage
    }
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key) // sessionStorage → localStorage
    }
  }
}
```

2. **토큰 갱신 실패 시 자동 로그아웃** `hooks/use-auth.tsx:170-223`
```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    // 토큰 갱신 성공 시 처리
  } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESH_FAILED') {
    // 토큰 갱신 실패 시 강제 로그아웃
    setUser(null)
    setSession(null)
    setProfile(null)
    setError('세션이 만료되었습니다. 다시 로그인해주세요.')
    window.location.href = '/login'
    return
  }
  // ... 기존 로직
})
```

3. **API 호출 시 401 에러 전역 처리** `lib/api/base.ts:57-58`
```typescript
case 401:
  // 401 에러 시 강제 로그아웃 및 리다이렉트
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1] + '-auth-token')
    window.location.href = '/login?expired=true'
  }
  throw new UnauthenticatedError(errorMessage, context)
```

#### **중기 개선 (Medium Priority)**

4. **staleTime 조정으로 캐시 충돌 방지**
```typescript
// 각 훅에서 staleTime을 다르게 설정하여 동시 만료 방지
// hooks/use-auth.tsx
staleTime: 10 * 60 * 1000, // 10분

// hooks/use-personas.ts
staleTime: 7 * 60 * 1000, // 7분

// hooks/use-interviews.ts
staleTime: 3 * 60 * 1000, // 3분 (폴링이 있으므로 짧게)
```

5. **세션 상태 모니터링 강화**
```typescript
// 새로운 훅: useSessionMonitor
export function useSessionMonitor() {
  const { session } = useAuth()
  
  useEffect(() => {
    // Visibility API와 함께 사용
    let checkInterval: NodeJS.Timeout
    
    const startChecking = () => {
      checkInterval = setInterval(async () => {
        if (document.hidden) return // 백그라운드에서는 체크 안함
        
        const { data: { session } } = await supabase.auth.getSession()
        if (!session && typeof window !== 'undefined') {
          // 세션이 없으면 로그아웃 처리
          window.location.href = '/login?expired=true'
        }
      }, 30000) // 30초마다 체크 (포그라운드에서만)
    }
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(checkInterval)
      } else {
        startChecking()
      }
    }
    
    if (!document.hidden) startChecking()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(checkInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session])
}
```

5. **네트워크 연결 상태 감지**
```typescript
// 네트워크 재연결 시 세션 복구
useEffect(() => {
  const handleOnline = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      // 세션이 유효하면 데이터 재로드
      await refreshProfile()
      queryClient.invalidateQueries()
    }
  }
  
  window.addEventListener('online', handleOnline)
  return () => window.removeEventListener('online', handleOnline)
}, [])
```

### 4. 📊 모니터링 및 로깅

#### **세션 상태 로깅 추가**
```typescript
// 세션 상태 변화 로깅
supabase.auth.onAuthStateChange((event, session) => {
  console.log(`Auth Event: ${event}`, {
    hasSession: !!session,
    expiresAt: session?.expires_at,
    userId: session?.user?.id
  })
})
```

#### **에러 추적 개선**
```typescript
// API 에러 시 상세 정보 수집
catch (error) {
  if (error instanceof UnauthenticatedError) {
    // 인증 에러 발생 시 세션 상태 로깅
    const { data: { session } } = await supabase.auth.getSession()
    console.error('Auth Error Details:', {
      hasSession: !!session,
      tokenExpired: session?.expires_at ? new Date(session.expires_at * 1000) < new Date() : null,
      endpoint: error.context?.endpoint
    })
  }
}
```

### 5. 🧪 테스트 시나리오

1. **세션 만료 테스트**
   - 브라우저를 1시간 이상 비활성화 후 데이터 로딩 확인
   
2. **네트워크 중단 테스트**
   - 네트워크 연결 해제 후 재연결 시 동작 확인
   
3. **멀티탭 테스트**
   - 여러 탭에서 로그인 상태 동기화 확인

### 6. 📈 예상 효과

- **즉시 효과**: 
  - Visibility API로 탭 활성화 시 즉시 토큰 갱신
  - localStorage 변경으로 탭 간 세션 공유
  - 5분 타임아웃 문제 해결
- **중기 효과**: 
  - staleTime 조정으로 캐시 충돌 방지
  - 백그라운드 탭 문제 완전 해결
  - 사용자 경험 대폭 개선
- **장기 효과**: 
  - 안정적인 인증 시스템으로 사용자 이탈률 감소
  - 시스템 부하 감소 (불필요한 재인증 방지)

### 7. ⚠️ 주의사항

1. **보안 고려사항**
   - localStorage는 XSS 공격에 취약하므로 CSP 정책 강화 필요
   - 민감한 정보는 여전히 서버 사이드에서 관리

2. **브라우저 호환성**
   - 모든 주요 브라우저에서 localStorage 지원 확인

3. **데이터 마이그레이션**
   - 기존 sessionStorage 사용자의 세션 정보 마이그레이션 고려

## 🎯 결론

현재 문제의 주요 원인은:
1. **5분 캐시 만료와 백그라운드 탭 제한의 충돌**
2. **sessionStorage 사용으로 인한 세션 정보 손실**
3. **Visibility API 미사용으로 탭 활성화 시 토큰 상태 미확인**

Visibility API를 활용한 토큰 갱신, localStorage 전환, staleTime 조정을 통해 문제를 완전히 해결할 수 있습니다.