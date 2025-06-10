'use client'

import { use } from 'react'
import { ProjectDetailContent } from '@/components/project/project-detail-content'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const resolvedParams = use(params)

  return <ProjectDetailContent projectId={resolvedParams.id} />
} 