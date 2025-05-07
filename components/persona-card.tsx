"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight } from "lucide-react"
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
            <div className="relative p-5 h-full flex flex-col z-10">
              {/* 헤더 영역 - 페르소나 이름 */}
              <div className="mb-4 flex items-center justify-between">
                <h3 className={cn(
                  "text-lg font-semibold",
                  isDark ? "text-white" : "text-zinc-900"
                )}>
                  {name}
                </h3>
              </div>
              
              {/* 인사이트 - 애플 스타일의 명확한 인용구 */}
              <div className="mb-4">
                <p className={cn(
                  "text-sm leading-relaxed italic",
                  isDark 
                    ? "text-zinc-300" 
                    : "text-zinc-700"
                )}>
                  "{insight}"
                </p>
              </div>
              
              {/* 구분선 */}
              <div className={cn(
                "h-px w-full my-4",
                isDark ? "bg-zinc-800" : "bg-zinc-100"
              )} />
              
              {/* 키워드 모음 */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {keywords.slice(0, 3).map((keyword, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full",
                      isDark 
                        ? "bg-zinc-800/80 text-zinc-300 border-zinc-700" 
                        : "bg-zinc-100/80 text-zinc-700 border-zinc-200"
                    )}
                  >
                    {keyword}
                  </Badge>
                ))}
                {keywords.length > 3 && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full",
                      isDark
                        ? "bg-zinc-800/80 text-zinc-400 border-zinc-700" 
                        : "bg-zinc-100/80 text-zinc-500 border-zinc-200"
                    )}
                  >
                    +{keywords.length - 3}
                  </Badge>
                )}
              </div>
              
              {/* 빈 공간 */}
              <div className="flex-grow" />
              
              {/* 채팅 버튼 - 애플 스타일 */}
              <motion.div 
                animate={isHovered ? { x: 3 } : { x: 0 }}
                className={cn(
                  "self-stretch flex items-center justify-between pt-4",
                  isDark
                    ? "border-t border-zinc-800" 
                    : "border-t border-zinc-100"
                )}
              >
                <span className={cn(
                  "text-sm font-medium", 
                  isDark ? "text-white" : "text-zinc-900"
                )}>
                  채팅으로 대화하기
                </span>
                <div className={cn(
                  "p-1.5 rounded-full",
                  isDark
                    ? "bg-zinc-800" 
                    : "bg-zinc-100"
                )}>
                  <ArrowRight className={cn(
                    "h-3.5 w-3.5",
                    isDark ? "text-zinc-400" : "text-zinc-500"
                  )} />
                </div>
              </motion.div>
            </div>
            
            {/* 페르소나 이미지 배경 그라데이션 */}
            <div className={cn(
              "absolute bottom-0 right-0 w-48 h-48 rounded-full -mr-16 -mb-16 z-0 overflow-hidden",
              isDark
                ? "bg-gradient-to-br from-indigo-600/20 to-indigo-900/10" 
                : "bg-gradient-to-br from-indigo-100 to-indigo-300/40"
            )} />
            
            {/* 페르소나 이미지 - 더 크게 */}
            <div className="absolute -bottom-5 -right-5 w-48 h-48 z-10 pointer-events-none">
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: [0, -5, 0] }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 3,
                  ease: "easeInOut"
                }}
              >
                <Image
                  src={image || `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(name)} persona`}
                  alt={`${name} 페르소나 이미지`}
                  width={180}
                  height={180}
                  className={cn(
                    "object-contain",
                    isDark
                      ? "drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]" 
                      : "drop-shadow-[0_5px_15px_rgba(0,0,0,0.3)]"
                  )}
                  sizes="180px"
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
                          src={image || `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(name)} persona`}
                          alt={`${name} 페르소나 이미지`}
                          fill
                          className="object-cover"
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
