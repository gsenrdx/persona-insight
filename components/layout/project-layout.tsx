'use client'

import { ReactNode } from "react"
import Link from "next/link"
import { Navigation } from "@/components/shared"
import UserMenu from "@/components/auth/user-menu"
import CompanyBranding from "@/components/auth/company-branding"
import AuthGuard from "@/components/auth/auth-guard"
import { ProjectSidebar } from "@/components/project/project-sidebar"
import { cn } from "@/lib/utils"

interface ProjectLayoutProps {
  children: ReactNode
  projectName?: string
  activeView: string
  onViewChange: (view: string) => void
  className?: string
}

export function ProjectLayout({ 
  children, 
  projectName,
  activeView,
  onViewChange,
  className
}: ProjectLayoutProps) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* 배경 장식 요소 */}
        <div className="fixed inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
        <div className="fixed top-20 -left-96 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="fixed top-1/2 -right-96 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        
        {/* 헤더 */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50">
          <div className="container mx-auto px-4">
            <div className="h-16 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex items-baseline">
                  <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Persona Insight</h2>
                  <CompanyBranding />
                </div>
              </Link>
              <div className="flex items-center gap-3">
                <Navigation />
                <UserMenu />
              </div>
            </div>
          </div>
        </header>
        
        {/* 메인 콘텐츠 */}
        <div className="flex relative">
          {/* 사이드바 */}
          <ProjectSidebar 
            activeView={activeView}
            onViewChange={onViewChange}
            projectName={projectName}
          />
          
          {/* 콘텐츠 영역 */}
          <main className={cn(
            "flex-1 min-h-[calc(100vh-4rem)] p-8",
            className
          )}>
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}