import React from 'react'
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface ProjectSearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function ProjectSearchBar({ value, onChange }: ProjectSearchBarProps) {
  return (
    <div className="relative mb-6 max-w-md">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        placeholder="프로젝트 검색..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  )
}