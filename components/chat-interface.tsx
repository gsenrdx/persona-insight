"use client"

import { useRef, useEffect, useCallback, useMemo, useState } from "react"
import { useChat, type Message } from "ai/react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, ThumbsUp, ThumbsDown, Copy } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ChatInterfaceProps {
  personaId: string
  personaData: any
}

export default function ChatInterface({ personaId, personaData }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

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

  const memoizedInitialMessages: Message[] = useMemo(() => [
    {
      id: "1",
      role: "assistant" as const,
      content: `안녕하세요! 저는 ${personaData.name}입니다. 무엇을 도와드릴까요?`,
      createdAt: new Date(),
    },
  ], [personaData.name])

  const memoizedChatBody = useMemo(() => ({
    personaData: {
      name: personaData.name,
      insight: personaData.insight,
      painPoint: personaData.painPoint,
      hiddenNeeds: personaData.hiddenNeeds,
      keywords: personaData.keywords || [],
      summary: personaData.summary || "",
      persona_charactor: personaData.persona_charactor || ""
    }
  }), [personaData])

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    initialMessages: memoizedInitialMessages,
    body: memoizedChatBody,
    onFinish: () => {
      scrollToBottom()
      focusInput()
    },
    onResponse: (response) => {
      // 응답을 디버깅하기 위한 코드
      console.log("Chat API 응답 받음:", response.status, response.statusText);
      if (!response.ok) {
        console.error("Chat API 오류 응답:", response.status, response.statusText);
      }
    },
    onError: (error) => {
      console.error("Chat API 오류 발생:", error);
    }
  })

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
      if (!isLoading) {
        focusInput()
      }
    }
  }, [messages.length, scrollToBottom, isLoading, focusInput])

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      focusInput()
    }
  }, [isLoading, messages.length, focusInput])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto py-4 px-4 md:px-6 bg-zinc-50 dark:bg-zinc-900 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-4`}
              >
                <div 
                  className={`
                    flex max-w-[90%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"} 
                    items-end gap-2
                  `}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-9 w-9 rounded-full flex-shrink-0 border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                      <AvatarImage src={personaData.image} alt={personaData.name} />
                      <AvatarFallback className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                        {personaData.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`
                      group relative px-4 py-3 rounded-2xl text-sm 
                      ${message.role === "user" 
                        ? "bg-blue-500 text-white" 
                        : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                      }
                    `}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    <div className="mt-1.5 flex justify-end items-center gap-1.5">
                      <p className={`text-[10px] ${message.role === "user" ? "text-white/70" : "text-zinc-500 dark:text-zinc-400"}`}>
                        {isClient && message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ''}
                      </p>
                    </div>
                    
                    {/* 메시지 액션 버튼 - 페르소나 메시지에만 표시 */}
                    {message.role === "assistant" && (
                      <div className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6 rounded-full bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 shadow-sm"
                              >
                                <Copy className="h-3 w-3 text-zinc-500 dark:text-zinc-300" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">복사하기</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="flex flex-row items-end gap-2">
                <Avatar className="h-9 w-9 rounded-full border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                  <AvatarImage src={personaData.image} alt={personaData.name} />
                  <AvatarFallback className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                    {personaData.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="px-4 py-3 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <div className="flex space-x-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse delay-150"></div>
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse delay-300"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-950">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder="메시지를 입력하세요..."
            disabled={isLoading}
            className="pr-12 py-2.5 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-sm"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={isLoading || !input.trim()}
            className="absolute right-1.5 top-1/2 transform -translate-y-1/2 h-9 w-9 rounded-full bg-blue-500 text-white hover:bg-blue-600 shadow-md disabled:bg-blue-400 disabled:shadow-none transition-all"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">전송</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
