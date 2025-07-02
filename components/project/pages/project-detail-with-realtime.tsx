'use client'

import { InterviewRealtimeWrapper } from '@/lib/realtime/interview-realtime-wrapper'
import { ProjectDetailContent } from './project-detail-content'

interface ProjectDetailWithRealtimeProps {
  projectId: string
}

export function ProjectDetailWithRealtime({ projectId }: ProjectDetailWithRealtimeProps) {
  return (
    <InterviewRealtimeWrapper>
      <ProjectDetailContent projectId={projectId} />
    </InterviewRealtimeWrapper>
  )
}