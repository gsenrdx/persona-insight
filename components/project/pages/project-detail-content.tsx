'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { useProject, useProjectMembers } from '@/hooks/use-projects'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ProjectWithMembership } from '@/types'
import ProjectSettings from '@/components/project/tabs/project-settings'
import { ProjectInterviews, ProjectInsights } from '@/components/project/tabs'
import { ProjectLayout } from '@/components/layout/project-layout'
import { AnimatePresence } from 'framer-motion'

interface ProjectDetailContentProps {
  projectId: string
}

export function ProjectDetailContent({ projectId }: ProjectDetailContentProps) {
  const { profile, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  
  // 캐시된 프로젝트 목록에서 해당 프로젝트를 먼저 찾음
  const cachedProject = profile?.company_id && profile?.id ? 
    queryClient.getQueryData<ProjectWithMembership[]>(
      queryKeys.projects.byCompanyAndUser(profile.company_id, profile.id)
    )?.find(p => p.id === projectId) : null
  
  // 캐시된 데이터가 있으면 즉시 사용, 없으면 API 호출
  const { data: apiProject, isLoading: projectLoading, error, isError, refetch, isInitialLoading } = useProject(projectId, {
    enabled: !cachedProject && !authLoading && !!projectId, // 캐시된 데이터가 없을 때만 API 호출
    initialData: cachedProject as any, // 캐시된 데이터를 초기 데이터로 사용
  })
  
  // 실제 사용할 프로젝트 데이터: 캐시된 데이터 우선, 없으면 API 데이터
  const project = cachedProject || apiProject
  
  // 멤버 정보는 필요시에만 로드 (캐시된 데이터에 member_count는 있음)
  const { data: members, isLoading: membersLoading } = useProjectMembers(projectId, {
    enabled: !authLoading && !!projectId, // 기본 조건은 유지
  })
  
  const [activeView, setActiveView] = useState(() => {
    const tabParam = searchParams.get('tab')
    return tabParam && ['interviews', 'insights', 'settings'].includes(tabParam) 
      ? tabParam 
      : 'interviews'
  })
  const [scriptSections, setScriptSections] = useState<any[] | null>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [scrollToSection, setScrollToSection] = useState<((sectionName: string) => void) | null>(null)
  
  // 인사이트 네비게이션을 위한 상태
  const [insightSections, setInsightSections] = useState<any[] | null>(null)
  const [activeInsight, setActiveInsight] = useState<number | null>(null)
  const [scrollToInsight, setScrollToInsight] = useState<((insightIndex: number) => void) | null>(null)
  
  // 선택된 인터뷰 제목
  const [selectedInterviewTitle, setSelectedInterviewTitle] = useState<string | null>(null)
  
  // 수정 버튼 정보
  const [editButtonInfo, setEditButtonInfo] = useState<{ canEdit: boolean; onClick: (() => void) | null }>({ 
    canEdit: false, 
    onClick: null 
  })
  
  // 다운로드 핸들러들
  const [downloadHandlers, setDownloadHandlers] = useState<{
    handleDownloadOriginal: () => void
    handleDownloadCleaned: () => void
  } | undefined>(undefined)
  
  // onDownloadMenuChange 콜백을 memoize하여 무한 루프 방지
  const handleDownloadMenuChange = useCallback((handlers: {
    handleDownloadOriginal: () => void
    handleDownloadCleaned: () => void
  } | undefined) => {
    setDownloadHandlers(handlers)
  }, [])
  
  // 전체 로딩 상태 - 캐시된 데이터가 있으면 로딩 상태 단축
  const isLoading = authLoading || (!cachedProject && (projectLoading || isInitialLoading)) || membersLoading

  // URL 쿼리 파라미터로부터 activeView 설정
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    const interviewParam = searchParams.get('interview')
    
    // interview 파라미터가 있으면 interviews 탭으로
    if (interviewParam) {
      setActiveView('interviews')
      // tab 파라미터가 있으면 제거 (interviews가 기본값)
      if (tabParam) {
        const url = new URL(window.location.href)
        url.searchParams.delete('tab')
        router.replace(url.pathname + url.search, { scroll: false })
      }
    } 
    // tab 파라미터가 있고 유효한 값이면 해당 탭으로
    else if (tabParam && ['interviews', 'insights', 'settings'].includes(tabParam)) {
      setActiveView(tabParam)
    }
    // tab 파라미터가 없으면 기본값 interviews (URL 업데이트 불필요)
    else if (!tabParam) {
      setActiveView('interviews')
    }
  }, [searchParams, router])


  const handleViewChange = (view: string) => {
    setActiveView(view)
    // URL 업데이트 
    const url = new URL(window.location.href)
    
    // interviews가 기본값이므로 URL을 깔끔하게 유지
    if (view === 'interviews') {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', view)
    }
    
    url.searchParams.delete('interview') // 인터뷰 상세 보기 파라미터 제거
    router.replace(url.pathname + url.search, { scroll: false })
  }

  // 스크립트 섹션 정보가 변경될 때
  const handleSectionsChange = (sections: any[] | null, active: string | null, scrollFn: ((sectionName: string) => void) | null) => {
    setScriptSections(sections)
    setActiveSection(active)
    setScrollToSection(() => scrollFn)
  }
  
  const handleInsightsChange = useCallback((insights: any[] | null, activeInsight: number | null, scrollToInsight: ((insightIndex: number) => void) | null) => {
    setInsightSections(insights)
    setActiveInsight(activeInsight)
    setScrollToInsight(() => scrollToInsight)
  }, [])

  const getHeaderTitle = () => {
    switch (activeView) {
      case 'interviews':
        return '인터뷰 관리'
      case 'insights':
        return '인사이트'
      case 'settings':
        return '프로젝트 설정'
      default:
        return '인터뷰 관리'
    }
  }

  const renderContent = () => {
    if (!project) return null

    const interviewParam = searchParams.get('interview')

    switch (activeView) {
      case 'interviews':
        // Polling 버전 사용 (더 안정적)
        return <ProjectInterviews 
          key="interviews" 
          project={project} 
          selectedInterviewId={interviewParam} 
          onSectionsChange={handleSectionsChange}
          onInterviewSelect={(title) => setSelectedInterviewTitle(title)}
          onEditButtonInfo={(canEdit, onClick) => setEditButtonInfo({ canEdit, onClick })}
          onDownloadMenuChange={handleDownloadMenuChange}
        />
      case 'insights':
        return <ProjectInsights key="insights" project={project} onInsightsChange={handleInsightsChange} />
      case 'settings':
        return <ProjectSettings key="settings" project={project} onProjectUpdate={() => refetch()} />
      default:
        return <ProjectInterviews 
          key="interviews" 
          project={project} 
          selectedInterviewId={interviewParam} 
          onSectionsChange={handleSectionsChange}
          onInterviewSelect={(title) => setSelectedInterviewTitle(title)}
          onEditButtonInfo={(canEdit, onClick) => setEditButtonInfo({ canEdit, onClick })}
          onDownloadMenuChange={handleDownloadMenuChange}
        />
    }
  }

  // 로딩 중에도 기본 레이아웃을 보여주되, 각 탭 컴포넌트에서 자체 로딩 처리
  if (isLoading) {
    return (
      <ProjectLayout
        projectId={projectId}
        activeView={activeView}
        onViewChange={handleViewChange}
        projectName="로딩 중..."
        downloadHandlers={downloadHandlers}
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

  // 인증이 아직 진행 중이면 로딩 표시
  if (authLoading || !user) {
    return (
      <ProjectLayout
        projectId={projectId}
        activeView={activeView}
        onViewChange={handleViewChange}
        projectName="로딩 중..."
        downloadHandlers={downloadHandlers}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">인증 확인 중...</p>
          </div>
        </div>
      </ProjectLayout>
    )
  }

  if (isError && !isLoading && !project) {
    return (
      <ProjectLayout
        projectId={projectId}
        activeView={activeView}
        onViewChange={handleViewChange}
        projectName="프로젝트 오류"
        downloadHandlers={downloadHandlers}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
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
      </ProjectLayout>
    )
  }

  // 인터뷰 상세 보기 여부 확인
  const interviewParam = searchParams.get('interview')
  const isViewingInterviewDetail = activeView === 'interviews' && !!interviewParam

  return (
    <>
      <ProjectLayout
        projectId={projectId}
        activeView={activeView}
        onViewChange={handleViewChange}
        projectName={project?.name}
        headerTitle={getHeaderTitle()}
        scriptSections={activeView === 'interviews' ? scriptSections : null}
        activeSection={activeView === 'interviews' ? activeSection : null}
        onSectionClick={activeView === 'interviews' ? scrollToSection : null}
        insightSections={activeView === 'insights' ? insightSections : null}
        activeInsight={activeView === 'insights' ? activeInsight : null}
        onInsightClick={activeView === 'insights' ? scrollToInsight : null}
        hideSidebar={isViewingInterviewDetail}
        isInterviewDetail={isViewingInterviewDetail}
        interviewTitle={selectedInterviewTitle}
        onBack={() => {
          const url = new URL(window.location.href)
          url.searchParams.delete('interview')
          // interviews가 기본값이므로 다른 탭일 때만 파라미터 설정
          if (activeView === 'interviews') {
            url.searchParams.delete('tab')
          } else {
            url.searchParams.set('tab', activeView)
          }
          router.push(url.pathname + url.search, { scroll: false })
        }}
        canEditInterview={editButtonInfo.canEdit}
        onEditInterview={editButtonInfo.onClick}
        downloadHandlers={downloadHandlers}
      >
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </ProjectLayout>
    </>
  )
}

export default ProjectDetailContent 