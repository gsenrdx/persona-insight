"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, MessageCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils/index"
import { PersonaCardProps } from "@/types/components"

// 디자인 씽킹 및 고객 경험 명언들
const designThinkingQuotes = [
  "좋은 디자인은 사용자를 이해하는 것에서 시작된다. - Steve Jobs",
  "디자인은 단순히 보이는 것이 아니라 작동하는 방식이다. - Steve Jobs",
  "사용자의 문제를 해결하지 못하는 디자인은 예술일 뿐이다. - Don Norman",
  "가장 좋은 디자인은 눈에 보이지 않는다. - Dieter Rams",
  "디자인은 인간을 위한 것이어야 한다. - Victor Papanek",
  "공감은 인간 중심 디자인의 핵심이다. - IDEO",
  "사용자를 놀라게 하고 기쁘게 하라. - Aaron Walter",
  "단순함은 궁극의 정교함이다. - Leonardo da Vinci",
  "좋은 디자인은 가능한 한 적은 디자인이다. - Dieter Rams",
  "혁신은 리더와 추종자를 구분한다. - Steve Jobs",
  "디자인은 문제 해결이다. - Charles Eames",
  "사용자의 니즈를 충족시키는 것이 아름다운 디자인이다. - Joshua Porter"
]

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
  interview_count = 0,
}: PersonaCardProps) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [prefetchStarted, setPrefetchStarted] = useState(false)
  const [currentQuote, setCurrentQuote] = useState("")
  
  // 페이지 프리페치 함수
  const prefetchChatPage = () => {
    try {
      router.prefetch(`/chat/${id}`)
      setPrefetchStarted(true)
    } catch (error) {
      // \ud398\uc774\uc9c0 \ud504\ub9ac\ud398\uce58 \uc2e4\ud328
    }
  }
  
  // 카드가 화면에 표시될 때 미리 채팅 페이지를 프리페치
  useEffect(() => {
    prefetchChatPage()
  }, [id])

  const handleCardClick = () => {
    // 인터뷰가 없는 경우 클릭 비활성화
    if (interview_count === 0) {
      return
    }

    setIsModalOpen(true)
    setIsLoading(true)
    
    // 랜덤 명언 선택
    const randomQuote = designThinkingQuotes[Math.floor(Math.random() * designThinkingQuotes.length)]
    if (randomQuote) {
      setCurrentQuote(randomQuote)
    }
    
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
            "relative h-full overflow-hidden rounded-xl border shadow-sm transition-all duration-300",
            "bg-white border-slate-200",
            interview_count === 0 ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          )}>
            {/* 페르소나 카드 - 애플 스타일 */}
            <div className="relative p-4 h-full flex flex-col">
              {/* 헤더 영역 - 페르소나 이름 (title) */}
              <div className="mb-3">
                <h3 className={cn(
                  "text-base font-semibold leading-tight",
                  "text-zinc-900"
                )}>
                  {name}
                </h3>
              </div>
              
              {/* 설명 - persona_description */}
              {summary && (
                <div className="mb-4">
                  <p className={cn(
                    "text-xs leading-relaxed",
                    "text-zinc-600"
                  )}>
                    {summary}
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
                  "border-t border-zinc-100"
                )}
              >
                <span className={cn(
                  "flex items-center text-xs font-medium", 
                  "text-zinc-900"
                )}>
                  <MessageCircle className={cn(
                    "h-3 w-3 mr-1",
                    "text-zinc-500"
                  )} />
                  <span className="ml-1">대화하기</span>
                </span>
                <div className={cn(
                  "p-1 rounded-full",
                  "bg-zinc-100"
                )}>
                  <ArrowRight className={cn(
                    "h-3 w-3",
                    "text-zinc-500"
                  )} />
                </div>
              </motion.div>
            </div>
            
            {/* 페르소나 이미지 배경 그라데이션 */}
            <div className={cn(
              "absolute bottom-0 right-0 w-32 h-32 rounded-full -mr-10 -mb-10 z-20 overflow-hidden",
              "bg-gradient-to-br from-indigo-100 to-indigo-300/40"
            )} />
            
            {/* 페르소나 이미지 - 크기 통일 (250x250) */}
            <div className="absolute -bottom-2 -right-2 w-32 h-32 z-30 pointer-events-none">
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
                  src={image || `/placeholder.svg?height=250&width=250&text=${encodeURIComponent(name)}`}
                  alt={`${name} 페르소나 이미지`}
                  width={250}
                  height={250}
                  className={cn(
                    "w-full h-full object-cover object-center",
                    "drop-shadow-[0_5px_15px_rgba(0,0,0,0.3)]"
                  )}
                  sizes="(max-width: 768px) 128px, 128px"
                />
              </motion.div>
            </div>
            
            {/* 인터뷰 없음 오버레이 */}
            {interview_count === 0 && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-40 flex items-center justify-center">
                <div className="text-center px-4">
                  <div className="mb-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
                      <MessageCircle className="h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    할당된 인터뷰가 없습니다
                  </p>
                  <p className="text-xs text-gray-500">
                    인터뷰를 추가하면 대화할 수 있어요
                  </p>
                </div>
              </div>
            )}
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
                  "bg-white/95 shadow-lg"
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
                        "bg-zinc-100"
                      )}>
                        <Image
                          src={image || `/placeholder.svg?height=250&width=250&text=${encodeURIComponent(name)}`}
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
                        "text-zinc-900"
                      )}>
                        {name}
                      </h2>
                      
                      <p className={cn(
                        "text-sm break-words",
                        "text-zinc-500"
                      )}>
                        페르소나를 초대하는 중입니다
                      </p>
                    </div>
                  </div>
                  
                  {/* 진행 표시줄 */}
                  <div className="mt-6">
                    <div className={cn(
                      "h-1 w-full rounded-full overflow-hidden",
                      "bg-zinc-100"
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

                  {/* 명언 */}
                  {currentQuote && (
                    <div className="mt-6 px-2">
                      <p className={cn(
                        "text-xs leading-relaxed text-center italic",
                        "text-zinc-700"
                      )}>
                        &quot;{currentQuote}&quot;
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    </TooltipProvider>
  )
}
