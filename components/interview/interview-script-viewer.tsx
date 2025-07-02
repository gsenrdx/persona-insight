'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { CleanedScriptItem, ScriptSection } from '@/types/interview'
import { Interview } from '@/types/interview'
import { Search, MessageSquare, X, Plus, MoreVertical, Trash2, ChevronDown, ChevronUp, Download, FileText, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInterviewNotesRealtime } from '@/hooks/use-interview-notes-realtime'
import { useAuth } from '@/hooks/use-auth'
import FloatingMemoButton from '@/components/ui/floating-memo-button'
import AIQuestionBar from '@/components/ui/ai-question-bar'
import InterviewAssistantPanel from './interview-assistant-panel'

interface InterviewScriptViewerProps {
  script: CleanedScriptItem[]
  interview?: Interview
  className?: string
}


export default function InterviewScriptViewer({ script, interview, className }: InterviewScriptViewerProps) {
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
  const downloadMenuRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const [floatingPanelOpen, setFloatingPanelOpen] = useState(false)
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
      @media (prefers-color-scheme: dark) {
        .interview-script-content ::selection {
          background-color: rgba(35, 131, 226, 0.4);
          color: inherit;
        }
        
        .interview-script-content ::-moz-selection {
          background-color: rgba(35, 131, 226, 0.4);
          color: inherit;
        }
        
        .notion-comment-highlight {
          background-color: rgba(255, 235, 137, 0.15);
        }
        
        .notion-comment-highlight:hover {
          background-color: rgba(255, 235, 137, 0.25);
        }
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])
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
  const { profile, session } = useAuth()
  
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

  // 필터링된 스크립트
  const filteredScript = useMemo(() => {
    if (!searchTerm) return script
    
    return script.filter(item =>
      item.cleaned_sentence.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [script, searchTerm])



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
    // 스크립트를 텍스트 형식으로 변환
    let content = `인터뷰 스크립트\n`
    content += `제목: ${interview?.title || '제목 없음'}\n`
    content += `날짜: ${interview?.interview_date || new Date().toISOString().split('T')[0]}\n`
    content += `${'='.repeat(50)}\n\n`

    script.forEach((item, index) => {
      if (index > 0 && script[index - 1].speaker !== item.speaker) {
        content += '\n'
      }
      
      const speaker = item.speaker === 'question' ? 'Q' : 'A'
      const category = item.category ? ` [${item.category === 'painpoint' ? 'Pain Point' : 'Need'}]` : ''
      
      content += `${speaker}: ${item.cleaned_sentence}${category}\n`
    })

    // Blob 생성 및 다운로드
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
    const handleScroll = () => {
      if (!scriptContainerRef.current || !interview?.script_sections) return
      
      const container = scriptContainerRef.current
      const scrollTop = container.scrollTop
      const sections = interview.script_sections as ScriptSection[]
      
      // 현재 보이는 섹션 찾기
      for (const section of sections) {
        const sectionElement = sectionRefs.current[section.sector_name]
        if (sectionElement) {
          const rect = sectionElement.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()
          
          if (rect.top >= containerRect.top && rect.top <= containerRect.top + 200) {
            setActiveSection(section.sector_name)
            break
          }
        }
      }
    }
    
    const container = scriptContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [interview?.script_sections])
  
  // 목차 클릭 시 스크롤
  const scrollToSection = (sectionName: string) => {
    const safeId = sectionName.replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '')
    const element = document.getElementById(`section-${safeId}`)
    
    if (element && scriptContainerRef.current) {
      const container = scriptContainerRef.current;
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      const yOffset = -80; // 80px 위로 오프셋
      const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) + yOffset;
      
      container.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  }
  
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
              <div>
                <h3 className="text-base font-semibold text-gray-900">대화 스크립트</h3>
                <p className="text-xs text-gray-500 mt-1">Interview Script</p>
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
                  
                  return filteredScript.map((item, index) => {
                    const scriptId = item.id.join('-')
                    const memo = memosByScriptId[scriptId]
                    const prevItem = index > 0 ? filteredScript[index - 1] : null
                    const isConsecutiveSameSpeaker = item.speaker === prevItem?.speaker
                    
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
                    
                    return (
                      <div key={scriptId}>
                        {/* 섹션 헤더 */}
                        {isNewSection && (
                          <div 
                            id={`section-${currentSection.sector_name.replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '')}`}
                            className={cn(
                            "section-header mb-4 pb-2 border-b",
                            currentSection.is_main_content 
                              ? "border-gray-200" 
                              : "border-gray-100"
                          )}>
                            <div className="flex items-center gap-2">
                              <Hash className={cn(
                                "w-4 h-4",
                                currentSection.is_main_content
                                  ? "text-gray-600"
                                  : "text-gray-400"
                              )} />
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
                        
                        {/* 기존 스크립트 아이템 */}
                        <div
                          className={cn(
                        "relative flex gap-8",
                        currentSection && !currentSection.is_main_content && "opacity-60"
                      )}
                    >
                      {/* 왼쪽 화자 표시 영역 */}
                      <div className="w-12 flex-shrink-0">
                        <div className={cn(
                          "text-sm leading-relaxed", // 내용과 동일한 폰트 크기와 line-height
                          item.category && "mt-5" // 카테고리가 있을 때 위치 조정
                        )}>
                          {!isConsecutiveSameSpeaker && (
                            <span className={cn(
                              "font-medium",
                              item.speaker === 'question' 
                                ? "text-gray-500" 
                                : "text-blue-600"
                            )}>
                              {item.speaker === 'question' ? 'Q.' : 'A.'}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* 스크립트 내용 */}
                      <div className="flex-1 relative group">
                        {/* 카테고리 라벨 */}
                        {item.category && (
                          <div className="mb-1">
                            <span className={cn(
                              "text-xs",
                              item.category === 'painpoint' 
                                ? "text-red-600" 
                                : "text-blue-600"
                            )}>
                              • {item.category === 'painpoint' ? 'Pain Point' : 'Need'}
                            </span>
                          </div>
                        )}

                        {/* 대화 내용 */}
                        <div className="relative group">
                          <div 
                            data-script-id={scriptId}
                            className={cn(
                              "text-sm leading-relaxed select-text",
                              item.speaker === 'question' 
                                ? "text-gray-600" 
                                : "text-gray-700",
                              memo && "notion-comment-highlight"
                            )}
                          >
                            {highlightText(item.cleaned_sentence, item.category || undefined)}
                          </div>
                          
                          {/* 호버 시 세로 도트 버튼 */}
                          {!editingMemoId && (
                            <button
                              onClick={() => {
                                // 문장 전체 선택
                                const scriptElement = document.querySelector(`[data-script-id="${scriptId}"]`)
                                if (scriptElement) {
                                  const range = document.createRange()
                                  range.selectNodeContents(scriptElement)
                                  const selection = window.getSelection()
                                  selection?.removeAllRanges()
                                  selection?.addRange(range)
                                  
                                  // 선택 후 약간의 지연을 주어 플로팅 버튼이 나타나도록 함
                                  setTimeout(() => {
                                    // mouseup 이벤트를 수동으로 트리거하여 플로팅 버튼 표시
                                    const event = new MouseEvent('mouseup', {
                                      bubbles: true,
                                      cancelable: true,
                                      view: window
                                    })
                                    document.dispatchEvent(event)
                                  }, 10)
                                }
                              }}
                              className="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 hover:bg-gray-100 rounded"
                              title="메모 추가"
                            >
                              <svg className="w-3 h-4 text-gray-400" viewBox="0 0 12 16" fill="currentColor">
                                <circle cx="6" cy="2" r="1.5" />
                                <circle cx="6" cy="8" r="1.5" />
                                <circle cx="6" cy="14" r="1.5" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* 메모 표시 영역 */}
                      {(memo || editingMemoId === scriptId) && (
                        <div className="w-96 flex-shrink-0 pl-8">
                          {editingMemoId === scriptId && !memo ? (
                            /* 메모 작성 UI - 노션 스타일 */
                            <div className="relative">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <textarea
                                  autoFocus
                                  value={memoInput}
                                  onChange={(e) => setMemoInput(e.target.value)}
                                  placeholder="댓글을 남겨주세요..."
                                  className="w-full p-0 text-sm bg-transparent border-0 focus:outline-none resize-none text-gray-700 placeholder-gray-400"
                                  rows={2}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault()
                                      if (memoInput.trim()) {
                                        handleAddMemo(scriptId)
                                      }
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingMemoId(null)
                                      setMemoInput('')
                                    }
                                  }}
                                />
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-gray-400">Enter로 작성, Shift+Enter로 줄바꿈</span>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingMemoId(null)
                                        setMemoInput('')
                                      }}
                                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                                    >
                                      취소
                                    </button>
                                    <button
                                      onClick={() => handleAddMemo(scriptId)}
                                      disabled={!memoInput.trim() || isAddingNote}
                                      className="text-xs text-gray-700 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      댓글
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : memo && (
                          <div className="relative group/memo">
                            <div className="">
                              {/* 메모 */}
                              <div className="flex gap-3">
                                <div className="flex-shrink-0">
                                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-600">
                                      {memo.created_by_profile?.name?.charAt(0) || 'U'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium text-gray-900">{memo.created_by_profile?.name || '사용자'}</span>
                                        <span className="text-xs text-gray-400">{new Date(memo.created_at).toLocaleDateString('ko-KR')}</span>
                                      </div>
                                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{memo.content}</p>
                                    </div>
                                    {memo.created_by === profile?.id && (
                                      <button
                                        onClick={() => handleDeleteNote(memo.id)}
                                        className="opacity-0 group-hover/memo:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded flex-shrink-0"
                                        disabled={isDeletingNote}
                                        title="삭제"
                                      >
                                        <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                                      </button>
                                    )}
                                  </div>
                              
                                  {/* 대댓글 목록 */}
                                  {memo.replies && memo.replies.length > 0 && (
                                    <div className="mt-3 space-y-3">
                                      {/* 댓글 개수 표시 및 토글 버튼 */}
                                      {memo.replies.length > 2 && !expandedReplies.has(memo.id) && (
                                        <button
                                          onClick={() => {
                                            const newExpanded = new Set(expandedReplies)
                                            newExpanded.add(memo.id)
                                            setExpandedReplies(newExpanded)
                                          }}
                                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                          {memo.replies.length}개 댓글 모두 보기
                                        </button>
                                      )}
                                      
                                      {/* 댓글 목록 */}
                                      <div className={cn(
                                        "space-y-3",
                                        memo.replies.length > 2 && !expandedReplies.has(memo.id) && "hidden"
                                      )}>
                                        {memo.replies.map(reply => (
                                          <div key={reply.id} className="flex gap-3 group/reply">
                                            <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center flex-shrink-0">
                                              <span className="text-[10px] font-medium text-gray-500">
                                                {reply.created_by_profile?.name?.charAt(0) || 'U'}
                                              </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium text-gray-900">{reply.created_by_profile?.name || '사용자'}</span>
                                                    <span className="text-xs text-gray-400">{new Date(reply.created_at).toLocaleDateString('ko-KR')}</span>
                                                  </div>
                                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                                                </div>
                                                {reply.created_by === profile?.id && (
                                                  <button
                                                    onClick={() => handleDeleteReply(memo.id, reply.id)}
                                                    className="opacity-0 group-hover/reply:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded flex-shrink-0"
                                                    title="삭제"
                                                  >
                                                    <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                  
                                        {/* 접기 버튼 */}
                                        {memo.replies.length > 2 && expandedReplies.has(memo.id) && (
                                          <button
                                            onClick={() => {
                                              const newExpanded = new Set(expandedReplies)
                                              newExpanded.delete(memo.id)
                                              setExpandedReplies(newExpanded)
                                            }}
                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                          >
                                            접기
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                              
                                  {/* 대댓글 입력 폼 */}
                                  <div className="mt-3">
                                    {replyingTo === memo.id ? (
                                      <div className="bg-gray-50 rounded-lg p-3">
                                        <textarea
                                          autoFocus
                                          value={replyInput}
                                          onChange={(e) => setReplyInput(e.target.value)}
                                          placeholder="답글을 남겨주세요..."
                                          className="w-full p-0 text-sm bg-transparent border-0 focus:outline-none resize-none text-gray-700 placeholder-gray-400"
                                          rows={2}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault()
                                              if (replyInput.trim()) {
                                                handleAddReply(memo.id)
                                              }
                                            }
                                            if (e.key === 'Escape') {
                                              setReplyingTo(null)
                                              setReplyInput('')
                                            }
                                          }}
                                        />
                                        <div className="flex items-center justify-between mt-2">
                                          <span className="text-xs text-gray-400">Enter로 작성</span>
                                          <div className="flex gap-1">
                                            <button
                                              onClick={() => {
                                                setReplyingTo(null)
                                                setReplyInput('')
                                              }}
                                              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                                            >
                                              취소
                                            </button>
                                            <button
                                              onClick={() => handleAddReply(memo.id)}
                                              disabled={!replyInput.trim()}
                                              className="text-xs text-gray-700 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                              답글
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setReplyingTo(memo.id)}
                                        className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                                      >
                                        답글 달기
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          )}
                        </div>
                      )}
                    </div>
                      </div>
                    )
                  });
                })()}
              </div>
            )}
            
            {/* AI 질문 바 - 스크롤 컨테이너 내부에 위치 */}
            <AIQuestionBar
              isOpen={aiQuestionBarOpen}
              onClose={() => {
                setAiQuestionBarOpen(false)
                setSelectedTextForAI('')
                setAiQuestionPosition(null)
                // Clear the text selection
                window.getSelection()?.removeAllRanges()
              }}
              initialText={selectedTextForAI}
              selectedText={selectedTextForAI}
              position={aiQuestionPosition}
              onSubmit={async (question, onStream, onComplete) => {
                try {
                  const response = await fetch('/api/chat/interview-question', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      question,
                      selectedText: selectedTextForAI,
                      interviewId: interview?.id,
                      fullScript: script
                    })
                  })

                  if (!response.ok) {
                    const errorText = await response.text()
                    throw new Error(errorText || 'AI 응답을 받는데 실패했습니다')
                  }

                  // 스트리밍 응답 처리
                  const reader = response.body?.getReader()
                  const decoder = new TextDecoder()
                  let buffer = ''

                  if (reader) {
                    while (true) {
                      const { done, value } = await reader.read()
                      if (done) break
                      
                      buffer += decoder.decode(value, { stream: true })
                      const lines = buffer.split('\n')
                      
                      // 마지막 불완전한 줄은 버퍼에 남김
                      buffer = lines.pop() || ''
                      
                      for (const line of lines) {
                        const trimmedLine = line.trim()
                        if (!trimmedLine) continue
                        
                        if (trimmedLine.startsWith('data: ')) {
                          const dataContent = trimmedLine.slice(6)
                          
                          if (dataContent === '[DONE]') {
                            // 스트리밍 완료 시그널
                            return
                          }
                          
                          try {
                            const data = JSON.parse(dataContent)
                            console.log('MISO API Response:', data) // 디버깅용
                            
                            // 다양한 응답 필드 지원
                            const content = data.answer || data.content || data.message || data.text || data.response || 
                                          data.choices?.[0]?.delta?.content || data.choices?.[0]?.message?.content
                            
                            if (content) {
                              onStream(content)
                            } else {
                              console.warn('Unknown response format:', data)
                            }
                          } catch (e) {
                            console.error('JSON parsing failed:', dataContent, e)
                          }
                        }
                      }
                    }
                  }
                  
                  // 스트리밍 완료
                  onComplete()
                } catch (error) {
                  onStream('\n\n❌ AI 응답을 받는 중 오류가 발생했습니다. 다시 시도해주세요.')
                  onComplete()
                }
              }}
            />
            </div>
          </div>
        </div>

        {/* 플로팅 메모 버튼 */}
        <FloatingMemoButton 
          onAddMemo={handleFloatingMemoAdd}
          onAskMiso={(text) => {
            setSelectedTextForAI(text)
            // 선택된 텍스트의 위치 계산
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0)
              const rect = range.getBoundingClientRect()
              
              // 스크롤 컨테이너의 위치 가져오기
              const scrollContainer = scriptContainerRef.current
              if (scrollContainer) {
                const containerRect = scrollContainer.getBoundingClientRect()
                const scrollTop = scrollContainer.scrollTop
                
                // 컨테이너 기준 상대 위치 계산
                const relativeX = rect.left - containerRect.left + rect.width / 2
                const relativeY = rect.bottom - containerRect.top + scrollTop + 10
                
                // AI 질문 바의 너비 (800px)의 절반
                const halfBarWidth = 400
                
                // 왼쪽 경계 체크 및 조정
                const adjustedX = Math.max(halfBarWidth + 20, relativeX)
                
                setAiQuestionPosition({
                  x: adjustedX,
                  y: relativeY
                })
              }
            }
            setAiQuestionBarOpen(true)
          }}
        />
      </div>
      
      {/* 우측 하단 플로팅 AI 도우미 버튼 */}
      {interview && (
        <>
          {/* 플로팅 버튼 */}
          <div className="fixed right-6 bottom-6 z-[100]">
            <button 
              onClick={() => setFloatingPanelOpen(!floatingPanelOpen)}
              className={cn(
                "relative",
                "hover:scale-105 active:scale-95",
                "transition-all duration-200",
                floatingPanelOpen && "scale-0 opacity-0 pointer-events-none"
              )}
            >
              <img 
                src="/chat-icon.png" 
                alt="AI 도우미" 
                className="w-16 h-16 drop-shadow-lg hover:drop-shadow-xl transition-all duration-200"
              />
            </button>
          </div>
          
          {/* AI 도우미 패널 */}
          <InterviewAssistantPanel
            isOpen={floatingPanelOpen}
            onClose={() => setFloatingPanelOpen(false)}
            interview={interview}
            script={script}
            activeSection={activeSection}
            onSectionClick={scrollToSection}
            session={session}
          />
        </>
      )}
    </div>
  )
}