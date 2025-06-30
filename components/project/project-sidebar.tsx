'use client'

import { FileText, BarChart3, Settings, ArrowLeft } from "lucide-react"
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface ProjectSidebarProps {
  activeView: string
  onViewChange: (view: string) => void
  projectName?: string
  className?: string
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

export function ProjectSidebar({ activeView, onViewChange, projectName, className }: ProjectSidebarProps) {
  const router = useRouter()
  
  return (
    <div className={cn("flex flex-col", className)}>
      {/* 프로젝트 헤더 */}
      {projectName && (
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/projects')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
              title="프로젝트 목록으로"
            >
              <ArrowLeft className="w-4 h-4 text-white/70 group-hover:text-white" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-white truncate">{projectName}</h2>
              <p className="text-xs text-blue-100/70 mt-0.5">프로젝트 관리</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 네비게이션 */}
      <nav className="flex-1 p-4 space-y-1">
        {navigationItems.map((item) => {
          const isActive = activeView === item.id
          const Icon = item.icon
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive 
                  ? "bg-white/20 backdrop-blur-sm shadow-sm" 
                  : "hover:bg-white/10"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                isActive 
                  ? "bg-white/25" 
                  : "bg-white/10 group-hover:bg-white/15"
              )}>
                <Icon className={cn(
                  "w-4 h-4",
                  isActive ? "text-white" : "text-white/80"
                )} />
              </div>
              <div className="flex-1 text-left">
                <div className={cn(
                  "text-sm font-medium",
                  isActive ? "text-white" : "text-white/90"
                )}>
                  {item.label}
                </div>
                <div className={cn(
                  "text-xs mt-0.5",
                  isActive ? "text-white/80" : "text-white/60"
                )}>
                  {item.description}
                </div>
              </div>
              
              {isActive && (
                <div className="w-1 h-8 bg-white/40 rounded-full ml-auto" />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}