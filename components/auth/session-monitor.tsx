'use client'

import { useSessionMonitor, useNetworkRecovery } from '@/hooks/use-session-monitor'

/**
 * 세션 상태를 모니터링하는 컴포넌트
 * AuthProvider 내부에서 사용하여 전역적으로 세션 상태를 관리
 */
export function SessionMonitor() {
  // 세션 모니터링 활성화
  useSessionMonitor()
  
  // 네트워크 복구 시 세션 체크
  useNetworkRecovery()
  
  // UI는 렌더링하지 않음
  return null
}