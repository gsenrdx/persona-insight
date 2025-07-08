'use client'

import { FileText, BarChart3, Settings, ArrowLeft } from "lucide-react"
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'

interface ProjectSidebarProps {
  activeView: string
  onViewChange: (view: string) => void
  projectName?: string
  className?: string
  scriptSections?: any[]
  activeSection?: string | null
  onSectionClick?: (sectionName: string) => void
  insightSections?: any[]
  activeInsight?: number | null
  onInsightClick?: (insightIndex: number) => void
}

const navigationItems = [
  {
    id: 'interviews',
    label: '인터뷰',
    icon: FileText,
    description: '인터뷰 목록 및 분석'
  },
  {
    id: 'insights',
    label: '인사이트',
    icon: BarChart3,
    description: '프로젝트 인사이트'
  },
  {
    id: 'settings',
    label: '설정',
    icon: Settings,
    description: '프로젝트 설정'
  }
]

export function ProjectSidebar({ activeView, onViewChange, projectName, className, scriptSections, activeSection, onSectionClick, insightSections, activeInsight, onInsightClick }: ProjectSidebarProps) {
  const router = useRouter()
  const navigationContainerRef = useRef<HTMLDivElement>(null)
  const activeButtonRef = useRef<HTMLButtonElement>(null)
  const insightNavigationRef = useRef<HTMLDivElement>(null)
  const activeInsightButtonRef = useRef<HTMLButtonElement>(null)
  
  // 활성 섹션이 변경될 때 스크롤
  useEffect(() => {
    if (activeButtonRef.current && navigationContainerRef.current) {
      const container = navigationContainerRef.current
      const button = activeButtonRef.current
      
      const buttonRect = button.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      
      // 버튼이 컨테이너 밖에 있으면 스크롤
      if (buttonRect.top < containerRect.top || buttonRect.bottom > containerRect.bottom) {
        button.scrollIntoView({ behavior: 'auto', block: 'center' })
      }
    }
  }, [activeSection])
  
  // 활성 인사이트가 변경될 때 스크롤
  useEffect(() => {
    if (activeInsightButtonRef.current && insightNavigationRef.current) {
      const container = insightNavigationRef.current
      const button = activeInsightButtonRef.current
      
      const buttonRect = button.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      
      // 버튼이 컨테이너 밖에 있으면 스크롤
      if (buttonRect.top < containerRect.top || buttonRect.bottom > containerRect.bottom) {
        button.scrollIntoView({ behavior: 'auto', block: 'center' })
      }
    }
  }, [activeInsight])
  
  return (
    <div className={cn("flex flex-col", className)}>
      {/* 프로젝트 헤더 */}
      <div className="px-6 py-5 border-b border-white/15">
        <button
          onClick={() => router.push('/projects')}
          className="flex items-center gap-3 text-sm text-white font-semibold hover:bg-white/10 transition-all duration-200 group px-3 py-2 rounded-xl backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4 text-white/80 group-hover:text-white transition-colors" />
          <span>프로젝트 목록</span>
        </button>
      </div>
      
      {/* 네비게이션 */}
      <nav className="flex-1 p-5 space-y-2">
        {navigationItems.map((item) => {
          const isActive = activeView === item.id
          const Icon = item.icon
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative",
                isActive 
                  ? "bg-white/95 backdrop-blur-sm shadow-lg" 
                  : "hover:bg-white/10"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all relative z-10",
                isActive 
                  ? "bg-gradient-to-br from-blue-700 to-blue-800 shadow-md" 
                  : "bg-white/10 group-hover:bg-white/15 backdrop-blur-sm"
              )}>
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-white" : "text-white/90"
                )} />
              </div>
              <div className="flex-1 text-left relative z-10">
                <div className={cn(
                  "text-sm font-semibold transition-colors",
                  isActive ? "text-blue-700" : "text-white/95"
                )}>
                  {item.label}
                </div>
                <div className={cn(
                  "text-xs mt-0.5 transition-colors leading-relaxed",
                  isActive ? "text-gray-600" : "text-white/70"
                )}>
                  {item.description}
                </div>
              </div>
            </button>
          )
        })}
      </nav>
      
      {/* 네비게이션 - 인터뷰 상세 페이지에서만 표시 */}
      {activeView === 'interviews' && scriptSections && scriptSections.length > 0 && (
        <div className="border-t border-white/10 px-4 py-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">인터뷰 네비게이션</h3>
          <div ref={navigationContainerRef} className="space-y-0 max-h-96 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            {scriptSections
              .map((section: any, index: number) => {
                const isActive = activeSection === section.sector_name
                
                return (
                  <button
                    ref={isActive ? activeButtonRef : null}
                    key={section.sector_name}
                    onClick={() => {
                      onSectionClick?.(section.sector_name)
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs",
                      "flex items-center gap-3 group relative",
                      isActive 
                        ? "bg-white/95 backdrop-blur-sm" 
                        : "text-white hover:bg-white/10"
                    )}
                  >
                    <span className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 relative z-10",
                      isActive 
                        ? "bg-gradient-to-br from-blue-700 to-blue-800 text-white shadow-sm" 
                        : "bg-white/15 text-white/90"
                    )}>
                      {index + 1}
                    </span>
                    <span className={cn(
                      "flex-1 line-clamp-1 relative z-10",
                      isActive ? "font-medium text-blue-700" : ""
                    )}>
                      {section.sector_name}
                    </span>
                  </button>
                )
              })}
          </div>
        </div>
      )}
      
      {/* 네비게이션 - 인사이트 페이지에서만 표시 */}
      {activeView === 'insights' && insightSections && insightSections.length > 0 && (
        <div className="border-t border-white/15 px-5 py-4 bg-white/5">
          <h3 className="text-xs font-bold text-white/90 uppercase tracking-wider mb-3">인사이트 네비게이션</h3>
          <div ref={insightNavigationRef} className="space-y-1 max-h-96 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            {insightSections
              .map((insight: any, index: number) => {
                const isActive = activeInsight === insight.id
                
                return (
                  <button
                    ref={isActive ? activeInsightButtonRef : null}
                    key={insight.id}
                    onClick={() => {
                      onInsightClick?.(insight.id)
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs",
                      "flex items-center gap-3 group relative",
                      isActive 
                        ? "bg-white/95 backdrop-blur-sm" 
                        : "text-white hover:bg-white/10"
                    )}
                  >
                    <span className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 relative z-10",
                      isActive 
                        ? "bg-gradient-to-br from-blue-700 to-blue-800 text-white shadow-sm" 
                        : "bg-white/15 text-white/90"
                    )}>
                      {index + 1}
                    </span>
                    <span className={cn(
                      "flex-1 line-clamp-1 relative z-10",
                      isActive ? "font-medium text-blue-700" : ""
                    )}>
                      {insight.title}
                    </span>
                  </button>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}