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
import { PersonaCriteriaModal } from '@/components/modal'
import { ProjectHeader } from '../sections/project-header'
import { ProjectGrid } from '../sections/project-grid'
import { ProjectSearchBar } from '../components/project-search-bar'
import { CreateProjectDialog } from '../components/create-project-dialog'
import { ProjectSkeleton } from '../components/project-skeleton'
import { useQueries } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { projectsApi as projectService } from '@/lib/api'
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
  const { data: projects = [], isLoading: loading, error, refetch } = useProjects({
    companyId: profile?.company_id ?? undefined,
    userId: profile?.id ?? undefined
  })
  const createProjectMutation = useCreateProject()
  
  // 상태 관리
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showPersonaCriteriaModal, setShowPersonaCriteriaModal] = useState(false)
  
  // 편집 관련
  const [editingProject, setEditingProject] = useState<ProjectEditData | null>(null)
  
  // 초대 관련 (추후 구현)
  const [inviteProject, setInviteProject] = useState<ProjectWithMembership | null>(null)

  // 프로젝트 필터링
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // 화면에 보이는 프로젝트들만 프리페칭 (최대 6개)
  const visibleProjects = filteredProjects.slice(0, 6)
  
  // 프로젝트 상세 데이터 배치 프리페칭 (최대 6개만)
  const projectDetailsQueries = useQueries({
    queries: visibleProjects.map(project => ({
      queryKey: queryKeys.projects.detail(project.id),
      queryFn: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
        const response = await projectService.getProject(session.access_token, project.id, profile?.id)
        return response.data
      },
      staleTime: 5 * 60 * 1000, // 5분
      enabled: !!profile?.id && !!visibleProjects.length,
    }))
  })

  // 프로젝트 멤버 데이터 배치 프리페칭
  const projectMembersQueries = useQueries({
    queries: visibleProjects.map(project => ({
      queryKey: queryKeys.projects.member(project.id),
      queryFn: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
        const response = await projectService.getProjectMembers(session.access_token, project.id)
        return response.data
      },
      staleTime: 5 * 60 * 1000, // 5분
      enabled: !!profile?.id && !!visibleProjects.length,
    }))
  })

  // 인터뷰 데이터 배치 프리페칭 (프로젝트당 최대 20개)
  const interviewQueries = useQueries({
    queries: visibleProjects.map(project => ({
      queryKey: queryKeys.interviews.byProject(project.id, { limit: 20 }),
      queryFn: async () => {
        if (!profile?.company_id) throw new Error('회사 정보가 없습니다')
        const response = await fetch(
          `/api/interviews?company_id=${profile.company_id}&project_id=${project.id}&limit=20&offset=0`
        )
        if (!response.ok) throw new Error('인터뷰 데이터를 가져올 수 없습니다')
        const data = await response.json()
        return data.data || []
      },
      staleTime: 5 * 60 * 1000, // 5분
      enabled: !!profile?.company_id && !!profile?.id && !!visibleProjects.length,
    }))
  })

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
    router.push(`/projects/${project.id}`)
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
      <div className="container mx-auto px-4 py-8">
        <ProjectHeader
          projectCount={filteredProjects.length}
          onShowPersonaCriteria={() => setShowPersonaCriteriaModal(true)}
          onCreateProject={() => setShowCreateForm(true)}
        />

        <ProjectSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <ProjectGrid
          projects={filteredProjects}
          searchQuery={searchQuery}
          onEditProject={handleEditProject}
          onInviteProject={setInviteProject}
          onSelectProject={handleSelectProject}
          onCreateProject={() => setShowCreateForm(true)}
        />
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

      <PersonaCriteriaModal 
        open={showPersonaCriteriaModal}
        onOpenChange={setShowPersonaCriteriaModal}
      />
    </AppLayout>
  )
}