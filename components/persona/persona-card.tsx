"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, MessageCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

export interface PersonaCardProps {
  id: string
  name: string
  image: string
  keywords: string[]
  insight: string
  summary?: string
  painPoint: string
  hiddenNeeds: string
  persona_character?: string
  persona_type?: string
  persona_description?: string
}

export default function PersonaCard({
  id,
  name,
  image,
  keywords,
  insight,
  summary,
  painPoint,
  hiddenNeeds,
  persona_character,
  persona_type,
  persona_description,
}: PersonaCardProps) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [prefetchStarted, setPrefetchStarted] = useState(false)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  
  // 페이지 프리페치 함수
  const prefetchChatPage = () => {
    try {
      router.prefetch(`/chat/${id}`)
      setPrefetchStarted(true)
    } catch (error) {
      console.error("페이지 프리페치 실패:", error)
    }
  }
  
  // 카드가 화면에 표시될 때 미리 채팅 페이지를 프리페치
  useEffect(() => {
    prefetchChatPage()
  }, [id])

  const handleCardClick = () => {
    setIsModalOpen(true)
    setIsLoading(true)
    
    // 아직 프리페치가 시작되지 않았다면 즉시 시작
    if (!prefetchStarted) {
      prefetchChatPage()
    }
    
    // 2초 후 채팅 페이지로 이동 (애니메이션 시간)
    setTimeout(() => {
      router.push(`/chat/${id}`)
    }, 2000)
  }

  return (
    <TooltipProvider>
      <>
        <motion.div
          whileHover={{ 
            y: -4
          }}
          whileTap={{ scale: 0.98 }}
          transition={{ 
            type: "spring", 
            stiffness: 350, 
            damping: 20 
          }}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          onClick={handleCardClick}
          className="h-full"
          layout
          layoutId={`persona-card-${id}`}
        >
          <div className={cn(
            "relative h-full cursor-pointer overflow-hidden rounded-xl border shadow-sm transition-all duration-300",
            isDark 
              ? "bg-zinc-900 border-zinc-800" 
              : "bg-white border-slate-200"
          )}>
            {/* 페르소나 카드 - 애플 스타일 */}
            <div className="relative p-4 h-full flex flex-col z-10">
              {/* 헤더 영역 - 페르소나 이름 (title) */}
              <div className="mb-3 flex items-center justify-between">
                <h3 className={cn(
                  "text-base font-semibold leading-tight flex-1",
                  isDark ? "text-white" : "text-zinc-900"
                )}>
                  {name}
                </h3>
                {persona_type && (
                  <div className={cn(
                    "ml-2 px-2 py-1 rounded-full text-xs font-bold flex-shrink-0",
                    isDark 
                      ? "bg-blue-600 text-white" 
                      : "bg-blue-600 text-white"
                  )}>
                    {persona_type}
                  </div>
                )}
              </div>
              
              {/* 설명 - persona_description */}
              {summary && (
                <div className="mb-4">
                  <p className={cn(
                    "text-xs leading-relaxed line-clamp-3",
                    isDark 
                      ? "text-zinc-400" 
                      : "text-zinc-600"
                  )}>
                    {summary.length > 120 ? `${summary.substring(0, 120)}...` : summary}
                  </p>
                </div>
              )}
              
              {/* 구분선 - 투명색으로 변경 */}
              <div className={cn(
                "h-px w-full my-3",
                "bg-transparent"
              )} />
              
              {/* 빈 공간 */}
              <div className="flex-grow min-h-[20px]" />
              
              {/* 채팅 버튼 - 애플 스타일 */}
              <motion.div 
                animate={isHovered ? { x: 3 } : { x: 0 }}
                className={cn(
                  "self-stretch flex items-center justify-between pt-3",
                  isDark
                    ? "border-t border-zinc-800" 
                    : "border-t border-zinc-100"
                )}
              >
                <span className={cn(
                  "flex items-center text-xs font-medium", 
                  isDark ? "text-white" : "text-zinc-900"
                )}>
                  <MessageCircle className={cn(
                    "h-3 w-3 mr-1",
                    isDark ? "text-zinc-400" : "text-zinc-500"
                  )} />
                  <span className="ml-1">대화하기</span>
                </span>
                <div className={cn(
                  "p-1 rounded-full",
                  isDark
                    ? "bg-zinc-800" 
                    : "bg-zinc-100"
                )}>
                  <ArrowRight className={cn(
                    "h-3 w-3",
                    isDark ? "text-zinc-400" : "text-zinc-500"
                  )} />
                </div>
              </motion.div>
            </div>
            
            {/* 페르소나 이미지 배경 그라데이션 */}
            <div className={cn(
              "absolute bottom-0 right-0 w-32 h-32 rounded-full -mr-10 -mb-10 z-0 overflow-hidden",
              isDark
                ? "bg-gradient-to-br from-indigo-600/20 to-indigo-900/10" 
                : "bg-gradient-to-br from-indigo-100 to-indigo-300/40"
            )} />
            
            {/* 페르소나 이미지 - 크기 통일 (250x250) */}
            <div className="absolute -bottom-2 -right-2 w-32 h-32 z-10 pointer-events-none">
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: [0, -5, 0] }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 3,
                  ease: "easeInOut"
                }}
                className="w-full h-full"
              >
                <Image
                  src={image || `/placeholder.svg?height=250&width=250&query=${encodeURIComponent(name)} persona`}
                  alt={`${name} 페르소나 이미지`}
                  width={250}
                  height={250}
                  className={cn(
                    "w-full h-full object-cover object-center",
                    isDark
                      ? "drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]" 
                      : "drop-shadow-[0_5px_15px_rgba(0,0,0,0.3)]"
                  )}
                  sizes="(max-width: 768px) 128px, 128px"
                />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* 페르소나 초대 모달 - 애플 스타일 */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[3px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              onClick={(e) => {
                e.stopPropagation()
                if (!isLoading) setIsModalOpen(false)
              }}
            >
              <motion.div
                className={cn(
                  "relative max-w-[340px] w-full mx-4 rounded-2xl overflow-hidden",
                  isDark 
                    ? "bg-zinc-900/95 shadow-xl" 
                    : "bg-white/95 shadow-lg"
                )}
                layoutId={`persona-card-${id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex flex-col items-center space-y-5">
                    {/* 이미지 */}
                    <div className="relative">
                      <div className={cn(
                        "w-24 h-24 rounded-full overflow-hidden",
                        isDark ? "bg-zinc-800" : "bg-zinc-100"
                      )}>
                        <Image
                          src={image || `/placeholder.svg?height=250&width=250&query=${encodeURIComponent(name)} persona`}
                          alt={`${name} 페르소나 이미지`}
                          fill
                          className="object-cover object-center"
                        />
                      </div>
                    </div>
                    
                    {/* 텍스트 */}
                    <div className="text-center space-y-2 max-w-[260px]">
                      <h2 className={cn(
                        "text-lg font-medium",
                        isDark ? "text-white" : "text-zinc-900"
                      )}>
                        {name}
                      </h2>
                      
                      <p className={cn(
                        "text-sm break-words",
                        isDark ? "text-zinc-400" : "text-zinc-500"
                      )}>
                        페르소나를 초대하는 중입니다
                      </p>
                    </div>
                  </div>
                  
                  {/* 진행 표시줄 */}
                  <div className="mt-6">
                    <div className={cn(
                      "h-1 w-full rounded-full overflow-hidden",
                      isDark ? "bg-zinc-800" : "bg-zinc-100"
                    )}>
                      <motion.div
                        className="h-full bg-primary/80"
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ 
                          duration: 2,
                          ease: [0.3, 0.1, 0.3, 1] // iOS 커브와 유사
                        }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    </TooltipProvider>
  )
}
