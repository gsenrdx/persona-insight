import React from 'react'
import { Button } from "@/components/ui/button"
import { Plus, LayoutGrid } from "lucide-react"
import { motion } from 'framer-motion'

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
    <motion.div 
      className="flex justify-between items-center mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <LayoutGrid className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            프로젝트
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            총 {projectCount}개의 프로젝트가 있습니다
          </p>
        </div>
      </div>
      <Button 
        onClick={onCreateProject}
        size="lg"
        className="shadow-sm hover:shadow-md transition-shadow"
      >
        <Plus className="h-5 w-5 mr-2" />
        새 프로젝트
      </Button>
    </motion.div>
  )
}