'use client'

import { useCallback, useEffect } from 'react'
import { useInterviewsPolling, useInterviewPolling } from './use-interviews-polling'
import { useAdaptiveRealtime } from './use-adaptive-realtime'

/**
 * 적응형 인터뷰 목록 훅
 * 네트워크와 성능 상태에 따라 폴링 주기를 자동 조정
 * UI는 변경하지 않음
 */
export function useAdaptiveInterviews(projectId: string) {
  const { 
    strategy, 
    trackConnection, 
    untrackConnection,
    trackMessage,
    trackError 
  } = useAdaptiveRealtime('interview-list')
  
  // 전략에 따른 폴링 주기 결정
  const getPollingInterval = () => {
    switch (strategy) {
      case 'websocket':
      case 'sse':
        // 실시간 전략이지만 interview-list는 polling만 사용
        return 30000 // 30초
      case 'polling':
        return 30000 // 30초 (기본값)
      case 'none':
        return 0 // 폴링 비활성화 (0은 폴링 중지를 의미)
      default:
        return 30000
    }
  }
  
  const pollingInterval = getPollingInterval()
  
  // 기존 useInterviewsPolling 사용
  const result = useInterviewsPolling(projectId, {
    enabled: strategy !== 'none',
    refetchInterval: pollingInterval || undefined, // 0일 때 undefined로 변환
    refetchOnWindowFocus: true
  })
  
  // 연결 추적
  useEffect(() => {
    if (strategy !== 'none') {
      trackConnection(`interviews-polling-${projectId}`, 'polling')
    }
    
    return () => {
      untrackConnection(`interviews-polling-${projectId}`)
    }
  }, [strategy, projectId, trackConnection, untrackConnection])
  
  // 데이터 페치 성공/실패 추적
  useEffect(() => {
    if (result.interviews.length > 0 && !result.isLoading) {
      trackMessage()
    }
  }, [result.interviews, result.isLoading, trackMessage])
  
  useEffect(() => {
    if (result.error) {
      trackError()
    }
  }, [result.error, trackError])
  
  return {
    ...result,
    strategy, // 현재 사용 중인 전략 노출 (디버그용)
    pollingInterval // 현재 폴링 주기 노출 (디버그용)
  }
}

/**
 * 적응형 단일 인터뷰 상세 훅
 * 네트워크 상태에 따라 다른 전략 사용 가능
 */
export function useAdaptiveInterview(interviewId: string) {
  const { 
    strategy, 
    trackConnection, 
    untrackConnection,
    trackMessage,
    trackError 
  } = useAdaptiveRealtime('interview-detail')
  
  // 실시간 전략이 활성화되어 있으면 더 짧은 주기로 폴링
  const getPollingInterval = () => {
    switch (strategy) {
      case 'websocket':
        // WebSocket이 활성화되면 폴링 비활성화 (향후 WebSocket 구현 시)
        return 0
      case 'sse':
        // SSE가 활성화되면 폴링 비활성화 (향후 SSE 구현 시)
        return 0
      case 'polling':
        return 60000 // 60초
      case 'none':
        return 0
      default:
        return 60000
    }
  }
  
  const pollingInterval = getPollingInterval()
  
  // 기존 useInterviewPolling 사용
  const result = useInterviewPolling(interviewId, {
    enabled: strategy !== 'none' && pollingInterval > 0,
    refetchInterval: pollingInterval || undefined,
    refetchOnWindowFocus: true
  })
  
  // 연결 추적
  useEffect(() => {
    if (strategy === 'polling') {
      trackConnection(`interview-detail-polling-${interviewId}`, 'polling')
    }
    // 향후 WebSocket/SSE 구현 시 추가
    
    return () => {
      untrackConnection(`interview-detail-polling-${interviewId}`)
    }
  }, [strategy, interviewId, trackConnection, untrackConnection])
  
  // 메시지 추적
  useEffect(() => {
    if (result.interview && !result.isLoading) {
      trackMessage()
    }
  }, [result.interview, result.isLoading, trackMessage])
  
  useEffect(() => {
    if (result.error) {
      trackError()
    }
  }, [result.error, trackError])
  
  return {
    ...result,
    strategy, // 현재 사용 중인 전략 노출 (디버그용)
    pollingInterval // 현재 폴링 주기 노출 (디버그용)
  }
}