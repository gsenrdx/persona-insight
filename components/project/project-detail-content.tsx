'use client'

import { useState, useEffect } from 'react'
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Settings, FileText, BarChart3, Loader2 } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import UserMenu from "@/components/auth/user-menu"
import CompanyBranding from "@/components/auth/company-branding"
import { Navigation } from "@/components/shared"
import ProjectSettings from '@/components/project/project-settings'
import ProjectInterviews from '@/components/project/project-interviews'
import ProjectInsights from '@/components/project/project-insights'

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
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState('interviews')

  useEffect(() => {
    if (!profile?.id || !projectId) return
    fetchProject()
  }, [profile?.id, projectId])

  const fetchProject = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!profile?.id) {
        throw new Error('사용자 인증 정보가 없습니다')
      }

      const response = await fetch(`/api/supabase/projects/${projectId}?user_id=${profile.id}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '프로젝트를 불러올 수 없습니다')
      }
      
      const data = await response.json()
      setProject(data.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '프로젝트를 불러오는 중 오류가 발생했습니다'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleViewChange = (view: string) => {
    setActiveView(view)
  }

  const renderContent = () => {
    if (!project) return null

    switch (activeView) {
      case 'interviews':
        return <ProjectInterviews project={project} />
      case 'insights':
        return <ProjectInsights project={project} />
      case 'settings':
        return <ProjectSettings project={project} onProjectUpdate={setProject} />
      default:
        return <ProjectInterviews project={project} />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16 bg-slate-50 rounded-lg">
          <h2 className="text-xl font-semibold text-red-600 mb-4">오류 발생</h2>
          <p className="text-slate-600 mb-6">{error || '프로젝트를 찾을 수 없습니다.'}</p>
          <Button variant="outline" onClick={() => router.push('/projects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            프로젝트 목록으로 돌아가기
          </Button>
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
          style={{ pointerEvents: 'auto', zIndex: 100, position: 'relative' }}
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
            style={{ pointerEvents: 'auto', zIndex: 101, position: 'relative' }}
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