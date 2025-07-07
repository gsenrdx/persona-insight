'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  AdaptiveRealtime, 
  defaultFeatureConfigs,
  debugOptions
} from '@/lib/realtime/adaptive/adaptive-realtime'
import { RealtimeStrategy, StrategyTransition } from '@/lib/realtime/adaptive/types'

/**
 * 적응형 실시간 시스템 훅
 * UI 변경 없이 최적의 실시간 전략을 자동으로 선택하고 관리
 */
export function useAdaptiveRealtime(feature: string) {
  const [strategy, setStrategy] = useState<RealtimeStrategy>('none')
  const [isInitialized, setIsInitialized] = useState(false)
  const [transitions, setTransitions] = useState<StrategyTransition[]>([])
  
  useEffect(() => {
    // 적응형 시스템 초기화 (싱글톤)
    try {
      let adaptive = AdaptiveRealtime.getInstance()
      setIsInitialized(true)
    } catch {
      // 처음 초기화
      const options = {
        features: defaultFeatureConfigs,
        globalFallback: 'polling' as RealtimeStrategy,
        monitoringInterval: 5000,
        networkCheckInterval: 10000,
        ...(process.env.NODE_ENV === 'development' ? debugOptions : {}),
        onTransition: (transition: StrategyTransition) => {
          // 해당 기능의 전환만 추적
          if (transition.to !== transition.from) {
            setTransitions(prev => [...prev.slice(-9), transition])
          }
        }
      }
      
      AdaptiveRealtime.initialize(options)
      setIsInitialized(true)
    }
    
    // 현재 전략 가져오기
    if (isInitialized) {
      const adaptive = AdaptiveRealtime.getInstance()
      const currentStrategy = adaptive.getStrategy(feature)
      setStrategy(currentStrategy)
      
      // 전략 변경 감지를 위한 폴링 (전환 이벤트로 대체 가능)
      const interval = setInterval(() => {
        const newStrategy = adaptive.getStrategy(feature)
        if (newStrategy !== strategy) {
          setStrategy(newStrategy)
        }
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [feature, isInitialized, strategy])
  
  // 연결 추적 헬퍼
  const trackConnection = useCallback((connectionId: string, type: string = 'unknown') => {
    if (isInitialized) {
      AdaptiveRealtime.getInstance().trackConnection(connectionId, type)
    }
  }, [isInitialized])
  
  const untrackConnection = useCallback((connectionId: string) => {
    if (isInitialized) {
      AdaptiveRealtime.getInstance().untrackConnection(connectionId)
    }
  }, [isInitialized])
  
  // 메시지/에러 추적
  const trackMessage = useCallback(() => {
    if (isInitialized) {
      AdaptiveRealtime.getInstance().trackMessage()
    }
  }, [isInitialized])
  
  const trackError = useCallback(() => {
    if (isInitialized) {
      AdaptiveRealtime.getInstance().trackError()
    }
  }, [isInitialized])
  
  // 수동 전략 전환 (디버그용)
  const switchStrategy = useCallback(async (newStrategy: RealtimeStrategy) => {
    if (isInitialized) {
      await AdaptiveRealtime.getInstance().switchStrategy(feature, newStrategy)
    }
  }, [feature, isInitialized])
  
  return {
    strategy,
    isInitialized,
    transitions,
    trackConnection,
    untrackConnection,
    trackMessage,
    trackError,
    switchStrategy: process.env.NODE_ENV === 'development' ? switchStrategy : undefined
  }
}

/**
 * 적응형 전략에 따라 적절한 훅을 선택하는 고차 훅
 */
export function useAdaptiveFeature<T>(
  feature: string,
  hooks: {
    websocket?: () => T,
    sse?: () => T,
    polling?: () => T,
    none?: () => T
  }
): T | null {
  const { strategy } = useAdaptiveRealtime(feature)
  
  // 전략에 따른 훅 선택
  switch (strategy) {
    case 'websocket':
      return hooks.websocket ? hooks.websocket() : null
    case 'sse':
      return hooks.sse ? hooks.sse() : null
    case 'polling':
      return hooks.polling ? hooks.polling() : null
    case 'none':
      return hooks.none ? hooks.none() : null
    default:
      return null
  }
}