import React from "react"
import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import { ChatMessage } from "./ChatMessage"
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
  messagesEndRef: React.RefObject<HTMLDivElement>
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
    <div className="flex-1 overflow-y-auto py-6 px-4 md:px-6 bg-transparent custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-6">
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
              <div className="h-9 w-9 rounded-full flex-shrink-0 border border-zinc-200 dark:border-zinc-700 overflow-hidden relative">
                {activePersona.image || activePersona.avatar ? (
                  <Image
                    src={activePersona.image || activePersona.avatar}
                    alt={activePersona.persona_title || activePersona.name}
                    width={36}
                    height={36}
                    className="object-cover w-full h-full"
                    unoptimized={(activePersona.image || activePersona.avatar).includes('supabase.co')}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                    {(activePersona.persona_title || activePersona.name).substring(0, 2)}
                  </div>
                )}
              </div>
              <div className="px-4 py-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                <div className="mb-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  {activePersona.persona_title || activePersona.name}
                </div>
                <div className="loading-dots">
                  <div></div>
                  <div></div>
                  <div></div>
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