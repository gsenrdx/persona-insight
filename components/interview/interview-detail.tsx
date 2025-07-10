'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Interview } from '@/types/interview'
import { cn } from '@/lib/utils'
import InterviewScriptViewer from './interview-script-viewer'
import InterviewInsights from './interview-insights'
import InterviewAssistantPanel from './interview-assistant-panel'

interface InterviewDetailProps {
  interview: Interview
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onSectionsChange?: (sections: any[] | null, activeSection: string | null, scrollToSection: ((sectionName: string) => void) | null) => void
  hideHeader?: boolean
  onDownloadMenuChange?: (downloadHandlers: { 
    handleDownloadOriginal: () => void
    handleDownloadCleaned: () => void
  }) => void
  onBack?: () => void
}

export default function InterviewDetail({ interview, onSectionsChange, onDownloadMenuChange, onBack }: InterviewDetailProps) {
  const [scriptSections, setScriptSections] = useState<any[] | null>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [scrollToSection, setScrollToSection] = useState<((sectionName: string) => void) | null>(null)
  const [floatingPanelOpen, setFloatingPanelOpen] = useState(false)
  
  // 태그 필터 상태 (체크박스 형태)
  const [selectedFilters, setSelectedFilters] = useState<Set<'pain' | 'need'>>(new Set())
  
  // 리사이저 관련 상태
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('interview-panel-width')
        return saved ? parseFloat(saved) : 50
      } catch {
        return 50
      }
    }
    return 50
  })
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  
  // 너비 변경 시 localStorage에 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('interview-panel-width', leftPanelWidth.toString())
      } catch {
        // localStorage가 가득 차거나 비활성화된 경우 무시
      }
    }
  }, [leftPanelWidth])

  // 컴포넌트 언마운트 시 목차 정리
  useEffect(() => {
    return () => {
      if (onSectionsChange) {
        onSectionsChange(null, null, null)
      }
    }
  }, [onSectionsChange])

  // 인터뷰가 없으면 로딩 표시
  if (!interview) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">인터뷰를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 리사이저 마우스 이벤트 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = leftPanelWidth
  }, [leftPanelWidth])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const deltaX = e.clientX - startXRef.current
    const deltaPercent = (deltaX / containerRect.width) * 100
    const newWidthPercent = startWidthRef.current + deltaPercent
    
    // 최소 460px 제약 적용
    const minPixelWidth = 460
    const minWidthPercent = (minPixelWidth / containerRect.width) * 100
    const maxWidthPercent = 100 - minWidthPercent // 오른쪽 패널도 최소 460px
    
    // 컨테이너가 920px(460*2) 미만이면 50%로 고정
    if (containerRect.width < minPixelWidth * 2) {
      const newWidth = 50
      setLeftPanelWidth(newWidth)
      return
    }
    
    const newWidth = Math.min(Math.max(minWidthPercent, newWidthPercent), maxWidthPercent)
    
    setLeftPanelWidth(newWidth)
  }, [isResizing])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  // 마우스 이벤트 리스너 등록/해제
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  // 스크립트 뷰어에서 섹션 정보가 변경될 때
  const handleScriptSectionsChange = (sections: any[] | null, active: string | null, scrollFn: (sectionName: string) => void) => {
    setScriptSections(sections)
    setActiveSection(active)
    setScrollToSection(() => scrollFn)
    
    // 상위 컴포넌트로 전달
    if (onSectionsChange) {
      onSectionsChange(sections, active, scrollFn)
    }
  }
  
  // 태그 필터 변경 핸들러
  const handleTagFilterChange = (filters: Set<'pain' | 'need'>) => {
    setSelectedFilters(filters)
  }
  
  // 다운로드 핸들러들 - 의존성 배열 없이 현재 값을 직접 참조
  const handleDownloadOriginal = () => {
    if (!interview?.raw_text) {
      alert('원본 인터뷰 텍스트가 없습니다.')
      return
    }

    const content = interview.raw_text
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    const fileName = interview?.title 
      ? interview.title.replace(/[^a-zA-Z0-9가-힣\s]/g, '').trim().replace(/\s+/g, '_')
      : 'interview'
    link.download = `${fileName}_original.txt`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDownloadCleaned = () => {
    if (!interview?.cleaned_script) {
      alert('정리된 스크립트가 없습니다.')
      return
    }
    
    // 정리된 스크립트 텍스트 생성
    let content = `${interview?.title || '인터뷰 스크립트'}\n`
    content += `날짜: ${interview?.interview_date ? new Date(interview.interview_date).toLocaleDateString('ko-KR') : '날짜 없음'}\n`
    content += '='.repeat(50) + '\n\n'
    
    // 태그 필터가 적용된 경우 필터링된 스크립트 사용
    const scriptsToDownload = selectedFilters.size === 0 ? interview.cleaned_script : interview.cleaned_script.filter(item => {
      const evidenceIds = new Set<number>()
      
      if (selectedFilters.has('pain') && interview?.primary_pain_points) {
        interview.primary_pain_points.forEach(painPoint => {
          painPoint.evidence.forEach(id => evidenceIds.add(id))
        })
      }
      
      if (selectedFilters.has('need') && interview?.primary_needs) {
        interview.primary_needs.forEach(need => {
          need.evidence.forEach(id => evidenceIds.add(id))
        })
      }
      
      return item.id.some(id => evidenceIds.has(id))
    })
    
    scriptsToDownload.forEach(item => {
      const speaker = item.speaker === 'question' ? 'Q' : 'A'
      const category = item.category ? ` [${item.category === 'painpoint' ? 'Pain Point' : 'Need'}]` : ''
      content += `${speaker}:${category} ${item.cleaned_sentence}\n\n`
    })
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // 파일명 생성 (제목을 사용하고, 특수문자 제거)
    const fileName = interview?.title 
      ? interview.title.replace(/[^a-zA-Z0-9가-힣\s]/g, '').trim().replace(/\s+/g, '_')
      : 'interview_script'
    link.download = `${fileName}.txt`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  
  // 다운로드 핸들러들을 ref로 관리하여 재생성 방지
  const downloadHandlersRef = useRef({ handleDownloadOriginal, handleDownloadCleaned })
  downloadHandlersRef.current = { handleDownloadOriginal, handleDownloadCleaned }
  
  // 다운로드 핸들러들을 상위 컴포넌트에 전달
  useEffect(() => {
    if (onDownloadMenuChange) {
      onDownloadMenuChange(downloadHandlersRef.current)
    }
    // 컴포넌트 언마운트 시 핸들러 제거
    return () => {
      if (onDownloadMenuChange) {
        onDownloadMenuChange(undefined)
      }
    }
  }, [onDownloadMenuChange]) // onDownloadMenuChange만 의존성으로


  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      
      {/* 리사이징 중일 때 오버레이 */}
      {isResizing && (
        <div className="fixed inset-0 z-50 cursor-col-resize" />
      )}
      
      {/* 스플릿 뷰 콘텐츠 영역 */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row" ref={containerRef}>
        {/* 좌측/상단: 인사이트 */}
        <div 
          className="h-1/2 lg:h-full border-b lg:border-b-0 flex flex-col"
          style={{ 
            width: typeof window !== 'undefined' && window.innerWidth >= 1024 
              ? `${leftPanelWidth}%` 
              : '100%' 
          }}
        >
          <div className="border-b border-gray-200 bg-white" style={{ height: '57px' }}>
            <div className="h-full flex items-center px-8">
              <h2 className="text-base font-semibold text-gray-900">인터뷰 요약</h2>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <InterviewInsights 
              interview={interview} 
            />
          </div>
        </div>
        
        {/* 리사이저 핸들 - 데스크톱에서만 표시 */}
        <div 
          className={cn(
            "hidden lg:flex relative w-px hover:w-1 transition-all duration-150 cursor-col-resize",
            "bg-gray-300 hover:bg-gray-400 group",
            isResizing && "w-1 bg-blue-500"
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-6 flex items-center justify-center" />
        </div>
        
        {/* 우측/하단: 스크립트 */}
        <div 
          className="h-1/2 lg:h-full flex flex-col flex-1"
          style={{ 
            width: typeof window !== 'undefined' && window.innerWidth >= 1024 
              ? `${100 - leftPanelWidth}%` 
              : '100%' 
          }}
        >
          <div className="border-b border-gray-200 bg-white" style={{ height: '57px' }}>
            <div className="h-full flex items-center px-8">
              <h2 className="text-base font-semibold text-gray-900">스크립트</h2>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <InterviewScriptViewer 
              script={interview.cleaned_script || []} 
              interview={interview}
              className=""
              onSectionsChange={handleScriptSectionsChange}
              canEdit={false}
              tagFilter={selectedFilters}
              onTagFilterChange={handleTagFilterChange}
            />
          </div>
        </div>
      </div>
      
      {/* Floating button for AI assistant */}
      {typeof window !== 'undefined' && createPortal(
        <>
          {/* 플로팅 버튼 */}
          <div className="fixed right-6 bottom-6 z-[100]">
            <button
              onClick={() => setFloatingPanelOpen(!floatingPanelOpen)}
              className={cn(
                "group relative flex flex-col items-center gap-1 p-2 transition-transform duration-200 hover:scale-[1.02] active:scale-95",
                floatingPanelOpen && "scale-0 opacity-0 pointer-events-none"
              )}
              title="AI 도우미"
            >
              {/* AI 캐릭터 - CSS로 hover 처리 */}
              <div className="relative w-16 h-16">
                <img
                  src="/chat-icon.png"
                  alt="AI Assistant"
                  className="absolute inset-0 w-full h-full object-contain opacity-100 group-hover:opacity-0 transition-opacity duration-200"
                />
                <img
                  src="/pin-smile.png"
                  alt="AI Assistant Hover"
                  className="absolute inset-0 w-full h-full object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                />
              </div>
              
              {/* 명찰 */}
              <div className="text-gray-900 text-xs font-thin px-3 py-1">
                Ask Pin!
              </div>
            </button>
          </div>
          
          <InterviewAssistantPanel
            isOpen={floatingPanelOpen}
            onClose={() => setFloatingPanelOpen(false)}
            interview={interview}
            script={interview.cleaned_script || []}
            context={'interview'}
          />
        </>,
        document.body
      )}
    </div>
  )
}