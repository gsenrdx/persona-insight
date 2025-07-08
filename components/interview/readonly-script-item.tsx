'use client'

import { memo, useState, useRef, useEffect } from 'react'
import { CleanedScriptItem } from '@/types/interview'
import { cn } from '@/lib/utils'
import { ChevronDown, Check } from 'lucide-react'

interface ReadOnlyScriptItemProps {
  script: CleanedScriptItem
  className?: string
  showSpeaker?: boolean
  isConsecutive?: boolean
  canEdit?: boolean
  onCategoryChange?: (scriptId: number[], category: 'painpoint' | 'needs' | null) => void
}

export const ReadOnlyScriptItem = memo(({ 
  script, 
  className,
  showSpeaker = true,
  isConsecutive = false,
  canEdit = false,
  onCategoryChange
}: ReadOnlyScriptItemProps) => {
  const scriptId = script.id.join('-')
  const isQuestion = script.speaker === 'question'
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])
  
  const handleCategorySelect = (category: 'painpoint' | 'needs' | null) => {
    if (onCategoryChange) {
      onCategoryChange(script.id, category)
    }
    setDropdownOpen(false)
  }
  
  return (
    <div
      id={`script-${scriptId}`}
      className={cn(
        "group/item relative",
        // 정교한 간격 시스템
        isQuestion 
          ? "mb-2" // Q 후 A까지 적절한 간격
          : isConsecutive 
            ? "mb-3" // 연속 A끼리는 읽기 편하게
            : "mb-6", // 새로운 Q 전에는 충분한 여백
        className
      )}
    >
      {/* 노션 스타일 계층구조 */}
      <div className={cn(
        "flex items-start gap-1",
        // Q는 왼쪽 정렬, A는 들여쓰기
        isQuestion ? "pl-0" : "pl-6"
      )}>
        {/* Q/A 라벨 - 공간은 항상 유지 */}
        <div className="flex-shrink-0 w-6 mt-0.5">
          {showSpeaker && (
            <span className={cn(
              "text-[13px] font-semibold select-none",
              isQuestion 
                ? "text-gray-400" 
                : "text-blue-500"
            )}>
              {isQuestion ? 'Q.' : 'A.'}
            </span>
          )}
        </div>
        
        {/* 내용 영역 + 태그 */}
        <div className="flex-1 flex items-start gap-3">
          <div className="flex-1">
            <p className={cn(
              "whitespace-pre-wrap break-words inline",
              isQuestion 
                ? "text-gray-800 text-[15px] font-medium leading-[1.7]" // 질문: 더 뚜렷하게
                : "text-gray-700 text-[15px] font-normal leading-[1.8]", // 답변: 읽기 편하게
              "tracking-[-0.01em]", // 미세한 자간 조정
              // 카테고리별 하이라이트 - 텍스트에만 적용
              !isQuestion && script.category === 'painpoint' && "bg-red-50/60 px-1.5 py-0.5 rounded",
              !isQuestion && script.category === 'needs' && "bg-emerald-50/60 px-1.5 py-0.5 rounded"
            )}>
              {script.cleaned_sentence}
            </p>
          </div>
          
          {/* 카테고리 태그 - 편집 가능한 버튼 */}
          {!isQuestion && (
            <div className="relative" ref={dropdownRef}>
              {script.category ? (
                <button 
                  onClick={() => canEdit && setDropdownOpen(!dropdownOpen)}
                  className={cn(
                    "flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-medium transition-all",
                    canEdit && "hover:shadow-sm cursor-pointer",
                    !canEdit && "cursor-default",
                    script.category === 'painpoint' 
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : "bg-emerald-100 text-emerald-700 border border-emerald-200",
                    canEdit && script.category === 'painpoint' && "hover:bg-red-200",
                    canEdit && script.category === 'needs' && "hover:bg-emerald-200"
                  )}
                >
                  {script.category === 'painpoint' ? 'Pain Point' : 'Need'}
                  {canEdit && <ChevronDown className="w-3 h-3 ml-0.5" />}
                </button>
              ) : (
                canEdit && (
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className={cn(
                      "flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-medium transition-all",
                      "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200",
                      "opacity-0 group-hover/item:opacity-100"
                    )}
                  >
                    태그 추가
                    <ChevronDown className="w-3 h-3" />
                  </button>
                )
              )}
              
              {/* 드롭다운 메뉴 */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1">
                  <button
                    onClick={() => handleCategorySelect('painpoint')}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span className="text-red-700">Pain Point</span>
                    {script.category === 'painpoint' && <Check className="w-3 h-3 text-red-700" />}
                  </button>
                  <button
                    onClick={() => handleCategorySelect('needs')}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span className="text-emerald-700">Need</span>
                    {script.category === 'needs' && <Check className="w-3 h-3 text-emerald-700" />}
                  </button>
                  {script.category && (
                    <>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => handleCategorySelect(null)}
                        className="w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
                      >
                        태그 제거
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

ReadOnlyScriptItem.displayName = 'ReadOnlyScriptItem'