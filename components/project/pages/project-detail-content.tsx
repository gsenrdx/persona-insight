'use client'

import { useState, useEffect, useRef } from 'react'
import Link from "next/link"
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Settings, FileText, BarChart3, Loader2, Shield, ChevronUp } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { useProject } from '@/hooks/use-projects'
import { toast } from 'sonner'
import UserMenu from "@/components/auth/user-menu"
import CompanyBranding from "@/components/auth/company-branding"
import { Navigation } from "@/components/shared"
import ProjectSettings from '@/components/project/tabs/project-settings'
import ProjectInterviews from '@/components/project/tabs/project-interviews-new'
import ProjectInsights from '@/components/project/tabs/project-insights'
import { MaskingTest } from '@/components/test/masking-test'
import { cn } from '@/lib/utils'

interface ProjectDetailContentProps {
  projectId: string
}


const NavLink = ({ active, onClick, icon: Icon, children }: any) => (
  <button
    onClick={(e) => {
      e.preventDefault()
      e.stopPropagation()
      onClick()
    }}
    className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all duration-200 cursor-pointer border-2 ${
      active
        ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-200 border-transparent"
    }`}
    style={{ 
      userSelect: 'none',
      zIndex: 1000,
      position: 'relative',
      pointerEvents: 'auto',
      touchAction: 'manipulation'
    }}
  >
    <Icon className="w-5 h-5 flex-shrink-0" style={{ pointerEvents: 'none' }} />
    <span className="text-sm font-medium" style={{ pointerEvents: 'none' }}>{children}</span>
  </button>
)

export function ProjectDetailContent({ projectId }: ProjectDetailContentProps) {
  const { profile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: project, isLoading, error, isError, refetch } = useProject(projectId)
  const [activeView, setActiveView] = useState('interviews')
  const [showScrollTop, setShowScrollTop] = useState(false)

  // URL 쿼리 파라미터로부터 activeView 설정
  useEffect(() => {
    const interviewParam = searchParams.get('interview')
    if (interviewParam) {
      setActiveView('interviews')
    }
  }, [searchParams])

  // 스크롤 이벤트 핸들러
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleViewChange = (view: string) => {
    setActiveView(view)
    // URL 업데이트 (interview 쿼리 파라미터 제거)
    const url = new URL(window.location.href)
    url.searchParams.delete('interview')
    router.replace(url.pathname + url.search, { scroll: false })
  }

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
      <div className="min-h-screen bg-slate-50/50">
        {/* 헤더 스켈레톤 */}
        <header className="bg-white border-b border-slate-200">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* 사이드바 스켈레톤 */}
          <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)]">
            <div className="p-4 border-b border-slate-200">
              <Skeleton className="h-9 w-32" />
            </div>
            <nav className="p-4">
              <div className="space-y-1">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </nav>
          </aside>

          {/* 메인 콘텐츠 스켈레톤 */}
          <main className="flex-1 bg-white">
            <div className="p-6">
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-sm text-slate-600">프로젝트 정보를 불러오는 중...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
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
    <div className="min-h-screen bg-slate-50/50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
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
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside 
          className="w-64 bg-white border-r border-slate-200 fixed left-0 top-[73px] h-[calc(100vh-73px)] overflow-y-auto"
          style={{ pointerEvents: 'auto', zIndex: 10 }}
        >
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/projects')}
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full px-3 py-1.5"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                목록 돌아가기
              </Button>
            </div>
          </div>
          <nav 
            className="p-4"
            style={{ pointerEvents: 'auto', zIndex: 11, position: 'relative' }}
          >
            <div className="space-y-1">
              <NavLink 
                active={activeView === 'interviews'} 
                onClick={() => handleViewChange('interviews')} 
                icon={FileText}
              >
                인터뷰 관리
              </NavLink>
              
              <NavLink 
                active={activeView === 'insights'} 
                onClick={() => handleViewChange('insights')} 
                icon={BarChart3}
              >
                인사이트 분석
              </NavLink>
              
              <NavLink 
                active={activeView === 'settings'} 
                onClick={() => handleViewChange('settings')} 
                icon={Settings}
              >
                프로젝트 설정
              </NavLink>
              
              <NavLink 
                active={activeView === 'masking-test'} 
                onClick={() => handleViewChange('masking-test')} 
                icon={Shield}
              >
                마스킹 테스트
              </NavLink>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-white ml-64">
          <div className="p-6 h-full">
            {renderContent()}
          </div>
        </main>
      </div>
      
      {/* 맨 위로 이동 버튼 */}
      <button
        onClick={scrollToTop}
        className={cn(
          "fixed bottom-8 right-8 p-3 bg-white rounded-full shadow-lg border border-gray-200",
          "hover:shadow-xl hover:border-gray-300 transition-all duration-200",
          "flex items-center justify-center z-50",
          showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
        aria-label="맨 위로 이동"
      >
        <ChevronUp className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  )
}

export default ProjectDetailContent 