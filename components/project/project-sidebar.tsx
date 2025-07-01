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
      <div className="px-6 py-5 border-b border-white/10">
        <button
          onClick={() => router.push('/projects')}
          className="flex items-center gap-2 text-sm text-white font-bold hover:text-white/90 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
          <span>프로젝트 목록</span>
        </button>
      </div>
      
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
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
                isActive 
                  ? "bg-white shadow-lg" 
                  : "hover:bg-white/10"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                isActive 
                  ? "bg-blue-600" 
                  : "bg-white/10 group-hover:bg-white/15"
              )}>
                <Icon className={cn(
                  "w-4 h-4 transition-colors",
                  isActive ? "text-white" : "text-white/80"
                )} />
              </div>
              <div className="flex-1 text-left">
                <div className={cn(
                  "text-sm font-medium transition-colors",
                  isActive ? "text-blue-600" : "text-white/90"
                )}>
                  {item.label}
                </div>
                <div className={cn(
                  "text-xs mt-0.5 transition-colors",
                  isActive ? "text-gray-600" : "text-white/60"
                )}>
                  {item.description}
                </div>
              </div>
            </button>
          )
        })}
      </nav>
    </div>
  )
}