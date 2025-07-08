'use client'

import { memo } from 'react'
import { CleanedScriptItem } from '@/types/interview'
import { cn } from '@/lib/utils'

interface ReadOnlyScriptItemProps {
  script: CleanedScriptItem
  className?: string
}

export const ReadOnlyScriptItem = memo(({ 
  script, 
  className 
}: ReadOnlyScriptItemProps) => {
  const scriptId = script.id.join('-')
  const isQuestion = script.speaker === 'question'
  
  // 카테고리별 스타일
  const getCategoryStyle = () => {
    switch (script.category) {
      case 'painpoint':
        return 'bg-red-50 border-red-200 hover:bg-red-100'
      case 'needs':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100'
      default:
        return isQuestion 
          ? 'bg-gray-50 border-gray-200 hover:bg-gray-100' 
          : 'bg-white border-gray-200 hover:bg-gray-50'
    }
  }
  
  return (
    <div
      id={`script-${scriptId}`}
      className={cn(
        "group relative px-4 py-3 rounded-lg border transition-all duration-200",
        getCategoryStyle(),
        className
      )}
    >
      {/* 스피커 라벨 */}
      <div className="flex items-center gap-2 mb-1">
        <span className={cn(
          "text-xs font-medium",
          isQuestion ? "text-gray-600" : "text-blue-600"
        )}>
          {isQuestion ? '질문' : '답변'}
        </span>
        
        {/* 카테고리 배지 */}
        {script.category && (
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            script.category === 'painpoint' 
              ? "bg-red-100 text-red-700"
              : "bg-blue-100 text-blue-700"
          )}>
            {script.category === 'painpoint' ? '페인포인트' : '니즈'}
          </span>
        )}
        
        {/* 스크립트 ID (디버그용) */}
        {process.env.NODE_ENV === 'development' && (
          <span className="text-xs text-gray-400">
            #{scriptId}
          </span>
        )}
      </div>
      
      {/* 스크립트 내용 */}
      <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
        {script.cleaned_sentence}
      </div>
    </div>
  )
})

ReadOnlyScriptItem.displayName = 'ReadOnlyScriptItem'