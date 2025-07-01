'use client'

import { ReactNode, useState } from "react"
import Link from "next/link"
import { Navigation } from "@/components/shared"
import UserMenu from "@/components/auth/user-menu"
import CompanyBranding from "@/components/auth/company-branding"
import AuthGuard from "@/components/auth/auth-guard"
import { ProjectSidebar } from "@/components/project/project-sidebar"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"

interface ProjectLayoutProps {
  children: ReactNode
  projectName?: string
  activeView: string
  onViewChange: (view: string) => void
  className?: string
  headerTitle?: string
}

export function ProjectLayout({ 
  children, 
  projectName,
  activeView,
  onViewChange,
  className,
  headerTitle
}: ProjectLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
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
          "w-64 h-screen bg-blue-600 text-white flex flex-col transition-transform duration-200 z-50 shadow-lg relative overflow-hidden",
          "fixed top-0 left-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          {/* 깔끔한 그라데이션 오버레이 */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-black/10 pointer-events-none" />
          {/* 로고 영역 */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-white/10 relative z-10">
            <Link href="/" className="flex-1 block">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white">Persona Insight</h2>
                <CompanyBranding className="text-blue-100 text-xs" />
              </div>
            </Link>
            <button
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
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
          />
        </aside>
        
        {/* 메인 콘텐츠 영역 */}
        <div className="flex-1 flex flex-col lg:ml-64">
          {/* 상단 헤더 바 */}
          <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="h-full flex items-center justify-between px-4 lg:px-8">
              <div className="flex items-center gap-4">
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
              </div>
              <div className="flex items-center gap-3">
                <Navigation />
                <UserMenu />
              </div>
            </div>
          </header>
          
          {/* 콘텐츠 */}
          <main className={cn(
            "flex-1 p-6 lg:p-8 overflow-auto",
            className
          )}>
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}