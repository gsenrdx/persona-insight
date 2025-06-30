'use client'

import { use } from 'react'
import { ProjectDetailWithRealtime } from '@/components/project/pages/project-detail-with-realtime'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const resolvedParams = use(params)

  return <ProjectDetailWithRealtime projectId={resolvedParams.id} />
} 