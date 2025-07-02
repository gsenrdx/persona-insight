import React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUp, X } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { PersonaMentionDropdown } from "@/components/chat/mention/persona-mention-dropdown"
import type { Message } from "ai/react"

interface ChatInputProps {
  userInput: string
  loading: boolean
  replyingTo: Message | null
  showMentionDropdown: boolean
  mentionSearchText: string
  mentionedPersonas: Array<{id: string, name: string}>
  allPersonas: any[]
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onMentionSelect: (mention: any) => void
  onMentionDropdownChange: (open: boolean) => void
  onRemoveMention: (personaId: string) => void
  onCancelReply: () => void
}

export function ChatInput({
  userInput,
  loading,
  replyingTo,
  showMentionDropdown,
  mentionSearchText,
  mentionedPersonas,
  allPersonas,
  inputRef,
  onSubmit,
  onInputChange,
  onKeyDown,
  onMentionSelect,
  onMentionDropdownChange,
  onRemoveMention,
  onCancelReply
}: ChatInputProps) {
  return (
    <div className="flex-shrink-0 p-4 bg-transparent border-t border-gray-100">
      {/* 꼬리질문 중인 메시지 표시 */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-3xl mx-auto mb-3"
          >
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 pr-8 flex items-center relative">
              <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                답변: {replyingTo.content.substring(0, 80)}
                {replyingTo.content.length > 80 ? '...' : ''}
              </div>
              <button
                onClick={onCancelReply}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 멘션된 페르소나 표시 */}
      <AnimatePresence>
        {mentionedPersonas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: 10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="max-w-3xl mx-auto mb-3"
          >
            <div className="flex flex-wrap gap-2">
              {mentionedPersonas.map((persona) => (
                <motion.div
                  key={persona.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-1 flex items-center gap-2"
                >
                  <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                    @{persona.name}
                  </span>
                  <button
                    onClick={() => onRemoveMention(persona.id)}
                    className="text-blue-400 hover:text-blue-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
        <div className="relative">
          <Textarea
            ref={inputRef}
            value={userInput}
            onChange={onInputChange}
            placeholder={replyingTo ? "꼬리질문을 입력하세요..." : "메시지를 입력하세요..."}
            disabled={loading}
            rows={1}
            className="w-full px-4 py-2.5 pr-10 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 resize-none"
            onKeyDown={onKeyDown}
            style={{
              minHeight: '40px',
              maxHeight: '120px'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 120) + 'px'
            }}
          />
          
          {/* 멘션 드롭다운 */}
          <PersonaMentionDropdown
            open={showMentionDropdown}
            onSelect={onMentionSelect}
            onOpenChange={onMentionDropdownChange}
            searchText={mentionSearchText}
            personas={allPersonas}
          />
          
          <button
            type="submit"
            disabled={loading || !userInput.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-blue-600 hover:bg-blue-50 disabled:text-gray-400 disabled:hover:bg-transparent transition-colors"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  )
}