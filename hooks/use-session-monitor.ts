import { useEffect } from 'react'
import { useAuth } from './use-auth'
import { supabase } from '@/lib/supabase'

/**
 * 세션 상태를 모니터링하고 만료 시 자동으로 처리하는 훅
 * - 탭이 활성화된 상태에서만 세션 체크
 * - 백그라운드에서는 체크하지 않아 리소스 절약
 * - 30초마다 세션 유효성 확인
 */
export function useSessionMonitor() {
  const { session, signOut } = useAuth()
  
  useEffect(() => {
    if (!session) return
    
    let checkInterval: NodeJS.Timeout
    
    const checkSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession()
        
        if (!currentSession || error) {
          // 세션이 없거나 에러가 있으면 로그아웃
          await signOut()
          window.location.href = '/login?expired=true'
        }
      } catch (err) {
        console.error('세션 체크 중 오류:', err)
      }
    }
    
    const startChecking = () => {
      // 초기 체크
      checkSession()
      
      // 30초마다 체크 (포그라운드에서만)
      checkInterval = setInterval(() => {
        if (!document.hidden) {
          checkSession()
        }
      }, 30000)
    }
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 백그라운드로 전환 시 체크 중단
        if (checkInterval) {
          clearInterval(checkInterval)
        }
      } else {
        // 포그라운드로 전환 시 즉시 체크 후 재시작
        startChecking()
      }
    }
    
    // 현재 탭이 활성화된 상태면 시작
    if (!document.hidden) {
      startChecking()
    }
    
    // visibility 변화 감지
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session, signOut])
}

/**
 * 네트워크 재연결 시 세션 복구를 시도하는 훅
 */
export function useNetworkRecovery() {
  const { session, refreshProfile } = useAuth()
  
  useEffect(() => {
    const handleOnline = async () => {
      if (!session) return
      
      try {
        // 네트워크 재연결 시 세션 확인
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        if (currentSession) {
          // 세션이 유효하면 프로필 새로고침
          await refreshProfile()
        } else {
          // 세션이 없으면 로그인 페이지로
          window.location.href = '/login?expired=true'
        }
      } catch (err) {
        console.error('네트워크 복구 중 오류:', err)
      }
    }
    
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [session, refreshProfile])
}