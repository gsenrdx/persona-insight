"use client"

import { useMemo } from "react"
import { parseMentions } from "@/lib/utils/mention"

interface CleanInputOverlayProps {
  content: string
  className?: string
}

export function CleanInputOverlay({ content, className = "" }: CleanInputOverlayProps) {
  const cleanedContent = useMemo(() => {
    const parsed = parseMentions(content)
    return parsed.map(part => {
      if (part.type === 'text') {
        return part.content
      }
      // 멘션 부분은 공백으로 대체 (길이 유지)
      return ' '.repeat(part.content.length)
    }).join('')
  }, [content])

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      <div className="w-full min-h-[40px] max-h-[200px] resize-none p-0 text-[15px] leading-relaxed whitespace-pre-wrap break-words overflow-auto">
        {cleanedContent}
      </div>
    </div>
  )
}