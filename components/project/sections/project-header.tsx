import React from 'react'
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface ProjectHeaderProps {
  projectCount: number
  onShowPersonaCriteria: () => void
  onCreateProject: () => void
}

export function ProjectHeader({ 
  projectCount, 
  onShowPersonaCriteria, 
  onCreateProject 
}: ProjectHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-2xl font-semibold text-gray-900">
        프로젝트 ({projectCount})
      </h1>
      <Button onClick={onCreateProject}>
        <Plus className="h-4 w-4 mr-2" />
        새 프로젝트
      </Button>
    </div>
  )
}