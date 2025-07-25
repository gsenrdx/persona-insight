'use client'

import { useState, useEffect } from 'react'
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { useProjects, useCreateProject, CreateProjectData } from '@/hooks/use-projects'
import { ProjectWithMembership } from '@/types'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { AppLayout } from "@/components/layout/app-layout"
import { Plus, Sparkles, FolderOpen } from 'lucide-react'
import { ProjectHeader } from '../sections/project-header'
import { ProjectGrid } from '../sections/project-grid'
import { ProjectSearchBar } from '../components/project-search-bar'
import { CreateProjectDialog } from '../components/create-project-dialog'
import { ProjectSkeleton } from '../components/project-skeleton'
import { JoinProjectDialog } from '../components/join-project-dialog'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'

// 프로젝트 수정을 위한 인터페이스
interface ProjectEditData {
  id: string
  name: string
  description: string
  visibility: 'public' | 'private'
  join_method: 'open' | 'invite_only' | 'password'
  password?: string
}

export function ProjectPageContent() {
  const router = useRouter()
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: projects = [], isLoading: loading, error, refetch } = useProjects({
    companyId: profile?.company_id ?? undefined,
    userId: profile?.id ?? undefined
  })
  const createProjectMutation = useCreateProject()
  
  // 상태 관리
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [selectedProject, setSelectedProject] = useState<ProjectWithMembership | null>(null)
  
  // 편집 관련 (추후 구현)
  const [editingProject, setEditingProject] = useState<ProjectEditData | null>(null)
  
  // 초대 관련 (추후 구현)
  const [inviteProject, setInviteProject] = useState<ProjectWithMembership | null>(null)

  // 프로젝트 필터링 및 분류
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // 참여한 프로젝트와 참여하지 않은 프로젝트 분리
  const joinedProjects = filteredProjects.filter(project => project.user_role !== null)
  const notJoinedProjects = filteredProjects.filter(project => 
    project.visibility === 'public' && project.user_role === null
  )

  // 프리페칭 제거: 프로젝트 목록 데이터에 이미 필요한 정보가 포함되어 있음
  // 프로젝트 상세 페이지에서 캐시된 목록 데이터를 우선 사용하고, 필요한 경우에만 추가 로드

  // 새 프로젝트 생성
  const handleCreateProject = async (projectData: CreateProjectData) => {
    if (!profile?.company_id || !profile?.id) {
      toast.error('사용자 인증 정보가 없습니다. 다시 로그인해주세요.')
      throw new Error('Authentication required')
    }

    try {
      await createProjectMutation.mutateAsync(projectData)
      setShowCreateForm(false)
      toast.success('프로젝트가 성공적으로 생성되었습니다!')
    } catch (err) {
      // 프로젝트 생성 실패 처리
      throw err
    }
  }

  // 프로젝트 선택 (프로젝트 상세 페이지로 이동)
  const handleSelectProject = async (project: ProjectWithMembership) => {
    // 공개 프로젝트이고 멤버가 아닌 경우 참여 모달 표시
    if (project.visibility === 'public' && !project.user_role) {
      setSelectedProject(project)
      setShowJoinDialog(true)
    } else {
      router.push(`/projects/${project.id}`)
    }
  }

  // 프로젝트 참여
  const handleJoinProject = async (projectId: string) => {
    if (!profile?.id) {
      toast.error('로그인이 필요합니다.')
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      toast.error('인증 토큰을 찾을 수 없습니다')
      return
    }

    const response = await fetch(`/api/projects/${projectId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ user_id: profile.id })
    })

    if (!response.ok) {
      throw new Error('프로젝트 참여에 실패했습니다')
    }

    await response.json()
    
    // 성공 토스트를 먼저 표시
    toast.success('프로젝트에 참여했습니다!')
    
    // Optimistic update - 프로젝트 목록 캐시 업데이트
    const queryKey = queryKeys.projects.byCompanyAndUser(profile.company_id!, profile.id)
    queryClient.setQueryData(queryKey, (oldData: ProjectWithMembership[] | undefined) => {
      if (!oldData) return oldData
      
      // 해당 프로젝트를 찾아서 user_role 업데이트
      return oldData.map(project => 
        project.id === projectId 
          ? { ...project, user_role: 'member' as const, member_count: (project.member_count || 0) + 1 }
          : project
      )
    })
    
    // 다른 캐시들도 무효화
    await queryClient.invalidateQueries({ 
      queryKey: queryKeys.projects.detail(projectId) 
    })
    await queryClient.invalidateQueries({ 
      queryKey: queryKeys.projects.member(projectId) 
    })
    
    // 프로젝트 상세 페이지로 이동
    router.push(`/projects/${projectId}`)
  }

  // 프로젝트 편집
  const handleEditProject = (project: ProjectWithMembership) => {
    setEditingProject({
      id: project.id,
      name: project.name,
      description: project.description || '',
      visibility: project.visibility || 'public',
      join_method: project.join_method || 'open',
      password: project.password || ''
    })
    // TODO: 편집 다이얼로그 구현
  }

  if (loading) {
    return <ProjectSkeleton />
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 relative z-10 text-center">
        <p className="text-red-500 mb-4">프로젝트를 불러오는 중 오류가 발생했습니다.</p>
        <Button variant="outline" onClick={() => refetch()}>다시 시도</Button>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full min-h-0">
        {/* 헤더 - container와 일치하는 패딩 */}
        <div className="container mx-auto px-4">
          <ProjectHeader
            projectCount={filteredProjects.length}
            onCreateProject={() => setShowCreateForm(true)}
          />
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="container mx-auto px-4">
          <ProjectSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
          />

          {/* 참여한 프로젝트 */}
          {joinedProjects.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-8 w-1 bg-blue-600 rounded-full" />
                <h2 className="text-xl font-semibold text-gray-900">내 프로젝트</h2>
                <span className="text-sm text-gray-500 ml-2">
                  ({joinedProjects.length})
                </span>
              </div>
              <ProjectGrid
                projects={joinedProjects}
                searchQuery={searchQuery}
                onEditProject={handleEditProject}
                onInviteProject={setInviteProject}
                onSelectProject={handleSelectProject}
                onCreateProject={() => setShowCreateForm(true)}
              />
            </div>
          )}

          {/* 참여하지 않은 공개 프로젝트 */}
          {notJoinedProjects.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="h-8 w-1 bg-green-600 rounded-full" />
                <h2 className="text-xl font-semibold text-gray-900">참여 가능한 프로젝트</h2>
                <span className="text-sm text-gray-500 ml-2">
                  ({notJoinedProjects.length})
                </span>
              </div>
              <ProjectGrid
                projects={notJoinedProjects}
                searchQuery={searchQuery}
                onEditProject={handleEditProject}
                onInviteProject={setInviteProject}
                onSelectProject={handleSelectProject}
                onCreateProject={() => setShowCreateForm(true)}
                showJoinBadge={true}
              />
            </div>
          )}

          {/* 검색 결과가 없을 때 */}
          {filteredProjects.length === 0 && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mb-6 shadow-lg">
                {searchQuery ? (
                  <FolderOpen className="w-10 h-10 text-blue-600" />
                ) : (
                  <Sparkles className="w-10 h-10 text-blue-600" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchQuery ? '검색 결과가 없습니다' : '프로젝트가 없습니다'}
              </h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                {searchQuery ? '다른 검색어를 시도해보세요' : '프로젝트를 생성하고 팀원들과 함께 인터뷰를 분석해보세요'}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-3 font-medium shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  새 프로젝트 생성
                </Button>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* 프로젝트 생성 다이얼로그 */}
      {profile?.company_id && profile?.id && (
        <CreateProjectDialog
          open={showCreateForm}
          onOpenChange={setShowCreateForm}
          onCreateProject={handleCreateProject}
          isCreating={createProjectMutation.isPending}
          companyId={profile.company_id}
          userId={profile.id}
        />
      )}


      {/* 프로젝트 참여 다이얼로그 */}
      <JoinProjectDialog
        open={showJoinDialog}
        onOpenChange={setShowJoinDialog}
        project={selectedProject}
        onJoin={handleJoinProject}
      />
    </AppLayout>
  )
}