"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Loader2, Plus } from "lucide-react"
import { FloatingActionButtonProps } from "@/types/components"

const FloatingActionButton = React.memo(({ 
  isProcessing, 
  activeJobsLength, 
  jobsLength,
  completedJobsLength,
  failedJobsLength,
  overallProgress,
  onButtonClick 
}: FloatingActionButtonProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-8 right-8 z-50"
        >
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                key="processing"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative overflow-hidden"
              >
                <Button
                  onClick={onButtonClick}
                  className="rounded-full shadow-lg px-5 py-2.5 h-[48px] bg-primary text-primary-foreground border-0 min-w-[140px] max-w-[220px] backdrop-blur-sm relative overflow-hidden"
                >
                  {/* 프로그레스 배경 (물결 효과) */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20"
                    animate={{
                      x: ['-100%', '100%'],
                      opacity: [0.3, 0.8, 0.3]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    style={{
                      width: `${Math.max(overallProgress, 10)}%`,
                      background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 100%)'
                    }}
                  />
                  
                  {/* 진행률 바 */}
                  <motion.div
                    className="absolute left-0 top-0 h-full bg-white/20 transition-all duration-500 ease-out"
                    style={{ width: `${overallProgress}%` }}
                  />
                  
                  <div className="flex items-center gap-2.5 w-full relative z-10">
                    <div className="relative">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="h-4 w-4 flex-shrink-0" />
                      </motion.div>
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">처리중</span>
                      <Badge variant="secondary" className="bg-white/20 text-white border-0 px-2 py-0.5 text-xs">
                        {activeJobsLength}개
                      </Badge>
                    </div>
                  </div>
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  onClick={onButtonClick}
                  className="rounded-full shadow-lg px-5 py-2.5 h-[48px] bg-primary hover:bg-primary/90 text-primary-foreground border-0 min-w-[140px] max-w-[220px] backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2.5 w-full">
                    <Plus className="h-4 w-4 flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">인터뷰 추가하기</span>
                      {jobsLength > 0 && (
                        <Badge variant="secondary" className="bg-white/20 text-white border-0 px-2 py-0.5 text-xs">
                          {completedJobsLength + failedJobsLength}/{jobsLength}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="left" className="bg-gray-900 text-white border-gray-700">
        <p className="text-sm">
          {isProcessing 
            ? `${activeJobsLength}개 파일 처리 중... 클릭하여 진행 상황 확인`
            : jobsLength > 0
            ? "진행 상황 확인 또는 새 페르소나 추가"
            : "새 고객 인터뷰로 페르소나 생성"
          }
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
))

FloatingActionButton.displayName = "FloatingActionButton"

export default FloatingActionButton 