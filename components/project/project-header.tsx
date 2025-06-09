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
    return null
  }

  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">프로젝트:</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowProjectSelector(true)}
          className="h-auto p-1 text-foreground hover:bg-accent/50 font-medium"
        >
          {profile.current_project.name}
          <ChevronDown className="h-3 w-3 ml-1" />
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