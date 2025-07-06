'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { CleanedScriptItem, ScriptSection } from '@/types/interview'
import { Interview } from '@/types/interview'
import { Search, MessageSquare, X, Plus, MoreVertical, Trash2, ChevronDown, ChevronUp, Download, FileText, ListOrdered, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInterviewNotesRealtime } from '@/hooks/use-interview-notes'
import { useAuth } from '@/hooks/use-auth'
import FloatingMemoButton from '@/components/ui/floating-memo-button'
import AIQuestionBar from '@/components/ui/ai-question-bar'
import InterviewAssistantPanel from './interview-assistant-panel'
import EditableScriptItem from './editable-script-item'
import { useInterviewScriptBroadcast } from '@/lib/realtime/broadcast/hooks/use-interview-script-broadcast'

interface InterviewScriptViewerProps {
  script: CleanedScriptItem[]
  interview?: Interview
  className?: string
  onSectionsChange?: (sections: ScriptSection[] | null, activeSection: string | null, scrollToSection: (sectionName: string) => void) => void
}

export default function InterviewScriptViewer({ script, interview, className, onSectionsChange }: InterviewScriptViewerProps) {
  const { user, profile, session } = useAuth()
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
  const downloadMenuRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const [floatingPanelOpen, setFloatingPanelOpen] = useState(false)
  
  // Realtime script editing
  const {
    scripts,
    presence,
    updateScript,
    updatePresence,
    getPresenceForScript,
    userColor,
    isConnected
  } = useInterviewScriptBroadcast({
    interviewId: interview?.id || '',
    enabled: !!interview?.id
  })
  
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
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null)
  const [memoInput, setMemoInput] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyInput, setReplyInput] = useState('')
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
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
  
  // DB 연동 훅 사용 (Realtime)
  const { 
    notes, 
    getNotesByScriptId, 
    addNote, 
    deleteNote, 
    addReply, 
    deleteReply,
    isAddingNote,
    isDeletingNote 
  } = useInterviewNotesRealtime(interview?.id || '')
  
  // 스크립트 ID별 메모 맵핑
  const memosByScriptId = useMemo(() => {
    const map: Record<string, typeof notes[0]> = {}
    notes.forEach(note => {
      note.script_item_ids.forEach(scriptId => {
        map[scriptId] = note
      })
    })
    return map
  }, [notes])

  // 실시간 업데이트된 스크립트 생성
  const realtimeScript = useMemo(() => {
    // scripts Map에서 업데이트된 항목들을 가져와서 원본 script와 병합
    return script.map(item => {
      const scriptId = item.id.join('-')
      const updatedScript = scripts.get(scriptId)
      
      if (updatedScript) {
        // 실시간 업데이트된 내용이 있으면 적용
        return {
          ...item,
          cleaned_sentence: updatedScript.cleaned_sentence
        }
      }
      
      return item
    })
  }, [script, scripts])
  
  // 필터링된 스크립트
  const filteredScript = useMemo(() => {
    if (!searchTerm) return realtimeScript
    
    return realtimeScript.filter(item =>
      item.cleaned_sentence.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [realtimeScript, searchTerm])

  const handleAddMemo = async (scriptId: string) => {
    if (!memoInput.trim()) return

    await addNote({
      scriptItemIds: [scriptId],
      content: memoInput.trim()
    })
    
    setMemoInput('')
    setEditingMemoId(null)
  }

  const handleAddReply = async (noteId: string) => {
    if (!replyInput.trim()) return

    await addReply({
      noteId,
      content: replyInput.trim()
    })

    setReplyInput('')
    setReplyingTo(null)
  }

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote(noteId)
  }

  const handleDeleteReply = async (noteId: string, replyId: string) => {
    await deleteReply({ noteId, replyId })
  }

  const handleFloatingMemoAdd = (text: string, range: Range) => {
    // 선택된 텍스트가 포함된 스크립트 아이템 찾기
    const scriptElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentElement
      : range.commonAncestorContainer as Element
    
    const scriptContainer = scriptElement?.closest('[data-script-id]')
    if (scriptContainer) {
      const scriptId = scriptContainer.getAttribute('data-script-id')
      if (scriptId) {
        setMemoInput('')
        setEditingMemoId(scriptId)
      }
    }
  }

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

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setDownloadMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 원본 인터뷰 텍스트 다운로드
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
    setDownloadMenuOpen(false)
  }

  // 정리된 스크립트 다운로드
  const handleDownloadCleaned = () => {
    setDownloadMenuOpen(false)
    
    // 정리된 스크립트 텍스트 생성
    let content = `${interview?.title || '인터뷰 스크립트'}\n`
    content += `날짜: ${interview?.interview_date ? new Date(interview.interview_date).toLocaleDateString('ko-KR') : '날짜 없음'}\n`
    content += '='.repeat(50) + '\n\n'
    
    realtimeScript.forEach(item => {
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
    setDownloadMenuOpen(false)
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
      aiQuestionBarOpen && "ai-selection-active maintain-selection",
      className
    )}>
      
      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 relative overflow-hidden">
        {/* 스크립트 영역 */}
        <div className="h-full flex flex-col">
          {/* 헤더 영역 - 제목과 검색 바 */}
          <div className="px-8 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">대화 스크립트</h3>
                  <p className="text-xs text-gray-500 mt-1">Interview Script</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 transition-all"
                  />
                </div>
                <div className="relative" ref={downloadMenuRef}>
                  <button
                    onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    title="다운로드 옵션"
                  >
                    <Download className="w-4 h-4" />
                    다운로드
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {downloadMenuOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                      <button
                        onClick={handleDownloadOriginal}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        disabled={!interview?.raw_text}
                      >
                        <FileText className="w-4 h-4" />
                        원본 인터뷰
                      </button>
                      <div className="border-t border-gray-100" />
                      <button
                        onClick={handleDownloadCleaned}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        정리된 스크립트
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 스크립트 내용 */}
          <div className="flex-1 overflow-y-auto relative" ref={scriptContainerRef}>
            <div className="mx-auto px-8 py-6" style={{ maxWidth: (notes.length > 0 || editingMemoId) ? '1600px' : '1024px' }}>
              {filteredScript.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-400 text-sm">
                    {searchTerm ? '검색 결과가 없습니다.' : '대화 내용이 없습니다.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 섹션별로 그룹핑하여 렌더링 */}
                  {(() => {
                    const sections = interview?.script_sections as ScriptSection[] || [];
                    let lastSectionName = '';
                    
                    // 섹션 인덱스를 찾기 위한 맵
                    const sectionIndexMap = new Map();
                    sections.forEach((section, idx) => {
                      sectionIndexMap.set(section.sector_name, idx + 1);
                    });
                    
                    return filteredScript.map((item, index) => {
                      const scriptId = item.id.join('-')
                      // index를 포함한 고유한 key 생성
                      const uniqueKey = `${scriptId}-${index}`
                      const memo = memosByScriptId[scriptId]
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
                      
                      // 섹션이 바뀌면 연속된 화자여도 새로 표시
                      const isConsecutiveSameSpeaker = item.speaker === prevItem?.speaker && !isNewSection
                      
                      return (
                        <div key={uniqueKey}>
                          {/* 섹션 헤더 */}
                          {isNewSection && (
                            <div 
                              id={`section-${currentSection.sector_name.replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '')}`}
                              ref={(el) => {
                                if (el) sectionRefs.current[currentSection.sector_name] = el
                              }}
                              className={cn(
                                "section-header mb-4 pb-2 border-b",
                                currentSection.is_main_content 
                                  ? "border-gray-200" 
                                  : "border-gray-100"
                              )}>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "w-6 h-6 rounded flex items-center justify-center text-xs font-bold",
                                  currentSection.is_main_content
                                    ? "bg-gray-200 text-gray-700"
                                    : "bg-gray-100 text-gray-500"
                                )}>
                                  {sectionIndexMap.get(currentSection.sector_name)}
                                </span>
                                <h3 className={cn(
                                  "font-medium",
                                  currentSection.is_main_content
                                    ? "text-gray-900 text-sm"
                                    : "text-gray-500 text-xs"
                                )}>
                                  {currentSection.sector_name}
                                </h3>
                              </div>
                            </div>
                          )}
                          
                          {/* Script item wrapper */}
                          <div className="relative">
                            {/* Editable script item */}
                            <EditableScriptItem
                              item={item}
                              index={index}
                              isConsecutiveSameSpeaker={isConsecutiveSameSpeaker}
                              presences={getPresenceForScript(scriptId)}
                              onEdit={updateScript}
                              onPresenceUpdate={updatePresence}
                              userColor={userColor}
                              className={cn(
                                currentSection && !currentSection.is_main_content && "opacity-60"
                              )}
                            />
                          </div>
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
      
      {/* AI Floating Button */}
      {interview && (
        <>
          <div className="fixed bottom-8 right-8 z-40">
            <button
              onClick={() => setFloatingPanelOpen(true)}
              className="group relative"
              title="AI 도우미"
            >
              <img
                src="/miso-ai-icon.png"
                alt="AI Assistant"
                className="w-16 h-16 drop-shadow-lg hover:drop-shadow-xl transition-all duration-200"
              />
            </button>
          </div>
          
          {/* AI 도우미 패널 */}
          <InterviewAssistantPanel
            isOpen={floatingPanelOpen}
            onClose={() => setFloatingPanelOpen(false)}
            interview={interview}
            script={realtimeScript}
            session={session}
          />
        </>
      )}
    </div>
  )
}