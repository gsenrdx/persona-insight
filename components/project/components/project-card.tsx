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
import { Users, Lock, Globe, MessageSquare, Crown, Shield, User, ToggleLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { projectCardVariants } from '@/components/ui/page-transition'
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

  const getRoleIcon = () => {
    switch (project.user_role) {
      case 'owner':
        return <Crown className="w-3 h-3" />
      case 'admin':
        return <Shield className="w-3 h-3" />
      default:
        return <User className="w-3 h-3" />
    }
  }

  const getRoleColor = () => {
    switch (project.user_role) {
      case 'owner':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'admin':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  // 프로젝트 생성자인지 확인
  const isOwner = project.created_by === profile?.id || project.user_role === 'owner'

  return (
    <motion.div
      variants={projectCardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      custom={index}
      onMouseEnter={handleMouseEnter}
    >
      <Card
        className={cn(
          "bg-white cursor-pointer border relative overflow-hidden group h-full",
          "transition-all duration-300",
          showJoinBadge 
            ? 'border-blue-200 shadow-sm hover:shadow-lg' 
            : 'border-gray-200 hover:shadow-lg hover:border-gray-300'
        )}
        onClick={() => onSelect(project)}
      >
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-100/0 group-hover:from-blue-50/40 group-hover:to-blue-100/40 transition-all duration-300 pointer-events-none" />
        
        <CardContent className="p-5 relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                {project.name}
              </h3>
            </div>
            <div className="flex items-center gap-2 ml-3">
              {/* 활성화 상태 표시 */}
              {project.is_active === false && (
                <div className="p-1.5 rounded-full bg-gray-100 text-gray-500" title="비활성화됨">
                  <ToggleLeft className="w-3.5 h-3.5" />
                </div>
              )}
              <div className={cn(
                "p-1.5 rounded-full transition-all",
                project.visibility === 'public' 
                  ? 'bg-green-100 text-green-600 group-hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
              )}>
                {project.visibility === 'public' ? (
                  <Globe className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
              </div>
            </div>
          </div>
          
          {/* Description */}
          {project.description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {project.description}
            </p>
          )}
          
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="font-medium text-gray-700">{project.interview_count || 0}</span>
              <span>인터뷰</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span className="font-medium text-gray-700">{project.member_count || 0}</span>
              <span>멤버</span>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            {project.user_role || isOwner ? (
              <Badge variant="outline" className={cn(
                "text-xs flex items-center gap-1 px-2 py-0.5",
                isOwner && !project.user_role ? 'bg-amber-100 text-amber-700 border-amber-200' : getRoleColor()
              )}>
                {isOwner && !project.user_role ? <Crown className="w-3 h-3" /> : getRoleIcon()}
                {isOwner ? '소유자' : 
                 project.user_role === 'admin' ? '관리자' : '멤버'}
              </Badge>
            ) : (
              <div className="flex-1" />
            )}
            
            {showJoinBadge && (
              <Badge className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
                참여 가능
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}