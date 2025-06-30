'use client'

import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { ProjectWithMembership } from '@/types'
import { useAuth } from '@/hooks/use-auth'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { projectsApi as projectService, interviewsApi } from '@/lib/api'
import { supabase } from '@/lib/supabase'

interface ProjectCardProps {
  project: ProjectWithMembership
  onEdit: (project: ProjectWithMembership) => void
  onInvite: (project: ProjectWithMembership) => void
  onSelect: (project: ProjectWithMembership) => void
}

export function ProjectCard({ project, onEdit, onInvite, onSelect }: ProjectCardProps) {
  const { profile } = useAuth()

  // 프로젝트 카드 hover 시 프리페칭
  const handleMouseEnter = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token && profile?.id) {
      queryClient.prefetchQuery({
        queryKey: queryKeys.projects.detail(project.id),
        queryFn: () => projectService.getProject(session.access_token, project.id, profile.id),
        staleTime: 5 * 60 * 1000,
      })

      queryClient.prefetchQuery({
        queryKey: queryKeys.interviews.byProject(project.id),
        queryFn: () => interviewsApi.getInterviews(session.access_token, { projectId: project.id }),
        staleTime: 5 * 60 * 1000,
      })
    }
  }

  return (
    <Card
      className="bg-white hover:shadow-sm transition-shadow cursor-pointer border border-gray-200"
      onClick={() => onSelect(project)}
      onMouseEnter={handleMouseEnter}
    >
      <CardContent className="p-5">
        <h3 className="text-lg font-medium text-gray-900 mb-2">{project.name}</h3>
        
        {project.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{project.interview_count || 0} 인터뷰</span>
          <span>{project.member_count || 1} 멤버</span>
        </div>
      </CardContent>
    </Card>
  )
}