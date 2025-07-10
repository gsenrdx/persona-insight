'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { CleanedScriptItem, ScriptSection } from '@/types/interview'
import { Interview } from '@/types/interview'
import { Search, MessageSquare, X, Plus, MoreVertical, Trash2, ChevronDown, ChevronUp, Download, FileText, ListOrdered, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInterviewNotes } from '@/hooks/use-interview-notes'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
// Removed FloatingMemoButton and AIQuestionBar - using read-only view
import { ReadOnlyScriptItem } from './readonly-script-item'

interface InterviewScriptViewerProps {
  script: CleanedScriptItem[]
  interview?: Interview
  className?: string
  onSectionsChange?: (sections: ScriptSection[] | null, activeSection: string | null, scrollToSection: (sectionName: string) => void) => void
  canEdit?: boolean
  tagFilter?: Set<'pain' | 'need'>
  onTagFilterChange?: (filters: Set<'pain' | 'need'>) => void
}

export default function InterviewScriptViewer({ script, interview, className, onSectionsChange, canEdit = false, tagFilter = new Set(), onTagFilterChange }: InterviewScriptViewerProps) {
  const { user, profile, session } = useAuth()
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  
  // Script data with optimistic updates
  const [scripts, setScripts] = useState(script)
  
  // script prop이 변경되면 상태 업데이트
  useEffect(() => {
    setScripts(script)
  }, [script])
  
  // 태그 필터에 따라 필터링된 스크립트
  const filteredScripts = useMemo(() => {
    // 필터가 비어있으면 전체 표시
    if (tagFilter.size === 0) {
      return scripts
    }
    
    // 선택된 필터에 따라 evidence ids 수집
    const evidenceIds = new Set<number>()
    
    if (tagFilter.has('pain') && interview?.primary_pain_points) {
      interview.primary_pain_points.forEach(painPoint => {
        painPoint.evidence.forEach(id => evidenceIds.add(id))
      })
    }
    
    if (tagFilter.has('need') && interview?.primary_needs) {
      interview.primary_needs.forEach(need => {
        need.evidence.forEach(id => evidenceIds.add(id))
      })
    }
    
    // evidence에 포함된 스크립트 아이템만 필터링
    return scripts.filter(item => 
      item.id.some(id => evidenceIds.has(id))
    )
  }, [scripts, tagFilter, interview])
  
  // scrollToSection 함수를 먼저 정의
  const scrollToSection = useCallback((sectionName: string) => {
    const safeId = sectionName.replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '')
    const element = document.getElementById(`section-${safeId}`)
    
    if (element) {
      // 즉시 이동 (애니메이션 없이)
      element.scrollIntoView({ behavior: 'instant', block: 'start' });
      
      // 오프셋 조정도 즉시
      if (scriptContainerRef.current) {
        const container = scriptContainerRef.current;
        container.scrollTop = container.scrollTop - 80; // 80px 위로 조정
      }
    }
  }, [])
  
  // 섹션 정보와 스크롤 함수를 상위 컴포넌트로 전달
  useEffect(() => {
    if (onSectionsChange) {
      const sections = interview?.script_sections as ScriptSection[] || null
      onSectionsChange(sections, activeSection, scrollToSection)
    }
  }, [interview?.script_sections, activeSection, onSectionsChange, scrollToSection])
  
  const [searchTerm, setSearchTerm] = useState('')
  // Removed memo editing states - using read-only view
  const [aiQuestionBarOpen, setAiQuestionBarOpen] = useState(false)
  const [selectedTextForAI, setSelectedTextForAI] = useState('')
  const [aiQuestionPosition, setAiQuestionPosition] = useState<{ x: number; y: number } | null>(null)
  const scriptContainerRef = useRef<HTMLDivElement>(null)

  // 노션 스타일 텍스트 선택 하이라이트를 위한 스타일 삽입
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      /* 노션 스타일 텍스트 선택 하이라이트 */
      .interview-script-content ::selection {
        background-color: rgba(35, 131, 226, 0.28);
        color: inherit;
      }
      
      .interview-script-content ::-moz-selection {
        background-color: rgba(35, 131, 226, 0.28);
        color: inherit;
      }
      
      /* AI 질문 중 선택 하이라이트 유지 */
      .ai-selection-active ::selection {
        background-color: rgba(35, 131, 226, 0.28) !important;
        color: inherit !important;
      }
      
      .ai-selection-active ::-moz-selection {
        background-color: rgba(35, 131, 226, 0.28) !important;
        color: inherit !important;
      }
      
      /* 선택 유지를 위한 스타일 */
      .maintain-selection {
        user-select: text !important;
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
      }
      
      /* 노션 스타일 댓글 하이라이트 - 심플 버전 */
      .notion-comment-highlight {
        background-color: rgba(255, 235, 137, 0.3);
        border-radius: 2px;
        padding: 2px 0;
        transition: background-color 0.15s ease;
      }
      
      .notion-comment-highlight:hover {
        background-color: rgba(255, 235, 137, 0.5);
      }
      
      /* 다크 모드 대응 */
      .dark .notion-comment-highlight {
        background-color: rgba(255, 235, 137, 0.15);
      }
      
      .dark .notion-comment-highlight:hover {
        background-color: rgba(255, 235, 137, 0.25);
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])
  
  // DB 연동 훅 사용 (SSE 기반)
  const { 
    notes, 
    addNote, 
    deleteNote,
    isAddingNote,
    isDeletingNote 
  } = useInterviewNotes(interview?.id || '', interview?.project_id)
  
  // 카테고리 업데이트 mutation with optimistic update
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ scriptId, category, currentScripts }: { scriptId: number[], category: 'painpoint' | 'needs' | null, currentScripts: CleanedScriptItem[] }) => {
      if (!session?.access_token || !interview?.id) throw new Error('인증이 필요합니다')
      
      // 현재 cleaned_script를 복사하고 해당 항목만 업데이트
      const updatedScript = currentScripts.map(item => {
        if (JSON.stringify(item.id) === JSON.stringify(scriptId)) {
          return { ...item, category }
        }
        return item
      })
      
      const response = await fetch(`/api/interviews/${interview.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cleaned_script: updatedScript
        })
      })
      
      if (!response.ok) {
        throw new Error('카테고리 업데이트 실패')
      }
      
      return { updatedScript }
    },
    onMutate: async ({ scriptId, category }) => {
      // 현재 상태 저장
      const previousScripts = scripts
      
      // 낙관적 업데이트 - 함수형 업데이트로 최신 상태 보장
      setScripts(prev => prev.map(item => {
        if (JSON.stringify(item.id) === JSON.stringify(scriptId)) {
          return { ...item, category }
        }
        return item
      }))
      
      // 롤백을 위한 이전 상태 반환
      return { previousScripts }
    },
    onError: (error, variables, context) => {
      // 에러 시 롤백
      if (context?.previousScripts) {
        setScripts(context.previousScripts)
      }
      toast.error('카테고리 업데이트 중 오류가 발생했습니다')
    },
    onSuccess: () => {
      toast.success('카테고리가 업데이트되었습니다')
    }
  })
  
  const handleCategoryChange = useCallback((scriptId: number[], category: 'painpoint' | 'needs' | null) => {
    updateCategoryMutation.mutate({ scriptId, category, currentScripts: scripts })
  }, [updateCategoryMutation, scripts])
  
  // 스크립트 ID별 메모 맵핑
  const memosByScriptId = useMemo(() => {
    const map: Record<string, typeof notes[0]> = {}
    const safeNotes = Array.isArray(notes) ? notes : []
    safeNotes.forEach(note => {
      if (note.script_item_ids && Array.isArray(note.script_item_ids)) {
        note.script_item_ids.forEach(scriptId => {
          map[scriptId] = note
        })
      }
    })
    return map
  }, [notes])

  // 스크립트 데이터 (태그 필터 적용)
  const scriptItems = filteredScripts
  
  // 필터링된 스크립트 (검색어 필터)
  const filteredScript = useMemo(() => {
    // 먼저 빈 내용 제거
    const nonEmptyItems = scriptItems.filter(item => 
      item.cleaned_sentence && 
      item.cleaned_sentence.trim().length > 0
    )
    
    if (!searchTerm) return nonEmptyItems
    
    return nonEmptyItems.filter(item =>
      item.cleaned_sentence.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [scriptItems, searchTerm])

  // Removed memo/reply handlers - using read-only view

  const highlightText = (text: string, category?: string) => {
    const parts = searchTerm 
      ? text.split(new RegExp(`(${searchTerm})`, 'gi'))
      : [text]
    
    return (
      <span className="relative inline">
        {parts.map((part, i) => 
          searchTerm && part.toLowerCase() === searchTerm.toLowerCase() 
            ? <mark key={i} className="bg-yellow-200/60 text-yellow-900 rounded-sm px-1 py-0.5 font-medium">{part}</mark>
            : part
        )}
      </span>
    )
  }


  // 스크롤 위치에 따른 현재 섹션 감지
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout
    let lastActiveSection = activeSection // 현재 activeSection을 로컬 변수로 추적
    
    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout)
      
      scrollTimeout = setTimeout(() => {
        if (!interview?.script_sections) {
          return
        }
        
        const sections = interview.script_sections as ScriptSection[]
        let currentSection = null
        
        // 현재 보이는 섹션 찾기 - 역순으로 검사 (아래에서 위로)
        for (let i = sections.length - 1; i >= 0; i--) {
          const section = sections[i]
          const safeId = section.sector_name.replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '')
          const element = document.getElementById(`section-${safeId}`)
          
          if (element) {
            const rect = element.getBoundingClientRect()
            
            // 뷰포트 상단에서 200px 이내에 있으면 활성화
            if (rect.top <= 200 && rect.bottom > 0) {
              currentSection = section.sector_name
              break
            }
          }
        }
        
        if (currentSection && currentSection !== lastActiveSection) {
          lastActiveSection = currentSection
          setActiveSection(currentSection)
        }
      }, 50) // 50ms throttle
    }
    
    // document에 스크롤 리스너 추가
    document.addEventListener('scroll', handleScroll, true)
    
    // 초기 한 번 실행
    setTimeout(handleScroll, 100)
    
    return () => {
      document.removeEventListener('scroll', handleScroll, true)
      if (scrollTimeout) clearTimeout(scrollTimeout)
    }
  }, [interview?.script_sections, activeSection])
  
  return (
    <div className={cn(
      "h-full flex bg-white interview-script-content",
      className
    )}>
      
      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 relative overflow-hidden">
        {/* 스크립트 영역 */}
        <div className="h-full flex flex-col">
          {/* 검색 및 태그 필터 영역 */}
          <div className="px-8 py-3 bg-white border-b border-gray-100">
            <div className="flex items-center justify-between gap-4">
              {/* 좌측: 태그 필터 버튼 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const newFilters = new Set(tagFilter)
                    if (newFilters.has('pain')) {
                      newFilters.delete('pain')
                    } else {
                      newFilters.add('pain')
                    }
                    // 상위 컴포넌트로 전달하기 위해 직접 호출
                    if (onTagFilterChange) {
                      onTagFilterChange(newFilters)
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-all",
                    tagFilter.has('pain')
                      ? "bg-red-50 border-red-200 text-red-700" 
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800"
                  )}
                >
                  <div className={cn(
                    "w-3 h-3 rounded-sm border transition-all flex items-center justify-center",
                    tagFilter.has('pain')
                      ? "bg-red-500 border-red-500"
                      : "border-gray-300"
                  )}>
                    {tagFilter.has('pain') && (
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  문제점
                </button>
                <button
                  onClick={() => {
                    const newFilters = new Set(tagFilter)
                    if (newFilters.has('need')) {
                      newFilters.delete('need')
                    } else {
                      newFilters.add('need')
                    }
                    // 상위 컴포넌트로 전달하기 위해 직접 호출
                    if (onTagFilterChange) {
                      onTagFilterChange(newFilters)
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-all",
                    tagFilter.has('need')
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800"
                  )}
                >
                  <div className={cn(
                    "w-3 h-3 rounded-sm border transition-all flex items-center justify-center",
                    tagFilter.has('need')
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-gray-300"
                  )}>
                    {tagFilter.has('need') && (
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  니즈
                </button>
              </div>
              
              {/* 우측: 컴팩트 검색바 */}
              <div className="w-72">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border-2 border-gray-200 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-blue-500 transition-colors bg-white hover:border-gray-300"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 스크립트 내용 */}
          <div className="flex-1 overflow-y-auto relative bg-white" ref={scriptContainerRef}>
            <div className="px-8 py-4">
              {filteredScript.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-gray-300 mb-3">
                    <MessageSquare className="w-12 h-12 mx-auto opacity-20" />
                  </div>
                  <p className="text-gray-500 text-base font-medium">
                    {searchTerm ? '검색 결과가 없습니다' : '대화 내용이 없습니다'}
                  </p>
                  {searchTerm && (
                    <p className="text-gray-400 text-sm mt-1">
                      다른 키워드로 검색해보세요
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  {/* 노션 스타일 마크다운 구조 */}
                  {(() => {
                    const sections = interview?.script_sections as ScriptSection[] || [];
                    let lastSectionName = '';
                    let isFirstSection = true;
                    
                    // 섹션 인덱스를 찾기 위한 맵
                    const sectionIndexMap = new Map();
                    sections.forEach((section, idx) => {
                      sectionIndexMap.set(section.sector_name, idx + 1);
                    });
                    
                    return filteredScript.map((item, index) => {
                      const scriptId = item.id.join('-')
                      const uniqueKey = `${scriptId}-${index}`
                      const prevItem = index > 0 ? filteredScript[index - 1] : null
                      
                      // item.id 배열의 첫 번째 라인 번호로 섹션 찾기
                      const firstLineNumber = item.id[0];
                      const currentSection = sections.find(section => 
                        firstLineNumber >= section.start_line && 
                        firstLineNumber <= section.end_line
                      );
                      
                      // 새로운 섹션의 시작인지 확인 (이전 섹션과 다른 경우)
                      const isNewSection = currentSection && currentSection.sector_name !== lastSectionName;
                      if (currentSection) {
                        lastSectionName = currentSection.sector_name;
                      }
                      
                      // 연속된 같은 화자 확인 (섹션이 바뀌면 연속 아님)
                      const isConsecutiveSameSpeaker = !isNewSection && 
                        prevItem && 
                        item.speaker === prevItem.speaker;
                      
                      const showSpeaker = !isConsecutiveSameSpeaker;
                      
                      return (
                        <div key={uniqueKey}>
                          {/* 마크다운 스타일 섹션 헤더 */}
                          {isNewSection && currentSection && (
                            <div 
                              id={`section-${currentSection.sector_name.replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '')}`}
                              ref={(el) => {
                                if (el) sectionRefs.current[currentSection.sector_name] = el
                              }}
                              className={cn(
                                "mb-6",
                                // 섹션 시작 전 적절한 간격
                                index === 0 ? "mt-0" : "mt-10",
                              )}>
                              {/* 심플한 섹션 헤더 */}
                              <h2 className={cn(
                                "font-semibold border-b pb-2",
                                currentSection.is_main_content
                                  ? "text-gray-900 text-lg border-gray-300"
                                  : "text-gray-700 text-base border-gray-200"
                              )}>
                                <span className="text-gray-400 font-normal mr-2">
                                  {sectionIndexMap.get(currentSection.sector_name)}.
                                </span>
                                {currentSection.sector_name}
                              </h2>
                            </div>
                          )}
                          
                          {/* Script item */}
                          <ReadOnlyScriptItem
                            script={item}
                            showSpeaker={showSpeaker}
                            isConsecutive={isConsecutiveSameSpeaker}
                            canEdit={canEdit}
                            onCategoryChange={handleCategoryChange}
                            className={cn(
                              // 비주요 섹션은 미묘하게 흐리게
                              currentSection && !currentSection.is_main_content && "opacity-80"
                            )}
                          />
                        </div>
                      )
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
    </div>
  )
}