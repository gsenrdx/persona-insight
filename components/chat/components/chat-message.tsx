import React from "react"
import { motion } from "framer-motion"
import { Copy, MessageSquareMore } from "lucide-react"
import { MessageContent } from "@/components/chat/mention/message-content"
import { ChatHeader } from "./chat-header"
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
  
  // 시스템 메시지 처리
  if (message.role === "system") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex justify-center mb-4"
      >
        <div className="text-gray-500 text-xs">
          {message.content}
        </div>
      </motion.div>
    )
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-4`}
    >
      <div className={`flex ${message.role === "user" ? "flex-row-reverse" : "flex-row"} gap-3 max-w-[80%]`}>
        {message.role === "assistant" && (
          <ChatHeader message={message} personaData={personaData} />
        )}
        
        <div className="flex flex-col gap-1">
          <div
            className={`
              group relative px-4 py-2.5 text-sm rounded-2xl
              ${message.role === "user" 
                ? "bg-blue-600 text-white rounded-br-sm ml-auto" 
                : "bg-gray-100 text-gray-800 rounded-bl-sm mr-auto"
              }
            `}
            style={{
              width: 'fit-content',
              maxWidth: '100%',
              wordBreak: 'break-word'
            }}
          >
          {/* 페르소나 이름 표시 제거 - 더 깔끔한 UI를 위해 */}
          
          {/* 꼬리질문 배지 - 더 간단하게 */}
          {sourceMessage && message.role === "user" && (
            <div className="mb-2 text-xs opacity-80">
              <p className="italic">이전 답변에 대한 추가 질문</p>
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
            className=""
          />
          {/* 시간 표시 제거 - 더 깔끔한 UI를 위해 */}
          
          </div>
          
          {/* 메시지 액션 버튼 */}
          {message.role === "assistant" && (
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
              <button 
                onClick={() => onCopyMessage(message.id, message.content)}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <Copy className="h-3 w-3" />
                <span>{isCopied === message.id ? "복사됨" : "복사"}</span>
              </button>
              
              <button 
                onClick={() => onReplyMessage(message)}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <MessageSquareMore className="h-3 w-3" />
                <span>답글</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}