import React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import Image from "next/image"

interface SummaryButtonProps {
  chatMessagesLength: number
  isGeneratingSummary: boolean
  onGenerateSummary: () => void
}

export function SummaryButton({
  chatMessagesLength,
  isGeneratingSummary,
  onGenerateSummary
}: SummaryButtonProps) {
  return (
    <AnimatePresence>
      {chatMessagesLength > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-20 right-4 md:bottom-24 md:right-6 z-10"
        >
          <button
            onClick={onGenerateSummary}
            disabled={isGeneratingSummary || chatMessagesLength <= 1}
            className={`
              flex flex-col items-center gap-1 
              transition-all duration-200 group
              ${isGeneratingSummary || chatMessagesLength <= 1 ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
            `}
          >
            {isGeneratingSummary ? (
              <div className="relative">
                <Image 
                  src="/assets/pin/pin-chat_summary.png" 
                  alt="대화 요약" 
                  width={64} 
                  height={64} 
                  className="opacity-50"
                />
                <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <Image 
                src="/assets/pin/pin-chat_summary.png" 
                alt="대화 요약" 
                width={64} 
                height={64} 
                className="drop-shadow-xl"
              />
            )}
            <span className="text-sm font-semibold text-gray-700">
              {isGeneratingSummary ? '생성 중...' : '대화 요약'}
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}