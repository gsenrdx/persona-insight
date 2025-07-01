'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import AIExitConfirmation from './ai-exit-confirmation'

interface AIQuestionBarProps {
  isOpen: boolean
  onClose: () => void
  initialText?: string
  selectedText?: string
  onSubmit: (question: string, onStream: (chunk: string) => void, onComplete: () => void) => void | Promise<void>
  position?: { x: number; y: number }
}

export default function AIQuestionBar({ isOpen, onClose, initialText = '', selectedText = '', onSubmit, position }: AIQuestionBarProps) {
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [hasResponse, setHasResponse] = useState(false)
  const [lastQuestion, setLastQuestion] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
      adjustTextareaHeight()
    }
  }, [isOpen])

  useEffect(() => {
    // Reset when dialog opens
    if (isOpen) {
      setText('')
      setIsStreaming(false)
      setHasResponse(false)
      setLastQuestion('')
    }
  }, [isOpen])

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }
  
  useEffect(() => {
    adjustTextareaHeight()
  }, [text])

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Check if there's content that would be lost
        if (text.trim() || isStreaming) {
          setShowExitConfirm(true)
        } else {
          onClose()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, text, isStreaming, onClose])

  const handleSubmit = async () => {
    if (text.trim() && !isLoading && !isStreaming) {
      const question = text.trim()
      setLastQuestion(question)
      setIsLoading(true)
      setText('') // Clear input
      setIsStreaming(true)
      
      try {
        await onSubmit(
          question, 
          (chunk) => {
            setText(prev => prev + chunk)
            adjustTextareaHeight()
          },
          () => {
            // 스트리밍 완료 콜백
            setIsLoading(false)
            setIsStreaming(false)
            setHasResponse(true)
          }
        )
      } catch (error) {
        setIsLoading(false)
        setIsStreaming(false)
      }
    }
  }

  const handleRetry = async () => {
    if (lastQuestion) {
      setText('')
      setHasResponse(false)
      setIsLoading(true)
      setIsStreaming(true)
      
      try {
        await onSubmit(
          lastQuestion, // 동일한 질문 사용
          (chunk) => {
            setText(prev => prev + chunk)
            adjustTextareaHeight()
          },
          () => {
            setIsLoading(false)
            setIsStreaming(false)
            setHasResponse(true)
          }
        )
      } catch (error) {
        setIsLoading(false)
        setIsStreaming(false)
      }
    }
  }

  const handleFollowUp = () => {
    setText('')
    setHasResponse(false)
    adjustTextareaHeight()
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen || !position) return null

  return (
    <>
      <div 
        ref={containerRef}
        className="absolute z-[100]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translateX(-50%)'
        }}
        onMouseDown={(e) => e.preventDefault()} // Prevent text selection from being cleared
      >
      <div className={cn(
        "bg-white rounded-2xl shadow-lg border border-gray-200",
        "animate-in fade-in slide-in-from-top-2 duration-200",
        "w-[800px] pointer-events-auto"
      )}>
        
        {/* 입력 영역 */}
        <div className="flex items-start gap-2 p-3">
          {/* MISO 로고 */}
          <div className="mt-1">
            <svg width="24" height="24" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="512" height="512" rx="154" fill="#2563EB"/>
              <rect x="128" y="128" width="256" height="256" rx="77" fill="white"/>
            </svg>
          </div>
        
        {/* 입력창 */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            adjustTextareaHeight()
          }}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? "AI가 답변하고 있습니다..." : "무엇이든 물어보세요"}
          className={cn(
            "flex-1 px-2 py-1 text-sm bg-transparent placeholder-gray-400 focus:outline-none resize-none overflow-hidden",
            isStreaming && "text-gray-700"
          )}
          disabled={isLoading || isStreaming}
          rows={1}
        />
        
        {/* 버튼 그룹 */}
        <div className="flex items-start gap-1 mt-1">
          {/* 전송 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isLoading || isStreaming || hasResponse}
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-full transition-all",
              text.trim() && !isLoading && !isStreaming && !hasResponse
                ? "bg-blue-600 text-white hover:bg-blue-700" 
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowUp className="w-3.5 h-3.5" />
            )}
          </button>
          
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-gray-100 transition-all"
          >
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
        </div>
        
        {/* 재시도 및 추가 질문 버튼 - 응답이 있을 때만 표시 */}
        {hasResponse && !isStreaming && (
          <div className="flex flex-wrap gap-2 px-3 pb-3 pl-11">
            <button
              onClick={handleRetry}
              className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-full transition-all"
            >
              다시 시도
            </button>
            <button
              onClick={handleFollowUp}
              className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-all"
            >
              추가 질문
            </button>
          </div>
        )}
      </div>
      </div>
      
      {/* 종료 확인 대화상자 */}
      <AIExitConfirmation
        isOpen={showExitConfirm}
        onConfirm={() => {
          setShowExitConfirm(false)
          onClose()
        }}
        onCancel={() => setShowExitConfirm(false)}
      />
    </>
  )
}