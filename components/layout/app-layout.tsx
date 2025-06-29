'use client'

import Link from "next/link"
import { ReactNode } from "react"
import { Navigation } from "@/components/shared"
import UserMenu from "@/components/auth/user-menu"
import CompanyBranding from "@/components/auth/company-branding"
import AuthGuard from "@/components/auth/auth-guard"
import { cn } from "@/lib/utils"

interface AppLayoutProps {
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function AppLayout({ 
  children, 
  className,
  contentClassName
}: AppLayoutProps) {
  return (
    <AuthGuard>
      <div className={cn("relative min-h-screen bg-gradient-to-b from-background to-muted/20 overflow-hidden", className)}>
        {/* 배경 장식 요소 - 메인 페이지 스타일 */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
        <div className="absolute top-20 -left-96 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 -right-96 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />

        {/* 공통 헤더 */}
        <header className="container mx-auto px-4 py-8 relative z-10">
          <div className="flex justify-between items-center">
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
        </header>

        {/* 콘텐츠 영역 */}
        <main className={cn("relative z-10", contentClassName)}>
          {children}
        </main>
      </div>
    </AuthGuard>
  )
}