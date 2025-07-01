'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AIResponseDialogProps {
  isOpen: boolean
  onClose: () => void
  question: string
  response: string
  isLoading?: boolean
  position?: { x: number; y: number }
}

export default function AIResponseDialog({ 
  isOpen, 
  onClose, 
  question, 
  response, 
  isLoading = false,
  position 
}: AIResponseDialogProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
    } else {
      const timeout = setTimeout(() => setMounted(false), 200)
      return () => clearTimeout(timeout)
    }
  }, [isOpen])

  if (!mounted) return null

  return (
    <>
      {/* 배경 오버레이 */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 z-40 transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      
      {/* 대화 상자 */}
      <div 
        className={cn(
          "fixed z-50 bg-white rounded-xl shadow-xl border border-gray-200 max-w-lg w-full",
          "animate-in fade-in slide-in-from-bottom-2 duration-200",
          !isOpen && "animate-out fade-out slide-out-to-bottom-2"
        )}
        style={{
          left: position ? `${position.x}px` : '50%',
          top: position ? `${position.y}px` : '50%',
          transform: position ? 'translateX(-50%)' : 'translate(-50%, -50%)'
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="512" height="512" rx="154" fill="#2563EB"/>
              <rect x="128" y="128" width="256" height="256" rx="77" fill="white"/>
            </svg>
            <h3 className="font-semibold text-gray-900">AI 답변</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* 내용 */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          {/* 질문 */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">질문:</p>
            <p className="text-sm font-medium text-gray-900">{question}</p>
          </div>
          
          {/* 답변 */}
          <div>
            <p className="text-sm text-gray-600 mb-1">답변:</p>
            {isLoading ? (
              <div className="flex items-center gap-2 py-4">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-600">AI가 답변을 생성하고 있습니다...</span>
              </div>
            ) : (
              <div className="prose prose-sm prose-gray max-w-none
                prose-headings:text-gray-900 prose-headings:font-semibold
                prose-p:text-gray-700 prose-p:leading-relaxed
                prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                prose-strong:text-gray-900 prose-strong:font-semibold
                prose-ul:text-gray-700 prose-ol:text-gray-700
                prose-li:my-1
                prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600
                prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-pre:overflow-x-auto
                prose-hr:border-gray-200">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // 링크는 새 탭에서 열기
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                        {children}
                      </a>
                    ),
                    // 코드 블록 스타일링
                    code: ({ inline, className, children, ...props }) => {
                      return inline ? (
                        <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
                          {children}
                        </code>
                      ) : (
                        <code className="block bg-gray-100 text-gray-800 p-3 rounded-lg overflow-x-auto text-sm" {...props}>
                          {children}
                        </code>
                      )
                    },
                    // 테이블 스타일링
                    table: ({ children }) => (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="px-3 py-2 bg-gray-50 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {response}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
        
        {/* 푸터 */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </>
  )
}