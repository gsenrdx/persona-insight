'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { CleanedScriptItem } from '@/types/interview'
import { Interview } from '@/types/interview'
import { Search, MessageSquare, X, Plus, MoreVertical, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInterviewNotes } from '@/hooks/use-interview-notes'
import { useAuth } from '@/hooks/use-auth'

interface InterviewScriptViewerProps {
  script: CleanedScriptItem[]
  interview?: Interview
  className?: string
}


export default function InterviewScriptViewer({ script, interview, className }: InterviewScriptViewerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null)
  const [memoInput, setMemoInput] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyInput, setReplyInput] = useState('')
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const scriptContainerRef = useRef<HTMLDivElement>(null)
  const { profile } = useAuth()
  
  // DB 연동 훅 사용
  const { 
    notes, 
    getNotesByScriptId, 
    addNote, 
    deleteNote, 
    addReply, 
    deleteReply,
    isAddingNote,
    isDeletingNote 
  } = useInterviewNotes(interview?.id || '')
  
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
    <div className={cn("h-full overflow-auto bg-white", className)}>
      {/* 메인 콘텐츠 영역 */}
      <div className="relative overflow-hidden">
        {/* 스크립트 영역 */}
        <div className="h-full flex flex-col">
          {/* 헤더 영역 - 제목과 검색 바 */}
          <div className="px-8 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">대화 스크립트</h3>
                <p className="text-xs text-gray-500 mt-1">Interview Script</p>
              </div>
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
            </div>
          </div>

          {/* 스크립트 내용 */}
          <div className="flex-1 overflow-y-auto" ref={scriptContainerRef}>
            <div className="mx-auto px-8 py-6" style={{ maxWidth: (notes.length > 0 || editingMemoId) ? '1600px' : '1024px' }}>
            {filteredScript.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400 text-sm">
                  {searchTerm ? '검색 결과가 없습니다.' : '대화 내용이 없습니다.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredScript.map((item, index) => {
                  const scriptId = item.id.join('-')
                  const memo = memosByScriptId[scriptId]
                  const prevItem = index > 0 ? filteredScript[index - 1] : null
                  const isConsecutiveSameSpeaker = item.speaker === prevItem?.speaker
                  
                  return (
                    <div
                      key={scriptId}
                      className="relative flex gap-8"
                    >
                      {/* 왼쪽 화자 표시 영역 */}
                      <div className="w-12 flex-shrink-0 pt-0.5">
                        {!isConsecutiveSameSpeaker && (
                          <span className={cn(
                            "text-xs font-medium",
                            item.speaker === 'question' 
                              ? "text-gray-500" 
                              : "text-blue-600"
                          )}>
                            {item.speaker === 'question' ? 'Q.' : 'A.'}
                          </span>
                        )}
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
                        <div className="relative">
                          <div 
                            data-script-id={scriptId}
                            className={cn(
                              "text-sm leading-relaxed select-text",
                              item.speaker === 'question' 
                                ? "text-gray-600" 
                                : "text-gray-700",
                              memo && "bg-yellow-50 px-2 py-1 rounded border-l-2 border-yellow-300"
                            )}
                          >
                            {highlightText(item.cleaned_sentence, item.category || undefined)}
                          </div>
                          
                          {/* 호버 시 메모 추가 버튼 */}
                          {!memo && !editingMemoId && (
                            <button
                              onClick={() => setEditingMemoId(scriptId)}
                              className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                              title="메모 추가"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
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
                  )
                })}
              </div>
            )}
            </div>
          </div>
        </div>


      </div>
    </div>
  )
}