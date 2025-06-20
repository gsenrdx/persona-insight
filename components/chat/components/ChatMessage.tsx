import React from "react"
import { motion } from "framer-motion"
import { Copy, MessageSquareMore } from "lucide-react"
import { MessageContent } from "@/components/chat/message-content"
import { ChatHeader } from "./ChatHeader"
import { ExtendedMessage } from "../types"
import type { Message } from "ai/react"

interface ChatMessageProps {
  message: ExtendedMessage
  personaData: any
  isClient: boolean
  isStreaming: boolean
  isUsingTool: boolean
  isLastAssistantMessage: boolean
  sourceMessage: Message | null
  isCopied: string | null
  onCopyMessage: (messageId: string, content: string) => void
  onReplyMessage: (message: Message) => void
}

export function ChatMessage({
  message,
  personaData,
  isClient,
  isStreaming,
  isUsingTool,
  isLastAssistantMessage,
  sourceMessage,
  isCopied,
  onCopyMessage,
  onReplyMessage
}: ChatMessageProps) {
  const showToolUsing = isLastAssistantMessage && isStreaming && isUsingTool
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-6`}
    >
      <div 
        className={`
          flex max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"} 
          items-end gap-3
        `}
      >
        {message.role === "assistant" && (
          <ChatHeader message={message} personaData={personaData} />
        )}
        
        <div
          className={`
            group relative px-4 py-4 rounded-xl text-[15px] 
            ${message.role === "user" 
              ? "bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800/50" 
              : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700"
            }
          `}
        >
          {/* 페르소나 이름 표시 (assistant 메시지에만) */}
          {message.role === "assistant" && (() => {
            const respondingPersona = message.respondingPersona
            const displayName = respondingPersona?.name || personaData.persona_title || personaData.name
            
            return (
              <div className="mb-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {displayName}
              </div>
            )
          })()}
          
          {/* 꼬리질문 배지 */}
          {sourceMessage && message.role === "user" && (
            <div className="mb-3 text-xs text-blue-600 dark:text-blue-300 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800/40">
              <p className="italic font-medium mb-2 flex items-center gap-1.5">
                <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                답변에 대한 추가 질문
              </p>
              <div className="pl-3 border-l-2 border-blue-300 dark:border-blue-600 py-1">
                <span className="line-clamp-2 text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {sourceMessage.content}
                </span>
              </div>
            </div>
          )}
          
          {/* 도구 사용 중 표시 */}
          {showToolUsing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-2"
            >
              <span 
                className="thinking-text text-xs italic"
                style={{ 
                  fontStyle: 'italic',
                  transform: 'skew(-12deg)',
                  display: 'inline-block'
                }}
              >
                thinking...
              </span>
            </motion.div>
          )}
          
          <MessageContent 
            content={message.content}
            className="whitespace-pre-wrap leading-relaxed"
          />
          <div className="mt-1.5 flex justify-end items-center gap-1.5">
            <p className={`text-[10px] ${message.role === "user" ? "text-indigo-500 dark:text-indigo-300/80" : "text-zinc-500 dark:text-zinc-400"}`}>
              {isClient && message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ''}
            </p>
          </div>
          
          {/* 메시지 액션 버튼 */}
          {message.role === "assistant" && (
            <div className="message-actions absolute -right-[90px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col gap-2">
              <button 
                onClick={() => onCopyMessage(message.id, message.content)}
                className="text-xs px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center gap-2 whitespace-nowrap transition-all duration-200"
              >
                <Copy className="h-3 w-3" />
                <span className="font-medium">{isCopied === message.id ? "복사됨" : "복사"}</span>
              </button>
              
              <button 
                onClick={() => onReplyMessage(message)}
                className="text-xs px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 flex items-center gap-2 whitespace-nowrap transition-all duration-200"
              >
                <MessageSquareMore className="h-3 w-3" />
                <span className="font-medium">꼬리질문</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}