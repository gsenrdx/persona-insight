'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingMemoButtonProps {
  onAddMemo: (selectedText: string, range: Range) => void
  onAskMiso?: (selectedText: string) => void
  className?: string
}

export default function FloatingMemoButton({ onAddMemo, onAskMiso, className }: FloatingMemoButtonProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [selectedRange, setSelectedRange] = useState<Range | null>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  const hideButton = useCallback(() => {
    setPosition(null)
    setSelectedRange(null)
  }, [])

  const showButton = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.rangeCount) return

    const text = selection.toString().trim()
    if (!text) return

    const range = selection.getRangeAt(0)
    
    // 스크립트 영역 내에서만 동작
    const container = range.commonAncestorContainer
    const element = container.nodeType === Node.TEXT_NODE 
      ? container.parentElement 
      : container as Element
    
    if (!element?.closest('[data-script-id]')) return

    // 위치 계산
    const rect = range.getBoundingClientRect()
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 48
    })
    setSelectedRange(range.cloneRange())
  }, [])

  useEffect(() => {
    // 텍스트 선택 완료 시 버튼 표시
    const handleMouseUp = () => {
      // 짧은 지연으로 선택 완료 대기
      setTimeout(showButton, 10)
    }

    // 선택 해제 시 버튼 숨김
    const handleMouseDown = (e: MouseEvent) => {
      if (!buttonRef.current?.contains(e.target as Node)) {
        hideButton()
      }
    }

    // 스크롤 시 버튼 숨김
    const handleScroll = () => hideButton()

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [showButton, hideButton])

  const handleAddMemo = () => {
    const selection = window.getSelection()
    if (selection && selectedRange) {
      onAddMemo(selection.toString().trim(), selectedRange)
      selection.removeAllRanges()
      hideButton()
    }
  }

  const handleAskMiso = () => {
    const selection = window.getSelection()
    if (selection && onAskMiso) {
      onAskMiso(selection.toString().trim())
      // Don't remove selection to keep highlight
      hideButton()
    }
  }

  if (!position) return null

  return (
    <div
      ref={buttonRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%)',
        zIndex: 1000
      }}
      className={cn(
        "flex items-center gap-1 bg-gray-900 text-white rounded-md shadow-lg",
        "transition-opacity duration-150",
        position ? "opacity-100" : "opacity-0",
        className
      )}
    >
      {onAskMiso && (
        <>
          <button
            onClick={handleAskMiso}
            onMouseDown={(e) => e.preventDefault()} // Prevent selection from being cleared
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 rounded-l-md transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
              <rect width="512" height="512" rx="154" fill="#2563EB"/>
              <rect x="128" y="128" width="256" height="256" rx="77" fill="white"/>
            </svg>
            <span className="text-sm font-medium">AI에게 질문</span>
          </button>
          <div className="w-px h-6 bg-gray-700" />
        </>
      )}
      <button
        onClick={handleAddMemo}
        onMouseDown={(e) => e.preventDefault()} // Prevent selection from being cleared
        className={cn(
          "flex items-center gap-2 px-3 py-2 hover:bg-gray-800 transition-colors",
          onAskMiso ? "" : "rounded-l-md"
        )}
      >
        <MessageSquare className="w-4 h-4" />
        <span className="text-sm font-medium">메모</span>
      </button>
      <button
        onClick={hideButton}
        onMouseDown={(e) => e.preventDefault()} // Prevent selection from being cleared
        className="p-2 hover:bg-gray-800 rounded-r-md transition-colors border-l border-gray-700"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}