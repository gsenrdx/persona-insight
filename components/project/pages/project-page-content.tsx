'use client'

import { useState } from 'react'
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { useProjects, useCreateProject, CreateProjectData } from '@/hooks/use-projects'
import { ProjectWithMembership } from '@/types'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import UserMenu from "@/components/auth/user-menu"
import CompanyBranding from "@/components/auth/company-branding"
import { Navigation } from "@/components/shared"
import { PersonaCriteriaModal } from '@/components/modal'
import { ProjectHeader } from '../sections/project-header'
import { ProjectGrid } from '../sections/project-grid'
import { ProjectSearchBar } from '../components/project-search-bar'
import { CreateProjectDialog } from '../components/create-project-dialog'
import { ProjectSkeleton } from '../components/project-skeleton'

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
    <>
      {/* 헤더 */}
      <header className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-baseline">
                <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Persona Insight</h2>
                <CompanyBranding />
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Navigation />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 py-8 relative z-10">
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
      </main>

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
    </>
  )
}