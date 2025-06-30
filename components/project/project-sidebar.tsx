'use client'

import { FileText, BarChart3, Settings, ArrowLeft } from "lucide-react"
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface ProjectSidebarProps {
  activeView: string
  onViewChange: (view: string) => void
  projectName?: string
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

export function ProjectSidebar({ activeView, onViewChange, projectName }: ProjectSidebarProps) {
  const router = useRouter()
  
  return (
    <aside className="w-64 min-h-[calc(100vh-4rem)] bg-white/50 backdrop-blur-sm border-r border-gray-200/50 sticky top-16">
      {/* 프로젝트 헤더 */}
      {projectName && (
        <div className="p-6 border-b border-gray-200/30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/projects')}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="프로젝트 목록으로"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 truncate">{projectName}</h2>
              <p className="text-sm text-gray-500">프로젝트 관리</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 네비게이션 */}
      <nav className="p-3">
        {navigationItems.map((item) => {
          const isActive = activeView === item.id
          const Icon = item.icon
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 mb-1 rounded-xl group relative",
                isActive 
                  ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm" 
                  : "hover:bg-gray-50 text-gray-600 hover:text-gray-900"
              )}
            >
              <div className="flex items-center gap-3 relative z-10">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  isActive ? "bg-primary/10" : "bg-gray-100 group-hover:bg-gray-200"
                )}>
                  <Icon className={cn(
                    "w-5 h-5",
                    isActive ? "text-primary" : "text-gray-500 group-hover:text-gray-700"
                  )} />
                </div>
                <div className="text-left">
                  <div className={cn(
                    "text-sm font-semibold",
                    isActive ? "text-gray-900" : "text-gray-700"
                  )}>
                    {item.label}
                  </div>
                  <div className={cn(
                    "text-xs",
                    isActive ? "text-primary/70" : "text-gray-500"
                  )}>
                    {item.description}
                  </div>
                </div>
              </div>
              
              {isActive && (
                <div className="absolute inset-0 border-2 border-primary/20 rounded-xl" />
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}