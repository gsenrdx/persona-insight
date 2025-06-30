import React from 'react'
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ProjectWithMembership } from '@/types'
import { ProjectCard } from '../components/project-card'

interface ProjectGridProps {
  projects: ProjectWithMembership[]
  searchQuery: string
  onEditProject: (project: ProjectWithMembership) => void
  onInviteProject: (project: ProjectWithMembership) => void
  onSelectProject: (project: ProjectWithMembership) => void
  onCreateProject: () => void
}

export function ProjectGrid({
  projects,
  searchQuery,
  onEditProject,
  onInviteProject,
  onSelectProject,
  onCreateProject
}: ProjectGridProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-20">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {searchQuery ? '검색 결과가 없습니다' : '프로젝트가 없습니다'}
        </h3>
        <p className="text-gray-500 mb-6">
          {searchQuery ? '다른 검색어를 시도해보세요' : '첫 번째 프로젝트를 생성해보세요'}
        </p>
        {!searchQuery && (
          <Button onClick={onCreateProject}>
            <Plus className="h-4 w-4 mr-2" />
            새 프로젝트
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onEdit={onEditProject}
          onInvite={onInviteProject}
          onSelect={onSelectProject}
        />
      ))}
    </div>
  )
}