import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { FileText, MoreHorizontal, Lock, Crown, UserCheck, Eye, Settings, UserPlus } from "lucide-react"
import { ProjectWithMembership } from '@/types'
import { useAuth } from '@/hooks/use-auth'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { projectsApi as projectService } from '@/lib/api'
import { supabase } from '@/lib/supabase'

interface ProjectCardProps {
  project: ProjectWithMembership
  onEdit: (project: ProjectWithMembership) => void
  onInvite: (project: ProjectWithMembership) => void
  onSelect: (project: ProjectWithMembership) => void
}

// 팀 멤버 타입 정의
interface TeamMember {
  name: string
  initial: string
  role: string
  avatar_url: string | null
}

export function ProjectCard({ project, onEdit, onInvite, onSelect }: ProjectCardProps) {
  const { profile } = useAuth()
  
  // 멤버십 상태 확인
  const getMembershipStatus = (project: ProjectWithMembership) => {
    if (!profile?.id) return null
    
    if (project.created_by === profile.id) {
      return { isMember: true, role: 'owner', isOwner: true }
    }
    
    if (project.membership && project.membership.is_member) {
      return { 
        isMember: true, 
        role: project.membership.role, 
        isOwner: project.membership.role === 'owner' 
      }
    }
    
    return { isMember: false, role: null, isOwner: false }
  }

  // 프로젝트 마스터 정보
  const getProjectMaster = (project: ProjectWithMembership) => {
    if (project.master_id) {
      return {
        name: profile?.id === project.master_id ? (profile?.name || '마스터') : '마스터',
        userId: project.master_id,
        isMaster: profile?.id === project.master_id
      }
    }
    
    return {
      name: profile?.id === project.created_by ? (profile?.name || '생성자') : '생성자',
      userId: project.created_by,
      isMaster: profile?.id === project.created_by
    }
  }

  // 공개 설정 확인
  const isPrivateProject = (project: ProjectWithMembership) => {
    return project.visibility === 'private' || project.is_private === true
  }

  // 권한 확인 함수들
  const canEditProject = (project: ProjectWithMembership) => {
    const membershipStatus = getMembershipStatus(project)
    const masterInfo = getProjectMaster(project)
    
    return (
      project.created_by === profile?.id || 
      membershipStatus?.role === 'owner' ||
      masterInfo.isMaster ||
      profile?.role === 'company_admin' || 
      profile?.role === 'super_admin'
    )
  }

  const canInviteMembers = (project: ProjectWithMembership) => {
    if (!isPrivateProject(project)) return false
    
    const membershipStatus = getMembershipStatus(project)
    const masterInfo = getProjectMaster(project)
    
    return (
      project.created_by === profile?.id || 
      membershipStatus?.role === 'owner' ||
      membershipStatus?.role === 'admin' ||
      masterInfo.isMaster
    )
  }

  const membershipStatus = getMembershipStatus(project)
  const projectMaster = getProjectMaster(project)
  const isPrivate = isPrivateProject(project)

  // 팀 멤버 정보 가져오기
  const getTeamMembers = (): TeamMember[] => {
    const members: TeamMember[] = []
    
    // top_members 데이터가 있으면 사용
    if (project.top_members && Array.isArray(project.top_members)) {
      return project.top_members.slice(0, 4).map((member: any) => ({
        name: member.name || 'Unknown User',
        initial: (member.name?.[0] || 'U').toUpperCase(),
        role: member.role || 'member',
        avatar_url: member.avatar_url || null
      }))
    }
    
    // fallback: 기존 로직 (현재 사용자만 표시)
    if (projectMaster.isMaster) {
      members.push({ 
        name: profile?.name || '마스터', 
        initial: (profile?.name?.[0] || 'M').toUpperCase(),
        role: 'owner',
        avatar_url: profile?.avatar_url || null
      })
    }
    
    // 추가 멤버들 (가상 데이터로 채우기)
    const additionalMembers = Math.max(0, (project.member_count || 1) - 1)
    for (let i = 0; i < Math.min(additionalMembers, 3); i++) {
      members.push({ 
        name: `멤버${i + 1}`, 
        initial: `${i + 1}`,
        role: 'member',
        avatar_url: null
      })
    }
    
    return members
  }

  const teamMembers = getTeamMembers()

  // 프로젝트 카드 hover 시 프리페칭
  const handleMouseEnter = async () => {
    // 프로젝트 상세 정보 프리페치
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token && profile?.id) {
      queryClient.prefetchQuery({
        queryKey: queryKeys.projects.detail(project.id),
        queryFn: () => projectService.getProject(session.access_token, project.id, profile.id),
        staleTime: 5 * 60 * 1000,
      })

      // 프로젝트 멤버 정보 프리페치
      queryClient.prefetchQuery({
        queryKey: queryKeys.projects.member(project.id),
        queryFn: () => projectService.getProjectMembers(session.access_token, project.id),
        staleTime: 5 * 60 * 1000,
      })

      // 인터뷰 데이터는 프로젝트 상세 페이지에서 필요할 때만 로드
    }
  }

  return (
    <Card
      className="bg-white hover:shadow-lg transition-shadow duration-300 h-full flex flex-col cursor-pointer group"
      onClick={() => onSelect(project)}
      onMouseEnter={handleMouseEnter}
    >
      <CardContent className="p-4 flex-grow">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-slate-800 line-clamp-1">{project.name}</h3>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                onSelect(project)
              }}>
                <Eye className="h-4 w-4 mr-2" />
                프로젝트 열기
              </DropdownMenuItem>
              {canEditProject(project) && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  onEdit(project)
                }}>
                  <Settings className="h-4 w-4 mr-2" />
                  설정
                </DropdownMenuItem>
              )}
              {canInviteMembers(project) && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  onInvite(project)
                }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  멤버 초대
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {project.description && (
          <p className="text-slate-600 mb-3 text-xs line-clamp-2">{project.description}</p>
        )}
        
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
          <span className="flex items-center">
            <FileText className="w-3.5 h-3.5 mr-1" />
            {project.interview_count || 0}개 인터뷰
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {teamMembers.slice(0, 4).map((member, index) => (
              <Avatar key={index} className="w-7 h-7 border-2 border-white">
                {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.name} />}
                <AvatarFallback className={`text-white text-xs ${
                  member.role === 'owner' ? 'bg-yellow-500' :
                  member.role === 'admin' ? 'bg-blue-500' : 
                  'bg-indigo-500'
                }`}>
                  {member.initial}
                </AvatarFallback>
              </Avatar>
            ))}
            {(project.member_count || 1) > 4 && (
              <Avatar className="w-7 h-7 border-2 border-white">
                <AvatarFallback className="bg-gray-400 text-white text-xs">
                  +{(project.member_count || 1) - 4}
                </AvatarFallback>
              </Avatar>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isPrivate && (
              <Lock className="h-3.5 w-3.5 text-orange-500" />
            )}
            {membershipStatus?.isOwner || projectMaster.isMaster ? (
              <Crown className="h-3.5 w-3.5 text-yellow-500" />
            ) : membershipStatus?.isMember ? (
              <UserCheck className="h-3.5 w-3.5 text-green-500" />
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}