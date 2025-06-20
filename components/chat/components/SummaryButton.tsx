import React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from "lucide-react"

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
          <Button
            onClick={onGenerateSummary}
            disabled={isGeneratingSummary || chatMessagesLength <= 1}
            className={`
              px-4 py-2.5 h-11 rounded-xl bg-blue-500 hover:bg-blue-600 
              text-white text-sm font-medium shadow-lg 
              border-0 focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2
              transition-all duration-200
              ${isGeneratingSummary || chatMessagesLength <= 1 ? 'opacity-60 cursor-not-allowed bg-blue-400' : ''}
            `}
          >
            {isGeneratingSummary ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                AI 요약
              </>
            )}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}