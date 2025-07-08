import React from 'react'
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"

interface ProjectSearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function ProjectSearchBar({ value, onChange }: ProjectSearchBarProps) {
  return (
    <div className="relative mb-8 max-w-lg">
      <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-600 pointer-events-none" />
      <Input
        placeholder="프로젝트 이름 또는 설명으로 검색..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-10 py-2.5 text-sm bg-white border border-gray-300 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
      />
      {value && (
        <button
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => onChange('')}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}