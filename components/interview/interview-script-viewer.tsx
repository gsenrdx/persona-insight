'use client'

import { useState, useMemo } from 'react'
import { CleanedScriptItem } from '@/types/interview'
import { Interview } from '@/types/interview'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import InterviewSummarySidebar from './interview-summary-sidebar'

interface InterviewScriptViewerProps {
  script: CleanedScriptItem[]
  interview?: Interview
  className?: string
}

export default function InterviewScriptViewer({ script, interview, className }: InterviewScriptViewerProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // 필터링된 스크립트
  const filteredScript = useMemo(() => {
    if (!searchTerm) return script
    
    return script.filter(item =>
      item.cleaned_sentence.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [script, searchTerm])


  const highlightText = (text: string, category?: string) => {
    const parts = searchTerm 
      ? text.split(new RegExp(`(${searchTerm})`, 'gi'))
      : [text]
    
    return (
      <span className={cn(
        "relative inline",
        category === 'painpoint' && "bg-gradient-to-r from-red-100/60 to-red-100/40 px-1 -mx-1 rounded",
        category === 'needs' && "bg-gradient-to-r from-blue-100/60 to-blue-100/40 px-1 -mx-1 rounded"
      )}>
        {parts.map((part, i) => 
          searchTerm && part.toLowerCase() === searchTerm.toLowerCase() 
            ? <mark key={i} className="bg-yellow-300/50 rounded px-0.5">{part}</mark>
            : part
        )}
      </span>
    )
  }

  return (
    <div className={cn("flex h-full bg-gray-50 overflow-auto", className)}>
      {/* 왼쪽 사이드바 - 인터뷰 요약 */}
      {interview && <InterviewSummarySidebar interview={interview} />}

      {/* 오른쪽 스크립트 영역 */}
      <div className="flex-1 bg-white">
        {/* 헤더 영역 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-8 py-3 bg-gray-50/50 sticky top-0 z-10">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">대화 스크립트</h3>
            <p className="text-xs text-gray-500 mt-0.5">Interview Script</p>
          </div>
          
          {/* 검색 바 - 우측 배치 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 shadow-sm transition-all"
            />
          </div>
        </div>

        {/* 스크립트 내용 */}
          <div className="max-w-3xl mx-auto px-8 py-8">
            {filteredScript.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400 text-sm">
                  {searchTerm ? '검색 결과가 없습니다.' : '대화 내용이 없습니다.'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredScript.map((item) => (
                  <div
                    key={item.id.join('-')}
                    className={cn(
                      "relative group",
                      "before:content-[''] before:absolute before:-left-6 before:top-0 before:bottom-0 before:w-0.5",
                      item.speaker === 'question' 
                        ? "before:bg-gray-200" 
                        : "before:bg-transparent"
                    )}
                  >
                    {/* 화자 표시 */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <span className={cn(
                        "text-xs font-medium tracking-wide",
                        item.speaker === 'question' 
                          ? "text-gray-500" 
                          : "text-gray-700"
                      )}>
                        {item.speaker === 'question' ? '질문' : '답변'}
                      </span>

                      {/* 카테고리 라벨 */}
                      {item.category && (
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          item.category === 'painpoint' 
                            ? "bg-red-100 text-red-600" 
                            : "bg-blue-100 text-blue-600"
                        )}>
                          {item.category === 'painpoint' ? 'Pain Point' : 'Need'}
                        </span>
                      )}
                    </div>

                    {/* 대화 내용 */}
                    <div className={cn(
                      "text-sm leading-relaxed",
                      item.speaker === 'question' 
                        ? "text-gray-600 font-medium" 
                        : "text-gray-800"
                    )}>
                      {highlightText(item.cleaned_sentence, item.category || undefined)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>
    </div>
  )
}