'use client'

import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProjectWithMembership } from '@/types'
import { useAuth } from '@/hooks/use-auth'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { projectsApi as projectService, interviewsApi } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { Users, Lock, Globe } from 'lucide-react'

interface ProjectCardProps {
  project: ProjectWithMembership
  onEdit: (project: ProjectWithMembership) => void
  onInvite: (project: ProjectWithMembership) => void
  onSelect: (project: ProjectWithMembership) => void
  showJoinBadge?: boolean
}

export function ProjectCard({ project, onEdit, onInvite, onSelect, showJoinBadge = false }: ProjectCardProps) {
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
      className={`bg-white transition-all cursor-pointer border ${
        showJoinBadge 
          ? 'border-gray-200 hover:border-primary/50 hover:shadow-sm' 
          : 'border-gray-200 hover:shadow-sm'
      }`}
      onClick={() => onSelect(project)}
      onMouseEnter={handleMouseEnter}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
          <div className="flex items-center gap-2">
            {project.visibility === 'public' ? (
              <Globe className="w-4 h-4 text-gray-400" />
            ) : (
              <Lock className="w-4 h-4 text-gray-400" />
            )}
            {showJoinBadge && (
              <Badge variant="secondary" className="text-xs">참여 가능</Badge>
            )}
          </div>
        </div>
        
        {project.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{project.interview_count || 0} 인터뷰</span>
          <span>{project.member_count || 0} 멤버</span>
        </div>
        
        {project.user_role && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Badge variant="outline" className="text-xs">
              {project.user_role === 'owner' ? '소유자' : 
               project.user_role === 'admin' ? '관리자' : '멤버'}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}