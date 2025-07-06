'use client'

import { RealtimeWrapper } from '@/lib/realtime/broadcast-wrapper'
import { ProjectDetailContent } from './project-detail-content'

interface ProjectDetailWithRealtimeProps {
  projectId: string
}

export function ProjectDetailWithRealtime({ projectId }: ProjectDetailWithRealtimeProps) {
  return (
    <RealtimeWrapper>
      <ProjectDetailContent projectId={projectId} />
    </RealtimeWrapper>
  )
}