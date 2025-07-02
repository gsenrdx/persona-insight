'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { X, MessageSquare, Hash, ListOrdered, ChevronLeft, Lightbulb, Target, Search } from 'lucide-react'
import { ScriptSection } from '@/types/interview'
import { Interview, CleanedScriptItem } from '@/types/interview'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface InterviewAssistantPanelProps {
  isOpen: boolean
  onClose: () => void
  interview?: Interview | null
  script?: CleanedScriptItem[]
  activeSection?: string | null
  onSectionClick?: (sectionName: string) => void
  session?: any
  hideToc?: boolean
  context?: 'interview' | 'insights'
  insightData?: any
}

export default function InterviewAssistantPanel({
  isOpen,
  onClose,
  interview,
  script = [],
  activeSection,
  onSectionClick,
  session,
  hideToc = false,
  context = 'interview',
  insightData
}: InterviewAssistantPanelProps) {
  const [currentView, setCurrentView] = useState<'main' | 'toc' | 'answer'>('main')
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleQuickAction = async (action: string) => {
    let prompt = ''
    if (context === 'interview') {
      switch (action) {
        case 'summary':
          prompt = '이 인터뷰의 핵심 내용을 3-5개의 bullet point로 요약해주세요.'
          break
        case 'insights':
          prompt = '이 인터뷰에서 발견된 주요 Pain Point와 Needs를 분석해주세요.'
          break
        case 'action':
          prompt = '이 인터뷰 결과를 바탕으로 다음에 취해야 할 액션 아이템을 제안해주세요.'
          break
      }
    } else if (context === 'insights') {
      switch (action) {
        case 'summary':
          prompt = '현재 선택된 인사이트의 핵심 내용을 요약해주세요.'
          break
        case 'insights':
          prompt = '이 인사이트가 비즈니스에 미치는 영향을 분석해주세요.'
          break
        case 'action':
          prompt = '이 인사이트를 바탕으로 취해야 할 구체적인 액션 플랜을 제안해주세요.'
          break
      }
    }
    
    // 현재 질문 설정
    setCurrentQuestion(prompt)
    setCurrentAnswer('')
    setIsLoading(true)
    
    // 즉시 답변 뷰로 전환
    setCurrentView('answer')
    
    try {
      const response = await fetch('/api/chat/interview-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: prompt,
          selectedText: null,
          interviewId: interview?.id,
          fullScript: script
        })
      })
      
      if (!response.ok) throw new Error('Failed to get response')
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''
      let buffer = ''
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk
          
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue
              
              try {
                const parsed = JSON.parse(data)
                
                // workflow_finished 이벤트 처리
                if (parsed.event === 'workflow_finished' && parsed.data?.status === 'failed') {
                  setCurrentAnswer('죄송합니다. 작업 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
                  setIsLoading(false)
                  return
                }
                
                // MISO API 응답 형식에 맞게 처리
                if (parsed.event === 'agent_message' && typeof parsed.answer === 'string') {
                  assistantMessage = parsed.answer
                  setCurrentAnswer(assistantMessage)
                } else {
                  // 다양한 응답 형식 지원
                  const content = parsed.answer || parsed.content || parsed.message || parsed.text || parsed.response || 
                                parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content
                  
                  if (content && typeof content === 'string') {
                    assistantMessage += content
                    setCurrentAnswer(assistantMessage)
                  }
                }
              } catch (e) {
                // Parse error - ignore
              }
            }
          }
        }
        
        // Process any remaining data in buffer
        if (buffer.trim().startsWith('data: ')) {
          const data = buffer.slice(6).trim()
          if (data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data)
              // MISO API 응답 형식에 맞게 처리
              if (parsed.event === 'agent_message' && typeof parsed.answer === 'string') {
                assistantMessage = parsed.answer
                setCurrentAnswer(assistantMessage)
              } else {
                // 다양한 응답 형식 지원
                const content = parsed.answer || parsed.content || parsed.message || parsed.text || parsed.response || 
                              parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content
                
                if (content && typeof content === 'string') {
                  assistantMessage += content
                  setCurrentAnswer(assistantMessage)
                }
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      setCurrentAnswer('죄송합니다. 응답을 받는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewQuestion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!chatInput.trim() || isLoading) return
    
    const userMessage = chatInput
    setChatInput('')
    await sendQuestion(userMessage)
  }

  const sendQuestion = async (question: string) => {
    setCurrentQuestion(question)
    setCurrentAnswer('')
    setIsLoading(true)
    
    // 답변 뷰로 전환
    setCurrentView('answer')
    
    try {
      const response = await fetch('/api/chat/interview-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question,
          selectedText: null,
          interviewId: interview?.id,
          fullScript: script,
          context: context,
          insightData: insightData
        })
      })
      
      if (!response.ok) throw new Error('Failed to get response')
      
      // 스트리밍 응답 처리
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''
      let buffer = ''
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk
          
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue
              
              try {
                const parsed = JSON.parse(data)
                
                // workflow_finished 이벤트 처리
                if (parsed.event === 'workflow_finished' && parsed.data?.status === 'failed') {
                  setCurrentAnswer('죄송합니다. 작업 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
                  setIsLoading(false)
                  return
                }
                
                // MISO API 응답 형식에 맞게 처리
                if (parsed.event === 'agent_message' && typeof parsed.answer === 'string') {
                  assistantMessage = parsed.answer
                  setCurrentAnswer(assistantMessage)
                } else {
                  // 다양한 응답 형식 지원
                  const content = parsed.answer || parsed.content || parsed.message || parsed.text || parsed.response || 
                                parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content
                  
                  if (content && typeof content === 'string') {
                    assistantMessage += content
                    setCurrentAnswer(assistantMessage)
                  }
                }
              } catch (e) {
                // Parse error - ignore
              }
            }
          }
        }
        
        // Process any remaining data in buffer
        if (buffer.trim().startsWith('data: ')) {
          const data = buffer.slice(6).trim()
          if (data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data)
              // MISO API 응답 형식에 맞게 처리
              if (parsed.event === 'agent_message' && typeof parsed.answer === 'string') {
                assistantMessage = parsed.answer
                setCurrentAnswer(assistantMessage)
              } else {
                // 다양한 응답 형식 지원
                const content = parsed.answer || parsed.content || parsed.message || parsed.text || parsed.response || 
                              parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content
                
                if (content && typeof content === 'string') {
                  assistantMessage += content
                  setCurrentAnswer(assistantMessage)
                }
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      setCurrentAnswer('죄송합니다. 응답을 받는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // script_sections가 없어도 패널은 표시되도록 함

  return (
    <div className={cn(
      "fixed right-6 bottom-6 z-[100]",
      "bg-white rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_6px_24px_rgba(0,0,0,0.08)]",
      "w-[380px] h-[600px] flex flex-col",
      "transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) origin-bottom-right",
      isOpen 
        ? "opacity-100 scale-100 translate-y-0" 
        : "opacity-0 scale-90 translate-y-4 pointer-events-none"
    )}>
      {currentView === 'main' ? (
        <>
          {/* 메인 헤더 */}
          <div className="px-5 py-4 border-b border-gray-100">
            <button 
              onClick={onClose}
              className="absolute right-4 top-4 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
            
            <div className="flex items-center gap-4">
              <img 
                src="/chat-icon.png" 
                alt="AI Assistant" 
                className="w-12 h-12 object-contain flex-shrink-0"
              />
              <div>
                <h3 className="text-base font-semibold text-gray-900">오늘은 어떤 도움이 필요하신가요?</h3>
                <p className="text-xs text-gray-500 mt-0.5">인터뷰 분석을 도와드리겠습니다</p>
              </div>
            </div>
          </div>
          
          {/* 빠른 액션 버튼들 */}
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => handleQuickAction('summary')}
                disabled={isLoading}
                className="group bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Hash className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">핵심 요약</p>
                    <p className="text-xs text-gray-500">주요 내용</p>
                  </div>
                </div>
              </button>
              
              {!hideToc && interview?.script_sections && (
                <button 
                  onClick={() => setCurrentView('toc')}
                  className="group bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-green-50 flex items-center justify-center flex-shrink-0">
                      <ListOrdered className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">목차</p>
                      <p className="text-xs text-gray-500">섹션 탐색</p>
                    </div>
                  </div>
                </button>
              )}
              
              <button 
                onClick={() => handleQuickAction('insights')}
                disabled={isLoading}
                className="group bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">인사이트</p>
                    <p className="text-xs text-gray-500">핵심 발견</p>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={() => handleQuickAction('action')}
                disabled={isLoading}
                className="group bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Target className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">액션</p>
                    <p className="text-xs text-gray-500">다음 단계</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
          
          {/* 채팅 영역 - 스페이서 역할 */}
          <div className="flex-1 min-h-0" />
          
          {/* 입력 영역 */}
          <div className="p-4 border-t border-gray-100">
            <form onSubmit={handleNewQuestion}>
              <div className="relative">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleNewQuestion(e)
                    }
                  }}
                  placeholder="무엇이 궁금하신가요?"
                  className="w-full px-4 py-3 pr-12 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 resize-none"
                  rows={3}
                  disabled={isLoading}
                  style={{ minHeight: '80px' }}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isLoading}
                  className="absolute right-3 bottom-3 w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </>
      ) : currentView === 'answer' ? (
        <>
          {/* 답변 헤더 */}
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => {
                  setCurrentView('main')
                  setCurrentQuestion('')
                  setCurrentAnswer('')
                }}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm font-medium">새 질문</span>
              </button>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* 답변 내용 */}
          <div className="flex-1 overflow-y-auto">
            {/* 질문 표시 */}
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{currentQuestion}</p>
                </div>
              </div>
            </div>
            
            {/* AI 답변 */}
            <div className="px-5 py-6">
              <div className="flex items-start gap-3">
                <img 
                  src="/chat-icon.png" 
                  alt="AI Assistant" 
                  className="w-8 h-8 object-contain flex-shrink-0 mt-0.5"
                />
                <div className="flex-1">
                  {isLoading ? (
                    <div className="flex items-center gap-2 h-8">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none text-gray-700">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-3 last:mb-0 text-[13px] leading-6">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-[13px] leading-6">{children}</li>,
                          h1: ({ children }) => <h1 className="text-lg font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mb-2 mt-3 first:mt-0">{children}</h3>,
                          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ children }) => <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                          pre: ({ children }) => <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto mb-3">{children}</pre>,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 mb-3">
                              {children}
                            </blockquote>
                          ),
                          a: ({ children, href }) => (
                            <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">
                              {children}
                            </a>
                          ),
                          hr: () => <hr className="my-4 border-gray-200" />,
                        }}
                      >
                        {currentAnswer}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 추가 질문 제안 */}
              {!isLoading && currentAnswer && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-700 mb-3">추가로 궁금한 점이 있으신가요?</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => sendQuestion('더 자세히 설명해주세요')}
                      className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
                      disabled={isLoading}
                    >
                      더 자세히 설명해주세요
                    </button>
                    <button
                      onClick={() => sendQuestion('예시를 들어주세요')}
                      className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
                      disabled={isLoading}
                    >
                      예시를 들어주세요
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* 하단 입력 영역 */}
          <div className="p-4 border-t border-gray-100">
            <form onSubmit={handleNewQuestion}>
              <div className="relative">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleNewQuestion(e)
                    }
                  }}
                  placeholder="새로운 질문을 입력하세요..."
                  className="w-full px-4 py-3 pr-12 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 resize-none"
                  rows={2}
                  disabled={isLoading}
                  style={{ minHeight: '60px' }}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isLoading}
                  className="absolute right-3 bottom-3 w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </>
      ) : (
        <>
          {/* 목차 헤더 */}
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setCurrentView('main')}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <h3 className="text-base font-semibold text-gray-900">목차</h3>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* 검색 바 */}
          <div className="p-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색..."
              className="w-full px-3 py-2 text-sm bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
            />
          </div>
          
          {/* 목차 리스트 */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-1">
              {interview?.script_sections ? (
                (interview.script_sections as ScriptSection[])
                .filter(section => section.is_main_content)
                .filter(section => 
                  searchQuery ? section.sector_name.toLowerCase().includes(searchQuery.toLowerCase()) : true
                )
                .map((section, index) => {
                  const isActive = activeSection === section.sector_name
                  
                  return (
                    <button
                      key={section.sector_name}
                      onClick={() => {
                        onSectionClick(section.sector_name)
                        onClose()
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg",
                        "transition-all duration-200",
                        "flex items-center gap-3",
                        "text-sm",
                        isActive 
                          ? "bg-blue-50 text-blue-700" 
                          : "hover:bg-gray-50 text-gray-700"
                      )}
                    >
                      <span className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center text-xs font-medium flex-shrink-0",
                        isActive 
                          ? "bg-blue-600 text-white" 
                          : "bg-gray-200 text-gray-600"
                      )}>
                        {index + 1}
                      </span>
                      
                      <span className={cn(
                        "flex-1",
                        isActive ? "font-medium" : ""
                      )}>
                        {section.sector_name}
                      </span>
                    </button>
                  )
                })
              ) : (
                <p className="text-center text-gray-500 text-sm py-8">
                  목차 정보가 없습니다.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}