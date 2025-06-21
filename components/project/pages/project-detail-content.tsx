'use client'

import { useState, useEffect } from 'react'
import Link from "next/link"
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Settings, FileText, BarChart3, Loader2 } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import UserMenu from "@/components/auth/user-menu"
import CompanyBranding from "@/components/auth/company-branding"
import { Navigation } from "@/components/shared"
import ProjectSettings from '@/components/project/tabs/project-settings'
import ProjectInterviews from '@/components/project/tabs/project-interviews'
import ProjectInsights from '@/components/project/tabs/project-insights'

interface ProjectDetailContentProps {
  projectId: string
}

interface Project {
  id: string
  name: string
  description: string
  company_id: string
  created_by: string
  visibility: 'public' | 'private'
  join_method: 'open' | 'invite_only' | 'password'
  created_at: string
  member_count?: number
  interview_count?: number
  persona_count?: number
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
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState('interviews')
  const [retryCount, setRetryCount] = useState(0)

  // URL 쿼리 파라미터로부터 activeView 설정
  useEffect(() => {
    const interviewParam = searchParams.get('interview')
    if (interviewParam) {
      setActiveView('interviews')
    }
  }, [searchParams])

  useEffect(() => {
    if (!projectId) {
      setError('프로젝트 ID가 없습니다')
      setLoading(false)
      return
    }
    
    if (!profile?.id) {
      // 프로필이 로딩 중일 수 있으므로 잠시 기다림
      const timer = setTimeout(() => {
        if (!profile?.id) {
          setError('사용자 인증 정보가 없습니다. 다시 로그인해주세요.')
          setLoading(false)
        }
      }, 5000) // 5초 후 타임아웃
      
      return () => clearTimeout(timer)
    }
    
    fetchProject()
    return undefined
  }, [profile?.id, projectId])

  const fetchProject = async (isRetry = false) => {
    try {
      setLoading(true)
      if (!isRetry) {
        setError(null)
      }

      if (!profile?.id) {
        throw new Error('사용자 인증 정보가 없습니다')
      }


      // 타임아웃이 있는 fetch 함수
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15초 타임아웃

      const response = await fetch(`/api/projects/${projectId}?user_id=${profile.id}&t=${Date.now()}`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // 403 에러인 경우 권한 문제
        if (response.status === 403) {
          throw new Error('프로젝트에 접근할 권한이 없습니다')
        }
        
        throw new Error(errorData.error || `서버 오류 (${response.status})`)
      }
      
      const { data, success, error } = await response.json()
      
      if (!success) {
        throw new Error(error || '알 수 없는 오류가 발생했습니다')
      }
      
      if (!data) {
        throw new Error('프로젝트 데이터가 없습니다')
      }
      
      setProject(data)
      setRetryCount(0) // 성공 시 재시도 카운트 리셋
    } catch (err) {
      
      if (err instanceof Error && err.name === 'AbortError') {
        setError('요청 시간이 초과되었습니다. 다시 시도해주세요.')
      } else {
        const errorMessage = err instanceof Error ? err.message : '프로젝트를 불러오는 중 오류가 발생했습니다'
        setError(errorMessage)
        
        // 자동 재시도 (최대 2번)
        if (retryCount < 2 && !isRetry) {
          setRetryCount(prev => prev + 1)
          setTimeout(() => fetchProject(true), 2000 + retryCount * 1000) // 점진적 지연
          return
        }
      }
    } finally {
      setLoading(false)
    }
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
        return <ProjectSettings project={project} onProjectUpdate={setProject} />
      default:
        return <ProjectInterviews project={project} selectedInterviewId={interviewParam} />
    }
  }

  // 로딩 중에도 기본 레이아웃을 보여주되, 각 탭 컴포넌트에서 자체 로딩 처리
  if (loading) {
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

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center py-16 bg-white rounded-lg shadow-sm border">
            <div className="text-red-100 bg-red-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <ArrowLeft className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-red-600 mb-4">프로젝트 로딩 실패</h2>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed">
              {error || '프로젝트를 찾을 수 없습니다.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={() => {
                  setError(null)
                  setRetryCount(0)
                  fetchProject()
                }}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
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
      <header className="bg-white border-b border-slate-200">
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
          className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)]"
          style={{ pointerEvents: 'auto', zIndex: 10, position: 'relative' }}
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
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-white">
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

export default ProjectDetailContent 