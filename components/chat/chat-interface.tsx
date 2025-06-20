"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import type { Message } from "ai/react"
import { SummaryModal } from "@/components/chat/summary"
import { ChatMessages } from "./components/chat-messages"
import { ChatInput } from "./components/chat-input"
import { SummaryButton } from "./components/summary-button"
import { useMisoStreaming } from "./hooks/use-miso-streaming"
import { useMentionSystem } from "./hooks/use-mention-system"
import { chatStyles } from "./styles"
import { ChatInterfaceProps, ExtendedMessage, SummaryData } from "./types"
import { MentionData } from "@/lib/utils/mention"

export default function ChatInterface({ personaId, personaData, allPersonas = [] }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
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
  const [primaryPersona] = useState(personaData)
  
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
  } = useMentionSystem(userInput, allPersonas, primaryPersona, inputRef)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // 초기 자동 인사 메시지 전송
  useEffect(() => {
    if (!hasGreetedRef.current && personaData && personaData.name) {
      hasGreetedRef.current = true
      
      const greetingMessage: Message = {
        id: "greeting-user",
        role: "user" as const,
        content: "안녕하세요!",
        createdAt: new Date(),
      }
      
      setChatMessages([greetingMessage])
      
      setTimeout(() => {
        handleAutoGreeting()
      }, 800)
    }
  }, [personaData])

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
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
      console.error('복사 실패:', err)
    }
  }, [])

  const handleReplyMessage = useCallback((message: Message) => {
    setReplyingTo(message)
    focusInput()
  }, [focusInput])

  const cancelReply = useCallback(() => {
    setReplyingTo(null)
  }, [])

  // API 호출 래퍼 함수
  const callChatAPI = async (messages: ExtendedMessage[], conversationId: string | null) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        personaData: {
          persona_title: activePersona.persona_title || activePersona.name || '',
          persona_summary: activePersona.persona_summary || activePersona.summary || '',
          persona_style: activePersona.persona_style || activePersona.persona_character || '',
          painpoints: activePersona.painpoints || activePersona.painPoint || '',
          needs: activePersona.needs || activePersona.hiddenNeeds || '',
          insight: activePersona.insight || '',
          insight_quote: activePersona.insight_quote || ''
        },
        conversationId
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response
  }

  // 자동 인사 메시지 전송
  const handleAutoGreeting = async () => {
    const greetingUserMessage: Message = {
      id: "greeting-user",
      role: "user",
      content: "안녕하세요!",
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
      setChatMessages(prev => [...prev, assistantMessage])

      await processMisoStreaming(response, assistantMessage, setChatMessages, scrollToBottom)

    } catch (error) {
      setShowLoadingMsg(false)
      
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
        
        if (lastIndex >= 0 && updated[lastIndex].role === "assistant" && !updated[lastIndex].content) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: "죄송합니다, 응답을 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.",
          }
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

  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom()
    }
  }, [chatMessages, scrollToBottom])

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
            console.error('클라이언트 파싱도 실패:', clientParseError)
          }
        }
        
        if (finalSummaryData && !finalSummaryData.error) {
          setSummaryData(finalSummaryData)
          setSummaryModalOpen(true)
        } else {
          console.warn('대화 요약 데이터 처리 실패:', finalSummaryData)
          alert('대화 요약 생성은 완료되었지만 데이터 처리 중 문제가 발생했습니다.')
        }
      } else {
        throw new Error(result.error || '대화 요약 데이터를 처리할 수 없습니다.')
      }
      
    } catch (error) {
      console.error('대화 요약 생성 오류:', error)
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
}