import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 성능 최적화: 캐싱 시간 증가
      staleTime: 30 * 60 * 1000, // 30분간 fresh 상태 유지 (기존 5분)
      gcTime: 60 * 60 * 1000, // 1시간 동안 캐시 유지 (기본값 5분)
      retry: 1, // 실패 시 1회만 재시도
      refetchOnWindowFocus: false, // 윈도우 포커스 시 자동 재요청 비활성화
      refetchOnReconnect: true, // 재연결 시 자동 재요청
      // 성능 최적화: 백그라운드 재검증 간격 설정
      refetchInterval: false, // 주기적 재요청 비활성화
      refetchIntervalInBackground: false, // 백그라운드에서도 비활성화
    },
    mutations: {
      retry: 1, // 뮤테이션도 1회만 재시도
      // 성능 최적화: 뮤테이션 캐시 시간 설정
      gcTime: 10 * 60 * 1000, // 10분간 뮤테이션 결과 캐시
    },
  },
}) 