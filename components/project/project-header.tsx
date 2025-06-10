'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FolderOpen, ChevronDown } from 'lucide-react'
import { ProjectSelector } from '@/components/project'

export default function ProjectHeader() {
  const { profile } = useAuth()
  const [showProjectSelector, setShowProjectSelector] = useState(false)

  if (!profile?.current_project) {
    return (
      <>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">프로젝트:</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowProjectSelector(true)}
            className="h-7 px-3 text-xs border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
          >
            프로젝트 선택
          </Button>
        </div>

        <ProjectSelector 
          open={showProjectSelector} 
          onProjectSelected={() => setShowProjectSelector(false)}
          onClose={() => setShowProjectSelector(false)}
        />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-500 font-medium">프로젝트:</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowProjectSelector(true)}
          className="h-7 px-3 text-xs font-medium text-gray-700 hover:bg-gray-100 gap-1.5 max-w-[180px]"
        >
          <span className="truncate">{profile.current_project.name}</span>
          <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0" />
        </Button>
      </div>

      <ProjectSelector 
        open={showProjectSelector} 
        onProjectSelected={() => setShowProjectSelector(false)}
        onClose={() => setShowProjectSelector(false)}
      />
    </>
  )
} 