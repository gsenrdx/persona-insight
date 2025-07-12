'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Interview } from '@/types/interview'
import { cn } from '@/lib/utils'
import InterviewScriptViewer from './interview-script-viewer'
import InterviewInsights from './interview-insights'
import InterviewAssistantPanel from './interview-assistant-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronDown } from 'lucide-react'
import { EvidenceModal } from './evidence-modal'

interface InterviewDetailProps {
  interview: Interview
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onSectionsChange?: (sections: any[] | null, activeSection: string | null, scrollToSection: ((sectionName: string) => void) | null) => void
  hideHeader?: boolean
  onDownloadMenuChange?: (downloadHandlers: { 
    handleDownloadOriginal: () => void
    handleDownloadCleaned: () => void
  } | undefined) => void
  onBack?: () => void
}

// 다운로딩 탭 컨텐츠 컴포넌트
function DownloadingTabContent({ 
  interview, 
  onNavigateToScript 
}: { 
  interview: Interview
  onNavigateToScript: (scriptId: number[], type: 'pain' | 'need') => void 
}) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    title: string
    type: 'pain' | 'need'
    evidences: Array<{ speaker: string; cleaned_sentence: string; scriptId: number[] }>
  }>({
    isOpen: false,
    title: '',
    type: 'pain',
    evidences: []
  })

  const openModal = (title: string, type: 'pain' | 'need', evidences: Array<{ speaker: string; cleaned_sentence: string; scriptId: number[] }>) => {
    setModalState({
      isOpen: true,
      title,
      type,
      evidences
    })
  }

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }))
  }

  // 근거 문장들을 가져오는 함수 (스크립트 ID 정보 포함)
  const getEvidenceSentences = (evidenceIds: number[]) => {
    if (!interview.cleaned_script) return []
    
    return interview.cleaned_script.filter(item => 
      evidenceIds.some(ids => 
        Array.isArray(item.id) && item.id.some(id => ids === id)
      )
    ).map(item => ({
      speaker: item.speaker,
      cleaned_sentence: item.cleaned_sentence,
      scriptId: item.id // 스크립트 ID 정보 추가
    }))
  }

  const renderInsightItem = (item: any, type: 'pain' | 'need', index: number) => {
    const evidenceSentences = getEvidenceSentences(item.evidence)
    const itemId = `${type}-${index}`
    
    return (
      <div 
        key={itemId} 
        className={cn(
          "relative group",
          type === 'pain' && index % 3 === 0 && "md:col-start-1",
          type === 'pain' && index % 3 === 1 && "md:col-start-2",
          type === 'pain' && index % 3 === 2 && "md:col-start-3",
          type === 'need' && index % 3 === 0 && "md:col-start-1",
          type === 'need' && index % 3 === 1 && "md:col-start-2",
          type === 'need' && index % 3 === 2 && "md:col-start-3"
        )}
      >
        {/* 포스트잇 카드 */}
        <div 
          className={cn(
            "relative p-6 rounded-sm shadow-md transition-all duration-300",
            "hover:shadow-lg hover:-translate-y-1",
            evidenceSentences.length > 0 && "cursor-pointer",
            type === 'pain' ? [
              "bg-gradient-to-br from-red-50 to-pink-50"
            ] : [
              "bg-gradient-to-br from-emerald-50 to-green-50"
            ],
            // 살짝 기울어진 효과
            index % 4 === 0 && "rotate-1",
            index % 4 === 1 && "-rotate-1",
            index % 4 === 2 && "rotate-2",
            index % 4 === 3 && "-rotate-2",
          )}
          onClick={() => {
            if (evidenceSentences.length > 0) {
              openModal(item.description, type, evidenceSentences)
            }
          }}
          style={{
            transformOrigin: 'center center'
          }}
        >
          {/* 내용 */}
          <div className="relative z-10">
            <p className={cn(
              "text-sm leading-relaxed font-medium",
              type === 'pain' ? "text-red-900" : "text-emerald-900"
            )}>
              {item.description}
            </p>
            
            {evidenceSentences.length > 0 && (
              <div className={cn(
                "flex items-center gap-1 mt-4 text-xs font-medium",
                type === 'pain' 
                  ? "text-red-600" 
                  : "text-emerald-600"
              )}>
                <span>💬 근거 {evidenceSentences.length}개 보기</span>
              </div>
            )}
          </div>
          
          {/* 포스트잇 모서리 접힌 효과 */}
          <div className={cn(
            "absolute bottom-0 right-0 w-0 h-0",
            "border-l-[20px] border-b-[20px]",
            type === 'pain' 
              ? "border-l-transparent border-b-red-100" 
              : "border-l-transparent border-b-emerald-100"
          )} />
        </div>
      </div>
    )
  }

  return (
    <div className="px-10 py-8 bg-gradient-to-br from-gray-50 to-gray-100/50">
      {/* 포스트잇 보드 배경 효과 */}
      <div className="relative">
        {/* 주요 문제점 섹션 */}
        {interview.primary_pain_points && interview.primary_pain_points.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-gray-800 mb-8 flex items-center gap-2">
              <span className="text-2xl">🚨</span>
              주요 문제점
              <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                {interview.primary_pain_points.length}
              </span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {interview.primary_pain_points.map((painPoint, index) => 
                renderInsightItem(painPoint, 'pain', index)
              )}
            </div>
          </div>
        )}

        {/* 주요 니즈 섹션 */}
        {interview.primary_needs && interview.primary_needs.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-8 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              주요 니즈
              <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                {interview.primary_needs.length}
              </span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {interview.primary_needs.map((need, index) => 
                renderInsightItem(need, 'need', index)
              )}
            </div>
          </div>
        )}

        {/* 모든 데이터가 없는 경우 */}
        {(!interview.primary_pain_points || interview.primary_pain_points.length === 0) && 
         (!interview.primary_needs || interview.primary_needs.length === 0) && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="mb-4 text-6xl">📌</div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">아직 포스트잇이 없어요</h3>
              <p className="text-sm text-gray-500">인터뷰 분석이 완료되면 주요 문제점과 니즈가<br />포스트잇 형태로 표시됩니다</p>
            </div>
          </div>
        )}
      </div>

      {/* 근거 모달 */}
      <EvidenceModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        type={modalState.type}
        evidences={modalState.evidences}
        onNavigateToScript={(scriptId) => onNavigateToScript(scriptId, modalState.type)}
      />
    </div>
  )
}

export default function InterviewDetail({ interview, onSectionsChange, onDownloadMenuChange }: InterviewDetailProps) {
  const [floatingPanelOpen, setFloatingPanelOpen] = useState(false)
  
  // 태그 필터 상태 (체크박스 형태)
  const [selectedFilters, setSelectedFilters] = useState<Set<'pain' | 'need'>>(new Set())
  
  // 탭 상태 관리 (데스크톱 및 모바일용)
  const [desktopActiveTab, setDesktopActiveTab] = useState('script')
  const [mobileActiveTab, setMobileActiveTab] = useState('summary')
  
  // 하이라이트할 스크립트 ID 상태
  const [highlightedScriptId, setHighlightedScriptId] = useState<number[] | null>(null)
  
  // 리사이저 관련 상태
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('interview-panel-width')
        return saved ? parseFloat(saved) : 40
      } catch {
        return 40
      }
    }
    return 40
  })
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  
  // 리사이저 마우스 이벤트 핸들러 - 조건문 밖으로 이동
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
  
  // 스크립트로 이동하는 함수
  const handleNavigateToScript = (scriptId: number[], _type: 'pain' | 'need') => {
    // 모든 필터 해제 (전체 맥락을 볼 수 있도록)
    setSelectedFilters(new Set())
    
    // 스크립트 탭으로 전환
    setDesktopActiveTab('script')
    setMobileActiveTab('script')
    
    // 스크립트 아이템 하이라이트
    setHighlightedScriptId(scriptId)
    
    // 스크롤을 위한 지연 시간 (탭 전환 및 필터 적용 후)
    setTimeout(() => {
      // 스크립트 아이템 ID로 DOM 요소 찾기 (scriptId 배열을 문자열로 변환)
      const scriptIdStr = scriptId.join('-')
      const element = document.getElementById(`script-item-${scriptIdStr}`)
      
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
        
        // 하이라이트 제거 (3초 후)
        setTimeout(() => {
          setHighlightedScriptId(null)
        }, 3000)
      }
    }, 200) // 필터 적용을 위해 시간을 조금 늘림
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

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* 분석 중일 때 오버레이 */}
      {interview.status === 'processing' && (
        <div className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center">
          <img 
            src="/assets/pin/pin-processing.png" 
            alt="Pin 분석 중"
            className="w-48 h-48 mb-6"
          />
          <p className="text-xl font-semibold text-gray-700 mb-2">
            Pin이 인터뷰를 분석하고 있어요!
          </p>
          <p className="text-sm text-gray-500">
            잠시만 기다려주세요...
          </p>
          <div className="flex gap-1 mt-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}
      
      {/* 리사이징 중일 때 오버레이 */}
      {isResizing && (
        <div className="fixed inset-0 z-50 cursor-col-resize" />
      )}
      
      {/* 데스크톱: 좌우 분할 레이아웃 */}
      <div className="hidden lg:flex flex-1 min-h-0" ref={containerRef}>
        {/* 좌측: 인사이트 */}
        <div 
          className="h-full flex flex-col"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <div className="border-b border-gray-200 bg-white">
            <div className="h-full flex items-center px-8" style={{ height: '57px' }}>
              <h2 className="text-base font-semibold text-gray-900">인터뷰 요약</h2>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <InterviewInsights 
              interview={interview} 
            />
          </div>
        </div>
        
        {/* 리사이저 핸들 */}
        <div 
          className={cn(
            "relative w-px hover:w-1 transition-all duration-150 cursor-col-resize",
            "bg-gray-300 hover:bg-gray-400 group",
            isResizing && "w-1 bg-blue-500"
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-6 flex items-center justify-center" />
        </div>
        
        {/* 우측: 스크립트 & 다운로딩 탭 */}
        <div 
          className="h-full flex flex-col flex-1"
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          <Tabs value={desktopActiveTab} onValueChange={setDesktopActiveTab} className="flex flex-col h-full">
            <div className="border-b border-gray-200 bg-white">
              <div className="h-full flex items-center px-8" style={{ height: '57px' }}>
                <TabsList className="h-full bg-transparent border-none p-0 gap-8">
                  <TabsTrigger 
                    value="script" 
                    className="relative h-full px-0 text-base font-semibold text-gray-400 hover:text-gray-600 data-[state=active]:text-gray-900 border-none bg-transparent shadow-none outline-none focus-visible:ring-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    스크립트
                  </TabsTrigger>
                  <TabsTrigger 
                    value="downloading" 
                    className="relative h-full px-0 text-base font-semibold text-gray-400 hover:text-gray-600 data-[state=active]:text-gray-900 border-none bg-transparent shadow-none outline-none focus-visible:ring-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    다운로딩
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            
            <TabsContent value="script" className="flex-1 m-0 overflow-auto">
              <InterviewScriptViewer 
                script={interview.cleaned_script || []} 
                interview={interview}
                className=""
                onSectionsChange={handleScriptSectionsChange}
                canEdit={true}
                tagFilter={selectedFilters}
                onTagFilterChange={handleTagFilterChange}
                highlightedScriptId={highlightedScriptId}
              />
            </TabsContent>
            
            <TabsContent value="downloading" className="flex-1 m-0 overflow-auto">
              <DownloadingTabContent 
                interview={interview} 
                onNavigateToScript={handleNavigateToScript}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 모바일: 탭 기반 레이아웃 */}
      <div className="lg:hidden flex-1">
        <Tabs value={mobileActiveTab} onValueChange={setMobileActiveTab} className="flex flex-col h-full">
          <div className="border-b border-gray-200 bg-white">
            <div className="h-full flex items-center px-4 overflow-x-auto" style={{ height: '57px' }}>
              <TabsList className="h-full bg-transparent border-none p-0 gap-6 whitespace-nowrap">
                <TabsTrigger 
                  value="summary" 
                  className="relative h-full px-0 text-base font-semibold text-gray-400 hover:text-gray-600 data-[state=active]:text-gray-900 border-none bg-transparent shadow-none outline-none focus-visible:ring-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  인터뷰 요약
                </TabsTrigger>
                <TabsTrigger 
                  value="script" 
                  className="relative h-full px-0 text-base font-semibold text-gray-400 hover:text-gray-600 data-[state=active]:text-gray-900 border-none bg-transparent shadow-none outline-none focus-visible:ring-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  스크립트
                </TabsTrigger>
                <TabsTrigger 
                  value="downloading" 
                  className="relative h-full px-0 text-base font-semibold text-gray-400 hover:text-gray-600 data-[state=active]:text-gray-900 border-none bg-transparent shadow-none outline-none focus-visible:ring-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  다운로딩
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
          
          <TabsContent value="summary" className="flex-1 m-0 overflow-auto">
            <InterviewInsights 
              interview={interview} 
            />
          </TabsContent>
          
          <TabsContent value="script" className="flex-1 m-0 overflow-auto">
            <InterviewScriptViewer 
              script={interview.cleaned_script || []} 
              interview={interview}
              className=""
              onSectionsChange={handleScriptSectionsChange}
              canEdit={false}
              tagFilter={selectedFilters}
              onTagFilterChange={handleTagFilterChange}
              highlightedScriptId={highlightedScriptId}
            />
          </TabsContent>
          
          <TabsContent value="downloading" className="flex-1 m-0 overflow-auto">
            <DownloadingTabContent 
              interview={interview} 
              onNavigateToScript={handleNavigateToScript}
            />
          </TabsContent>
        </Tabs>
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