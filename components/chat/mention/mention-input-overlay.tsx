"use client"

import { useMemo, useRef, useEffect } from "react"
import { parseMentions, type ParsedMention } from "@/lib/utils/mention"

interface MentionInputOverlayProps {
  content: string
  className?: string
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>
}

export function MentionInputOverlay({ content, className = "", textareaRef }: MentionInputOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  
  const parsedContent = useMemo(() => {
    return parseMentions(content)
  }, [content])

  // 스크롤 및 높이 동기화
  useEffect(() => {
    if (!textareaRef?.current || !overlayRef.current) return
    
    const textarea = textareaRef.current
    const overlay = overlayRef.current
    
    const syncProperties = () => {
      // 스크롤 위치 동기화
      overlay.scrollTop = textarea.scrollTop
      overlay.scrollLeft = textarea.scrollLeft
      
      // 높이 동기화
      overlay.style.height = textarea.style.height || `${textarea.offsetHeight}px`
    }
    
    // 초기 동기화
    syncProperties()
    
    textarea.addEventListener('scroll', syncProperties)
    textarea.addEventListener('input', syncProperties)
    
    // ResizeObserver로 크기 변화 감지
    const resizeObserver = new ResizeObserver(syncProperties)
    resizeObserver.observe(textarea)
    
    return () => {
      textarea.removeEventListener('scroll', syncProperties)
      textarea.removeEventListener('input', syncProperties)
      resizeObserver.disconnect()
    }
  }, [textareaRef])

  const renderMention = (mention: ParsedMention, index: number) => {
    if (mention.type === 'text') {
      return <span key={index} className="whitespace-pre-wrap">{mention.content}</span>
    }

    return (
      <span
        key={index}
        className="inline-flex items-center font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/30 px-1.5 py-0.5 rounded-md transition-colors"
      >
        {mention.content}
      </span>
    )
  }

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      <div 
        ref={overlayRef}
        className="w-full min-h-[40px] max-h-[200px] resize-none p-0 text-[15px] leading-relaxed whitespace-pre-wrap break-words overflow-auto"
        style={{
          height: 'auto',
          minHeight: '40px',
          border: 'none',
          boxShadow: 'none',
          wordWrap: 'break-word',
          overflowWrap: 'break-word'
        }}
      >
        {parsedContent.map((part, index) => renderMention(part, index))}
      </div>
    </div>
  )
}