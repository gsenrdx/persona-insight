import React from "react"
import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import { ChatMessage } from "./chat-message"
import { ExtendedMessage } from "../types"
import type { Message } from "ai/react"

interface ChatMessagesProps {
  chatMessages: ExtendedMessage[]
  personaData: any
  activePersona: any
  isClient: boolean
  isStreaming: boolean
  isUsingTool: boolean
  showLoadingMsg: boolean
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  messagesContainerRef?: React.RefObject<HTMLDivElement | null>
  repliedMessages: Record<string, string>
  isCopied: string | null
  onCopyMessage: (messageId: string, content: string) => void
  onReplyMessage: (message: Message) => void
}

export function ChatMessages({
  chatMessages,
  personaData,
  activePersona,
  isClient,
  isStreaming,
  isUsingTool,
  showLoadingMsg,
  messagesEndRef,
  messagesContainerRef,
  repliedMessages,
  isCopied,
  onCopyMessage,
  onReplyMessage
}: ChatMessagesProps) {
  // 이전 메시지 찾기 함수
  const getReplySourceMessage = (messageId: string) => {
    if (!repliedMessages[messageId]) return null
    return chatMessages.find(msg => msg.id === repliedMessages[messageId]) || null
  }

  return (
    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto py-4 px-4 md:px-6 bg-transparent custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-3">
        <AnimatePresence initial={false}>
          {chatMessages.map((message, index) => {
            const sourceMessage = message.role === "user" ? getReplySourceMessage(message.id) : null
            const isLastAssistantMessage = message.role === "assistant" && index === chatMessages.length - 1
            
            return (
              <ChatMessage
                key={message.id}
                message={message}
                personaData={personaData}
                isClient={isClient}
                isStreaming={isStreaming}
                isUsingTool={isUsingTool}
                isLastAssistantMessage={isLastAssistantMessage}
                sourceMessage={sourceMessage}
                isCopied={isCopied}
                onCopyMessage={onCopyMessage}
                onReplyMessage={onReplyMessage}
              />
            )
          })}
        </AnimatePresence>

        {/* 로딩 메시지 박스 */}
        {showLoadingMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex justify-start mb-4"
          >
            <div className="flex flex-row items-end gap-2">
              <div className="h-8 w-8 rounded-full flex-shrink-0 overflow-hidden">
                {activePersona.image || activePersona.avatar ? (
                  <Image
                    src={activePersona.image || activePersona.avatar}
                    alt={activePersona.persona_title || activePersona.name}
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                    unoptimized={(activePersona.image || activePersona.avatar).includes('supabase.co')}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs bg-gray-100 text-gray-700">
                    {(activePersona.persona_title || activePersona.name).substring(0, 2)}
                  </div>
                )}
              </div>
              <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-sm">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}