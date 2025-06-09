import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
      retry: 1, // 실패 시 1회만 재시도
      refetchOnWindowFocus: false, // 윈도우 포커스 시 자동 재요청 비활성화
      refetchOnReconnect: true, // 재연결 시 자동 재요청
    },
    mutations: {
      retry: 1, // 뮤테이션도 1회만 재시도
    },
  },
}) 