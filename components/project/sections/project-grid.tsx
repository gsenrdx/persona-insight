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
  showJoinBadge?: boolean
}

export function ProjectGrid({
  projects,
  searchQuery,
  onEditProject,
  onInviteProject,
  onSelectProject,
  onCreateProject,
  showJoinBadge = false
}: ProjectGridProps) {

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {projects.map((project, index) => (
        <ProjectCard
          key={project.id}
          project={project}
          index={index}
          onEdit={onEditProject}
          onInvite={onInviteProject}
          onSelect={onSelectProject}
          showJoinBadge={showJoinBadge}
        />
      ))}
    </div>
  )
}