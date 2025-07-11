import { useEffect, useCallback } from 'react'
import { Interview } from '@/types/interview'
import { toast } from 'sonner'

interface UseInterviewStatusMonitorProps {
  interviews: Interview[]
  onRetry?: (interviewId: string) => void
}

export function useInterviewStatusMonitor({ 
  interviews, 
  onRetry 
}: UseInterviewStatusMonitorProps) {
  // interviews가 undefined이거나 배열이 아닐 경우 빈 배열로 처리
  const safeInterviews = Array.isArray(interviews) ? interviews : []
  
  // processing 상태 타임아웃 체크 (5분)
  const checkProcessingTimeouts = useCallback(() => {
    const now = Date.now()
    const timeoutDuration = 5 * 60 * 1000 // 5분

    safeInterviews.forEach(interview => {
      if (interview.workflow_status !== 'processing') return

      // metadata에서 처리 시작 시간 확인
      const processingStartedAt = interview.metadata?.processing_started_at
      if (!processingStartedAt) return

      const startTime = new Date(processingStartedAt).getTime()
      const elapsed = now - startTime

      if (elapsed > timeoutDuration) {
        // 5분이 지났는데도 processing 상태면 알림
        toast.error(`"${interview.title || 'Untitled'}" 인터뷰 처리가 지연되고 있습니다.`, {
          description: '처리 시간이 오래 걸리고 있습니다. 잠시 후 다시 확인해주세요.',
          action: onRetry ? {
            label: '다시 시도',
            onClick: () => onRetry(interview.id)
          } : undefined
        })
      }
    })
  }, [safeInterviews, onRetry])

  // 30초마다 타임아웃 체크
  useEffect(() => {
    const hasProcessing = safeInterviews.some(i => i.workflow_status === 'processing')
    if (!hasProcessing) return

    // 초기 체크
    checkProcessingTimeouts()

    // 주기적 체크
    const interval = setInterval(checkProcessingTimeouts, 30000)

    return () => clearInterval(interval)
  }, [safeInterviews, checkProcessingTimeouts])

  // 상태별 인터뷰 개수 반환
  const getStatusCounts = useCallback(() => {
    return safeInterviews.reduce((acc, interview) => {
      const status = interview.workflow_status || 'pending'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [safeInterviews])

  return {
    statusCounts: getStatusCounts(),
    hasProcessing: safeInterviews.some(i => i.workflow_status === 'processing'),
    hasFailed: safeInterviews.some(i => i.workflow_status === 'failed')
  }
}