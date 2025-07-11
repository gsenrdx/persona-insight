'use client'

import { ReactNode, useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Navigation } from "@/components/shared/navigation"
import UserMenu from "@/components/auth/user-menu"
import CompanyBranding from "@/components/auth/company-branding"
import AuthGuard from "@/components/auth/auth-guard"
import { ProjectSidebar } from "@/components/project/project-sidebar"
import { cn } from "@/lib/utils"
import { Menu, X, ArrowLeft, Download, ChevronDown, FileText } from "lucide-react"

interface ProjectLayoutProps {
  children: ReactNode
  projectId?: string
  projectName?: string
  activeView: string
  onViewChange: (view: string) => void
  className?: string
  headerTitle?: string
  scriptSections?: any[]
  activeSection?: string | null
  onSectionClick?: (sectionName: string) => void
  insightSections?: any[]
  activeInsight?: number | null
  onInsightClick?: (insightIndex: number) => void
  hideSidebar?: boolean
  isInterviewDetail?: boolean
  interviewTitle?: string | null
  onBack?: () => void
  downloadHandlers?: {
    handleDownloadOriginal: () => void
    handleDownloadCleaned: () => void
  }
  canEditInterview?: boolean
  onEditInterview?: (() => void) | null
}

export function ProjectLayout({ 
  children, 
  projectName,
  activeView,
  onViewChange,
  className,
  scriptSections,
  activeSection,
  onSectionClick,
  insightSections,
  activeInsight,
  onInsightClick,
  hideSidebar = false,
  isInterviewDetail = false,
  interviewTitle = null,
  onBack,
  downloadHandlers
}: ProjectLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
  const downloadMenuRef = useRef<HTMLDivElement>(null)
  
  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setDownloadMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  return (
    <AuthGuard>
      <div className="min-h-screen flex bg-white">
        
        {/* 모바일 사이드바 오버레이 */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* 통합된 사이드바 (헤더 포함) */}
        <aside className={cn(
          "w-64 h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white flex flex-col z-50 shadow-2xl relative overflow-hidden",
          "fixed top-0 left-0",
          hideSidebar ? "-translate-x-full" : sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          {/* 장식용 배경 요소 - 브랜드 일관성 */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-300/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-400/15 rounded-full blur-2xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/10 pointer-events-none" />
          {/* 로고 영역 */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-white/15 relative z-10 bg-white/5 backdrop-blur-sm">
            <Link href="/" className="flex-1 block">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white drop-shadow-sm">Persona Insight</h2>
                <CompanyBranding className="text-blue-100/80 text-xs" />
              </div>
            </Link>
            <button
              className="lg:hidden p-2 hover:bg-white/15 rounded-xl transition-all duration-200 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          {/* 프로젝트 정보 및 네비게이션 */}
          <ProjectSidebar 
            activeView={activeView}
            onViewChange={(view) => {
              onViewChange(view)
              setSidebarOpen(false)
            }}
            projectName={projectName}
            className="flex-1 relative z-10"
            scriptSections={scriptSections}
            activeSection={activeSection}
            onSectionClick={(sectionName) => {
              onSectionClick?.(sectionName)
            }}
            insightSections={insightSections}
            activeInsight={activeInsight}
            onInsightClick={(insightIndex) => {
              onInsightClick?.(insightIndex)
            }}
          />
        </aside>
        
        {/* 메인 콘텐츠 영역 */}
        <div className={cn(
          "flex-1 flex flex-col h-screen",
          hideSidebar ? "ml-0" : "lg:ml-64"
        )}>
          {/* 상단 헤더 바 */}
          <header className="h-16 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="h-full flex items-center justify-between px-4 lg:px-8">
              <div className="flex items-center gap-4">
                {isInterviewDetail ? (
                  <>
                    <button
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={onBack}
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-xl font-semibold text-gray-900">
                      {interviewTitle || '제목 없음'}
                    </h1>
                  </>
                ) : (
                  <>
                    <button
                      className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={() => setSidebarOpen(true)}
                    >
                      <Menu className="w-5 h-5 text-gray-600" />
                    </button>
                    {projectName && (
                      <h1 className="text-xl font-medium text-gray-900">
                        <span className="text-gray-600">{projectName}</span>
                        <span className="text-gray-400 mx-2">›</span>
                        <span className="font-semibold">
                          {activeView === 'interviews' && '인터뷰 관리'}
                          {activeView === 'insights' && '인사이트'}
                          {activeView === 'settings' && '설정'}
                        </span>
                      </h1>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                {isInterviewDetail && downloadHandlers && (
                  <div className="relative" ref={downloadMenuRef}>
                    <button
                      onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-800 transition-all"
                      title="다운로드"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">다운로드</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    
                    {downloadMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-10 overflow-hidden">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              downloadHandlers?.handleDownloadOriginal?.()
                              setDownloadMenuOpen(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                          >
                            <FileText className="w-4 h-4 text-gray-400" />
                            원본 인터뷰
                          </button>
                          <button
                            onClick={() => {
                              downloadHandlers?.handleDownloadCleaned?.()
                              setDownloadMenuOpen(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                          >
                            <Download className="w-4 h-4 text-gray-400" />
                            정리된 스크립트
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {!isInterviewDetail && (
                  <>
                    <Navigation />
                    <UserMenu />
                  </>
                )}
              </div>
            </div>
          </header>
          
          {/* 콘텐츠 */}
          <main className={cn(
            "flex-1 overflow-y-auto flex flex-col min-h-0",
            isInterviewDetail ? "p-0" : "p-6 lg:p-8",
            className
          )}>
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}