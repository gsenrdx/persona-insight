'use client'

import React, { useCallback } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { ProjectWithMembership } from '@/types'
import { useAuth } from '@/hooks/use-auth'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { projectsApi as projectService, interviewsApi } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { Users, Lock, Globe, MessageSquare, Crown, Shield, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectCardProps {
  project: ProjectWithMembership
  onEdit: (project: ProjectWithMembership) => void
  onInvite: (project: ProjectWithMembership) => void
  onSelect: (project: ProjectWithMembership) => void
  showJoinBadge?: boolean
  index?: number
}

export function ProjectCard({ project, onEdit, onInvite, onSelect, showJoinBadge = false, index = 0 }: ProjectCardProps) {
  const { profile } = useAuth()

  // 프로젝트 카드 hover 시 프리페칭
  const handleMouseEnter = useCallback(async () => {
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
  }, [project.id, profile?.id])

  const getRoleIcon = () => {
    switch (project.user_role) {
      case 'owner':
        return <Crown className="w-3.5 h-3.5 text-purple-500" />
      case 'admin':
        return <Shield className="w-3.5 h-3.5 text-blue-500" />
      default:
        return <User className="w-3.5 h-3.5 text-gray-500" />
    }
  }


  // 프로젝트 생성자인지 확인
  const isOwner = project.created_by === profile?.id || project.user_role === 'owner'

  return (
    <div onMouseEnter={handleMouseEnter}>
      <Card
        className={cn(
          "cursor-pointer relative overflow-hidden group h-full",
          "bg-white/80 backdrop-blur-sm",
          "border-gray-100/50 shadow-sm",
          "transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
          "hover:bg-gradient-to-br hover:from-white hover:to-blue-50/30",
          showJoinBadge && 'ring-2 ring-blue-100'
        )}
        onClick={() => onSelect(project)}
      >
        <CardContent className="p-5">
          {/* Header - 심플하게 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                {project.name}
              </h3>
              {project.visibility === 'public' ? (
                <Globe className="w-4 h-4 text-green-500" />
              ) : (
                <Lock className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>
          
          {/* Description - 더 심플하게 */}
          <div className="mb-4">
            {project.description ? (
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                {project.description}
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic">
                프로젝트 설명이 없습니다
              </p>
            )}
          </div>
          
          {/* Stats - 더 미니멀하게 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-sm font-medium text-gray-900">{project.interview_count || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-sm font-medium text-gray-900">{project.member_count || 0}</span>
              </div>
            </div>
            {/* 비활성 상태 표시 */}
            {project.is_active === false && (
              <div className="w-2 h-2 rounded-full bg-gray-400" title="비활성화됨" />
            )}
          </div>
          
          {/* Footer - 더 미니멀하게 */}
          <div className="flex items-center justify-between">
            {project.user_role || isOwner ? (
              <div className="flex items-center gap-1">
                {isOwner && !project.user_role ? (
                  <Crown className="w-3.5 h-3.5 text-purple-500" />
                ) : (
                  getRoleIcon()
                )}
                <span className="text-xs text-gray-600 font-medium">
                  {isOwner ? '소유자' : 
                   project.user_role === 'admin' ? '관리자' : '멤버'}
                </span>
              </div>
            ) : (
              <div />
            )}
            
            {showJoinBadge && (
              <div className="px-2 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-xs font-medium rounded-full">
                참여 가능
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}