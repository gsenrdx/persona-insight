"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { parseMentions, type ParsedMention } from "@/lib/utils/mention"

interface MessageContentProps {
  content: string
  className?: string
}

export function MessageContent({ content, className = "" }: MessageContentProps) {
  const parsedContent = useMemo(() => {
    return parseMentions(content)
  }, [content])

  const renderMention = (mention: ParsedMention, index: number) => {
    if (mention.type === 'text') {
      return <span key={index}>{mention.content}</span>
    }

    return (
      <span
        key={index}
        className="inline-flex items-center font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/30 px-1.5 py-0.5 rounded-md text-sm transition-colors"
      >
        {mention.content}
      </span>
    )
  }

  return (
    <span className={className}>
      {parsedContent.map((part, index) => renderMention(part, index))}
    </span>
  )
}