"use client"

import { useMemo } from "react"
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
      // Handle line breaks and formatting in text content
      return (
        <span key={index}>
          {mention.content.split('\n').map((line, lineIndex) => {
            // Handle bullet points
            if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
              return (
                <div key={lineIndex} className="flex gap-2 mb-1">
                  <span className="text-xs mt-1">•</span>
                  <span className="flex-1">{line.replace(/^[*-]\s*/, '')}</span>
                </div>
              )
            }
            // Handle numbered lists
            if (line.match(/^\d+\./)) {
              return (
                <div key={lineIndex} className="flex gap-2 mb-1">
                  <span className="text-xs">{line.match(/^\d+\./)![0]}</span>
                  <span className="flex-1">{line.replace(/^\d+\.\s*/, '')}</span>
                </div>
              )
            }
            // Regular text
            return line ? <p key={lineIndex} className="mb-1">{line}</p> : <br key={lineIndex} />
          })}
        </span>
      )
    }

    return (
      <span
        key={index}
        className="inline-flex items-center font-semibold text-blue-600 bg-blue-50/80 px-1.5 py-0.5 rounded-md text-sm transition-colors"
      >
        {mention.content}
      </span>
    )
  }

  return (
    <div className={className}>
      {parsedContent.map((part, index) => renderMention(part, index))}
    </div>
  )
}