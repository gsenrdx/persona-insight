import React from 'react'
import { Button } from "@/components/ui/button"
import { Users, Plus } from "lucide-react"

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
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          프로젝트 목록 ({projectCount})
        </h1>
        <p className="text-slate-600">팀과 함께 고객 인사이트를 발견하고 공유하세요</p>
      </div>
      <div className="flex gap-3">
        <Button 
          className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm font-medium text-sm px-4 py-2 h-9"
          onClick={onShowPersonaCriteria}
        >
          <Users className="h-3.5 w-3.5 mr-1.5" />
          페르소나 분류 기준
        </Button>
        <Button 
          onClick={onCreateProject} 
          className="bg-blue-500 hover:bg-blue-600 text-white shadow-sm font-medium text-sm px-4 py-2 h-9"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          새 프로젝트
        </Button>
      </div>
    </div>
  )
}