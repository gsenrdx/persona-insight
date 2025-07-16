"use client"

import { useRef, useEffect, useCallback, useState, useMemo, memo } from "react"
import type { Message } from "ai/react"
import dynamic from "next/dynamic"

// 성능 최적화: 요약 모달 동적 import (코드 스플리팅)
const SummaryModal = dynamic(() => import("@/components/chat/summary").then(mod => ({ default: mod.SummaryModal })), {
  ssr: false,
  loading: () => null
})
import { ChatMessages } from "./components/chat-messages"
import { ChatInput } from "./components/chat-input"
import { SummaryButton } from "./components/summary-button"
import { useMisoStreaming } from "./hooks/use-miso-streaming"
import { useMentionSystem } from "./hooks/use-mention-system"
import { chatStyles } from "./styles"
import { ChatInterfaceProps, ExtendedMessage, SummaryData } from "./types"
import { MentionData } from "@/lib/utils/mention"

// 성능 최적화: 메모화된 ChatInterface 컴포넌트
const ChatInterface = memo(function ChatInterface({ personaId, personaData, allPersonas = [] }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hasGreetedRef = useRef<boolean>(false)
  
  // 상태 관리
  const [isClient, setIsClient] = useState(false)
  const [chatMessages, setChatMessages] = useState<ExtendedMessage[]>([])
  const [userInput, setUserInput] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [showLoadingMsg, setShowLoadingMsg] = useState<boolean>(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [isCopied, setIsCopied] = useState<string | null>(null)
  const [repliedMessages, setRepliedMessages] = useState<Record<string, string>>({})
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false)
  const [summaryModalOpen, setSummaryModalOpen] = useState<boolean>(false)
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  // 성능 최적화: 메모화된 persona 데이터
  const memoizedPersonaData = useMemo(() => personaData, [personaData.id, personaData.persona_title, personaData.name])
  const memoizedAllPersonas = useMemo(() => allPersonas, [allPersonas.length])
  const [primaryPersona] = useState(memoizedPersonaData)
  
  // Custom hooks
  const {
    misoConversationId,
    isStreaming,
    isUsingTool,
    isUsingToolRef,
    processMisoStreaming,
    setIsUsingTool
  } = useMisoStreaming()
  
  const {
    showMentionDropdown,
    mentionSearchText,
    mentionedPersonas,
    activePersona,
    handleTextareaChange,
    handleMentionSelect,
    removeMention,
    setShowMentionDropdown
  } = useMentionSystem(userInput, memoizedAllPersonas, primaryPersona, inputRef)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // 초기 자동 인사 메시지 전송 (사용자에게 보이지 않음)
  useEffect(() => {
    if (!hasGreetedRef.current && personaData && personaData.name) {
      hasGreetedRef.current = true
      
      // 시스템 입장 메시지를 즉시 표시
      const personaName = personaData.persona_title || personaData.name || '페르소나'
      const systemMessage: ExtendedMessage = {
        id: "system-entrance",
        role: "system" as const,
        content: `${personaName}님께서 입장하셨습니다.`,
        createdAt: new Date(),
      }
      setChatMessages([systemMessage])
      
      setTimeout(() => {
        handleAutoGreeting()
      }, 800)
    }
  }, [personaData])

  const scrollToBottom = useCallback(() => {
    // Try both methods for better compatibility
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto", block: "end" })
    }
  }, [])

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleCopyMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setIsCopied(messageId)
      setTimeout(() => setIsCopied(null), 2000)
    } catch (err) {
      // 복사 실패
    }
  }, [])

  const handleReplyMessage = useCallback((message: Message) => {
    setReplyingTo(message)
    focusInput()
  }, [focusInput])

  const cancelReply = useCallback(() => {
    setReplyingTo(null)
  }, [])

  // 성능 최적화: 메모화된 API 호출 함수
  const callChatAPI = useCallback(async (messages: ExtendedMessage[], conversationId: string | null) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        personaId,
        conversationId
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response
  }, [personaId])

  // 자동 인사 메시지 전송
  const handleAutoGreeting = async () => {
    const personaName = activePersona.persona_title || activePersona.name || '페르소나'
    const greetingUserMessage: Message = {
      id: "greeting-user",
      role: "user",
      content: `${personaName}님께서 입장하셨습니다.`,
      createdAt: new Date(),
    }

    setLoading(true)
    setShowLoadingMsg(true)
    isUsingToolRef.current = false
    setIsUsingTool(false)

    try {
      const response = await callChatAPI([greetingUserMessage], null)

      // 어시스턴트 메시지 생성
      const assistantMessage: ExtendedMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        createdAt: new Date(),
        respondingPersona: {
          id: activePersona.id,
          name: activePersona.persona_title || activePersona.name || '',
          image: activePersona.image || activePersona.avatar
        }
      }

      setShowLoadingMsg(false)
      // 기존 시스템 메시지에 어시스턴트 메시지 추가
      setChatMessages(prev => [...prev, assistantMessage])

      await processMisoStreaming(response, assistantMessage, setChatMessages, scrollToBottom)

    } catch (error) {
      setShowLoadingMsg(false)
      
      // 기존 시스템 메시지에 에러 메시지 추가
      setChatMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "죄송합니다, 응답을 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.",
          createdAt: new Date(),
          respondingPersona: {
            id: activePersona.id,
            name: activePersona.persona_title || activePersona.name || '',
            image: activePersona.image || activePersona.avatar
          }
        } as ExtendedMessage
      ])
    } finally {
      setLoading(false)
      isUsingToolRef.current = false
      setIsUsingTool(false)
      
      setTimeout(() => {
        scrollToBottom()
        focusInput()
      }, 200)
    }
  }

  // 메시지 전송
  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!userInput.trim() || loading) return

    const newUserMessage: ExtendedMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userInput.trim(),
      createdAt: new Date(),
      mentionedPersonas: mentionedPersonas.map(p => p.id),
    }

    if (replyingTo) {
      setRepliedMessages(prev => ({
        ...prev,
        [newUserMessage.id]: replyingTo.id
      }))
    }

    setChatMessages(prev => [...prev, newUserMessage])
    setLoading(true)
    setShowLoadingMsg(true)
    setReplyingTo(null)
    isUsingToolRef.current = false
    setIsUsingTool(false)

    try {
      const apiMessages = [...chatMessages]
      
      if (replyingTo) {
        apiMessages.push({
          ...newUserMessage,
          content: `"${replyingTo.content.substring(0, 100)}${replyingTo.content.length > 100 ? '...' : ''}"에 대한 추가 질문: ${newUserMessage.content}`,
          metadata: {
            isFollowUpQuestion: true,
            originalMessageId: replyingTo.id
          }
        } as ExtendedMessage)
      } else {
        apiMessages.push(newUserMessage)
      }

      const response = await callChatAPI(apiMessages, misoConversationId)

      // 어시스턴트 메시지 생성
      const assistantMessage: ExtendedMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        createdAt: new Date(),
        respondingPersona: {
          id: activePersona.id,
          name: activePersona.persona_title || activePersona.name || '',
          image: activePersona.image || activePersona.avatar
        }
      }

      setShowLoadingMsg(false)
      setChatMessages(prev => [...prev, assistantMessage])

      await processMisoStreaming(response, assistantMessage, setChatMessages, scrollToBottom)

    } catch (error) {
      setShowLoadingMsg(false)
      
      setChatMessages(prev => {
        const updated = [...prev]
        const lastIndex = updated.length - 1
        
        if (lastIndex >= 0 && updated[lastIndex]?.role === "assistant" && !updated[lastIndex]?.content) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: "죄송합니다, 응답을 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.",
          } as ExtendedMessage
        } else {
          updated.push({
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "죄송합니다, 응답을 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.",
            createdAt: new Date(),
            respondingPersona: {
              id: activePersona.id,
              name: activePersona.persona_title || activePersona.name || '',
              image: activePersona.image || activePersona.avatar
            }
          } as ExtendedMessage)
        }
        
        return updated
      })
    } finally {
      setLoading(false)
      setUserInput("")
      isUsingToolRef.current = false
      setIsUsingTool(false)
      
      setTimeout(() => {
        scrollToBottom()
        focusInput()
      }, 200)
    }
  }

  // Auto-scroll when new messages are added or when streaming
  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom()
    }
  }, [chatMessages, scrollToBottom])

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        scrollToBottom()
      }, 100)
      return () => clearInterval(interval)
    }
  }, [isStreaming, scrollToBottom])

  // Also scroll when the last message content changes (during streaming)
  useEffect(() => {
    if (chatMessages.length > 0 && isStreaming) {
      scrollToBottom()
    }
  }, [chatMessages[chatMessages.length - 1]?.content, isStreaming, scrollToBottom])

  const handleTextareaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionDropdown && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
      return
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (userInput.trim() && !loading) {
        handleSendMessage(e as unknown as React.FormEvent<HTMLFormElement>)
      }
    }
  }, [showMentionDropdown, userInput, loading])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = handleTextareaChange(e)
    setUserInput(newValue)
  }, [handleTextareaChange])

  const handleMentionSelectWrapper = useCallback((mention: MentionData) => {
    handleMentionSelect(mention, userInput, setUserInput)
  }, [handleMentionSelect, userInput])

  const handleRemoveMention = useCallback((personaId: string) => {
    removeMention(personaId, userInput, setUserInput)
  }, [removeMention, userInput])

  // 대화 요약 생성
  const handleGenerateSummary = useCallback(async () => {
    if (chatMessages.length <= 1 || isGeneratingSummary) return
    
    setIsGeneratingSummary(true)
    
    try {
      const conversationContent = chatMessages
        .slice(1)
        .map(msg => `${msg.role === 'user' ? '사용자' : personaData.name}: ${msg.content}`)
        .join('\n\n')

      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('로그인이 필요합니다.')
      }
      
      const response = await fetch('/api/chat/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conversationContent,
          personaName: personaData.name,
          conversationId: misoConversationId
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '대화 요약 생성에 실패했습니다.')
      }
      
      const result = await response.json()
      
      if (result.success && result.summaryData) {
        let finalSummaryData = result.summaryData
        
        if (result.summaryData.error === 'JSON 파싱 실패' && result.summaryData.raw) {
          try {
            let cleanedData = result.summaryData.raw.trim()
            cleanedData = cleanedData.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')
            cleanedData = cleanedData.replace(/^```\s*/, '').replace(/\s*```$/i, '')
            cleanedData = cleanedData.trim()
            
            if (cleanedData.startsWith('{') && cleanedData.endsWith('}')) {
              finalSummaryData = JSON.parse(cleanedData)
            }
          } catch (clientParseError) {
            // 클라이언트 파싱도 실패
          }
        }
        
        if (finalSummaryData && !finalSummaryData.error) {
          setSummaryData(finalSummaryData)
          setSummaryModalOpen(true)
        } else {
          // 대화 요약 데이터 처리 실패
          alert('대화 요약 생성은 완료되었지만 데이터 처리 중 문제가 발생했습니다.')
        }
      } else {
        throw new Error(result.error || '대화 요약 데이터를 처리할 수 없습니다.')
      }
      
    } catch (error) {
      // 대화 요약 생성 오류
      alert(`대화 요약 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsGeneratingSummary(false)
    }
  }, [chatMessages, personaData.name, misoConversationId, isGeneratingSummary])

  return (
    <div className="flex flex-col h-full relative">
      <style jsx global>{chatStyles}</style>
      
      <ChatMessages
        chatMessages={chatMessages}
        personaData={personaData}
        activePersona={activePersona}
        isClient={isClient}
        isStreaming={isStreaming}
        isUsingTool={isUsingTool}
        showLoadingMsg={showLoadingMsg}
        messagesEndRef={messagesEndRef}
        messagesContainerRef={messagesContainerRef}
        repliedMessages={repliedMessages}
        isCopied={isCopied}
        onCopyMessage={handleCopyMessage}
        onReplyMessage={handleReplyMessage}
      />

      <ChatInput
        userInput={userInput}
        loading={loading}
        replyingTo={replyingTo}
        showMentionDropdown={showMentionDropdown}
        mentionSearchText={mentionSearchText}
        mentionedPersonas={mentionedPersonas}
        allPersonas={allPersonas}
        inputRef={inputRef}
        onSubmit={handleSendMessage}
        onInputChange={handleInputChange}
        onKeyDown={handleTextareaKeyDown}
        onMentionSelect={handleMentionSelectWrapper}
        onMentionDropdownChange={setShowMentionDropdown}
        onRemoveMention={handleRemoveMention}
        onCancelReply={cancelReply}
      />

      <SummaryButton
        chatMessagesLength={chatMessages.length}
        isGeneratingSummary={isGeneratingSummary}
        onGenerateSummary={handleGenerateSummary}
      />

      <SummaryModal
        isOpen={summaryModalOpen}
        onClose={() => {
          setSummaryModalOpen(false)
          setSummaryData(null)
        }}
        summaryData={summaryData}
        personaName={personaData.name}
        personaImage={personaData.image}
      />
    </div>
  )
})

export default ChatInterface