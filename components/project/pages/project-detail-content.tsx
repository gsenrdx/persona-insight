'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Loader2, ChevronUp } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { useProject, useProjectMembers } from '@/hooks/use-projects'
import { toast } from 'sonner'
import ProjectSettings from '@/components/project/tabs/project-settings'
import ProjectInterviews from '@/components/project/tabs/project-interviews-new'
import ProjectInsights from '@/components/project/tabs/project-insights'
import { MaskingTest } from '@/components/test/masking-test'
import { ProjectLayout } from '@/components/layout/project-layout'
import { cn } from '@/lib/utils'

interface ProjectDetailContentProps {
  projectId: string
}



export function ProjectDetailContent({ projectId }: ProjectDetailContentProps) {
  const { profile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // 병렬 데이터 페칭
  const { data: project, isLoading: projectLoading, error, isError, refetch } = useProject(projectId)
  const { data: members, isLoading: membersLoading } = useProjectMembers(projectId)
  
  const [activeView, setActiveView] = useState('interviews')
  const [showScrollTop, setShowScrollTop] = useState(false)
  
  // 전체 로딩 상태
  const isLoading = projectLoading || membersLoading

  // URL 쿼리 파라미터로부터 activeView 설정
  useEffect(() => {
    const interviewParam = searchParams.get('interview')
    if (interviewParam) {
      setActiveView('interviews')
    }
  }, [searchParams])


  const handleViewChange = (view: string) => {
    setActiveView(view)
    // URL 업데이트 (interview 쿼리 파라미터 제거)
    const url = new URL(window.location.href)
    url.searchParams.delete('interview')
    router.replace(url.pathname + url.search, { scroll: false })
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 스크롤 이벤트 핸들러
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const renderContent = () => {
    if (!project) return null

    const interviewParam = searchParams.get('interview')

    switch (activeView) {
      case 'interviews':
        return <ProjectInterviews project={project} selectedInterviewId={interviewParam} />
      case 'insights':
        return <ProjectInsights project={project} />
      case 'settings':
        return <ProjectSettings project={project} onProjectUpdate={() => refetch()} />
      case 'masking-test':
        return <MaskingTest projectId={project.id} />
      default:
        return <ProjectInterviews project={project} selectedInterviewId={interviewParam} />
    }
  }

  // 로딩 중에도 기본 레이아웃을 보여주되, 각 탭 컴포넌트에서 자체 로딩 처리
  if (isLoading) {
    return (
      <ProjectLayout
        activeView={activeView}
        onViewChange={handleViewChange}
        projectName="로딩 중..."
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">프로젝트 정보를 불러오는 중...</p>
          </div>
        </div>
      </ProjectLayout>
    )
  }

  if (isError || !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center py-16 bg-white rounded-lg shadow-sm border">
            <div className="text-red-100 bg-red-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <ArrowLeft className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-red-600 mb-4">프로젝트 로딩 실패</h2>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed">
              {error?.message || '프로젝트를 찾을 수 없습니다.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={() => refetch()}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                다시 시도
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/projects')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                프로젝트 목록
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <ProjectLayout
        activeView={activeView}
        onViewChange={handleViewChange}
        projectName={project?.name}
      >
        {renderContent()}
      </ProjectLayout>
      
      
    </>
  )
}

export default ProjectDetailContent 