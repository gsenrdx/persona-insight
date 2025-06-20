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
    <div className="flex-shrink-0 p-6 bg-transparent">
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
            <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-800/50 rounded-lg p-3 pr-10 flex items-center relative overflow-hidden backdrop-blur-sm">
              <div className="flex-shrink-0 w-1 h-6 bg-blue-400 mr-3 rounded-full"></div>
              <div className="text-xs text-blue-800 dark:text-blue-200 font-medium truncate">
                {replyingTo.content.substring(0, 100)}
                {replyingTo.content.length > 100 ? '...' : ''}
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={onCancelReply}
                className="h-6 w-6 rounded-full absolute right-2 top-1/2 transform -translate-y-1/2 hover:bg-blue-200/80 dark:hover:bg-blue-800/50 transition-colors"
              >
                <X className="h-3 w-3 text-blue-500 dark:text-blue-300" />
                <span className="sr-only">취소</span>
              </Button>
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
                  className="bg-gradient-to-r from-purple-50/80 to-blue-50/60 dark:from-purple-950/40 dark:to-blue-950/30 border border-purple-200/80 dark:border-purple-800/50 rounded-lg px-4 py-2 flex items-center gap-3 relative overflow-hidden backdrop-blur-sm"
                >
                  <div className="flex-shrink-0 w-1 h-5 bg-purple-400 rounded-full"></div>
                  <div className="text-sm text-purple-800 dark:text-purple-200 font-medium">
                    @{persona.name}에게 질문 중...
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onRemoveMention(persona.id)}
                    className="h-5 w-5 rounded-full hover:bg-purple-200/80 dark:hover:bg-purple-800/50 transition-colors"
                  >
                    <X className="h-3 w-3 text-purple-500 dark:text-purple-300" />
                    <span className="sr-only">멘션 제거</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
        <div className="flex items-end gap-3 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={userInput}
              onChange={onInputChange}
              placeholder={replyingTo ? "꼬리질문을 입력하세요... (@로 페르소나 멘션)" : "메시지를 입력하세요... (@로 페르소나 멘션)"}
              disabled={loading}
              rows={1}
              className="w-full min-h-[40px] max-h-[200px] resize-none p-0 bg-transparent border-none outline-none focus:ring-0 focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100 text-[15px] leading-relaxed caret-zinc-700 dark:caret-zinc-300"
              onKeyDown={onKeyDown}
              style={{
                height: 'auto',
                minHeight: '40px',
                border: 'none',
                boxShadow: 'none'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 200) + 'px'
              }}
            />
            
            {/* 멘션 드롭다운 */}
            <PersonaMentionDropdown
              open={showMentionDropdown}
              onSelect={onMentionSelect}
              onOpenChange={onMentionDropdownChange}
              searchText={mentionSearchText}
              personas={allPersonas}
              anchorEl={inputRef.current}
            />
          </div>
          <Button 
            type="submit" 
            size="icon"
            disabled={loading || !userInput.trim()}
            className="h-10 w-10 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 text-white disabled:text-zinc-400 transition-all duration-200 flex-shrink-0 border-0 outline-none focus:ring-0"
          >
            <ArrowUp className="h-4 w-4" />
            <span className="sr-only">전송</span>
          </Button>
        </div>
      </form>
    </div>
  )
}