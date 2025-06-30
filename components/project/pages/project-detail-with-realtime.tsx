'use client'

import { InterviewRealtimeProvider } from '@/lib/realtime/interview-realtime-provider'
import { ProjectDetailContent } from './project-detail-content'

interface ProjectDetailWithRealtimeProps {
  projectId: string
}

export function ProjectDetailWithRealtime({ projectId }: ProjectDetailWithRealtimeProps) {
  return (
    <InterviewRealtimeProvider>
      <ProjectDetailContent projectId={projectId} />
    </InterviewRealtimeProvider>
  )
}