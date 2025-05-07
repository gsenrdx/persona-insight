"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Loader2, ArrowLeft } from "lucide-react"
import Image from "next/image"

interface PersonaData {
  id: string
  name: string
  image: string
  keywords: string[]
  insight: string
  summary?: string
  painPoint: string
  hiddenNeeds: string
}

const bubbleVariants = {
  initial: { 
    scale: 0.8, 
    opacity: 0,
    y: 10
  },
  animate: (custom: number) => ({
    scale: 1,
    opacity: 1,
    y: 0,
    transition: { 
      delay: custom * 0.2,
      duration: 0.5,
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  }),
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: { duration: 0.3 }
  }
}

const personaImageVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { 
      delay: 1.6,
      type: "spring", 
      stiffness: 300, 
      damping: 20 
    }
  },
  exit: { 
    scale: 0.9, 
    opacity: 0,
    transition: { duration: 0.3 }
  }
}

const personaInfoVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      delay: 1.9, 
      duration: 0.5, 
      type: "spring",
      stiffness: 300,
      damping: 20 
    }
  }
}

const resultCardVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      delay: 2.2, 
      duration: 0.5, 
      type: "spring",
      stiffness: 300,
      damping: 20 
    }
  }
}

const bubbleTextVariants = {
  initial: { opacity: 0 },
  animate: (custom: number) => ({
    opacity: 1,
    transition: { 
      delay: (custom * 0.2) + 0.1,
      duration: 0.2
    }
  })
}

export default function SearchResult() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchPhase, setSearchPhase] = useState<string | null>(null)
  const [resultData, setResultData] = useState<PersonaData | null>(null)
  const [reason, setReason] = useState<string | null>(null)

  useEffect(() => {
    const query = searchParams?.get("q") || ""
    const searchIntent = searchParams?.get("searchIntent")
    const resultId = searchParams?.get("result")
    const reasonParam = searchParams?.get("reason")

    if (reasonParam) {
      setReason(decodeURIComponent(reasonParam))
    }

    // 검색 단계 감지
    if (searchIntent === "chat") {
      setSearchPhase("searching")
      
      // 실제 API 호출은 SearchBar 컴포넌트에서 처리됨
      // 이곳에서는 애니메이션을 위한 상태 관리만 수행
    } else if (resultId) {
      setSearchPhase("result")
      
      // 결과 페르소나 데이터 가져오기
      fetch(`/api/sheets/persona?id=${resultId}`)
        .then(res => res.json())
        .then(data => {
          if (data.persona) {
            setResultData(data.persona)
          }
        })
        .catch(err => console.error("페르소나 데이터 로딩 실패:", err))
    } else {
      setSearchPhase(null)
    }
  }, [searchParams])

  const handleChatClick = () => {
    const resultId = searchParams?.get("result")
    if (resultId) {
      router.push(`/chat/${resultId}`)
    }
  }
  
  const handleReturnClick = () => {
    const params = new URLSearchParams(searchParams?.toString() || "")
    params.delete("searchIntent")
    params.delete("result")
    params.delete("reason")
    router.push(`/?${params.toString()}`, {scroll: false})
  }

  if (!searchPhase) return null

  return (
    <div className="mt-16 w-full max-w-5xl mx-auto px-4">
      <AnimatePresence mode="wait">
        {searchPhase === "searching" && (
          <motion.div
            key="searching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="flex flex-col items-start space-y-4 w-full max-w-2xl mb-8">
              <motion.div 
                custom={0} 
                variants={bubbleVariants}
                initial="initial"
                animate="animate"
                className="bg-primary-foreground/70 backdrop-blur-sm p-4 rounded-2xl rounded-tl-sm shadow-md flex items-center"
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center mr-3 bg-primary/10 rounded-full">
                  <span className="text-lg" role="img" aria-label="사용자">👤</span>
                </div>
                <motion.p variants={bubbleTextVariants} custom={0} className="text-sm">
                  {searchParams?.get("q")}
                </motion.p>
              </motion.div>

              <motion.div 
                custom={1} 
                variants={bubbleVariants}
                initial="initial"
                animate="animate"
                className="self-end bg-primary p-4 rounded-2xl rounded-tr-sm shadow-md flex items-center"
              >
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center mr-2">
                  <span className="text-base text-primary-foreground" role="img" aria-label="AI">🧠</span>
                </div>
                <motion.p variants={bubbleTextVariants} custom={1} className="text-sm text-primary-foreground">
                  질문을 분석 중입니다...
                </motion.p>
              </motion.div>

              <motion.div 
                custom={2} 
                variants={bubbleVariants}
                initial="initial"
                animate="animate"
                className="self-end bg-primary p-4 rounded-2xl rounded-tr-sm shadow-md flex items-center"
              >
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center mr-2">
                  <span className="text-base text-primary-foreground" role="img" aria-label="검색">🔍</span>
                </div>
                <motion.p variants={bubbleTextVariants} custom={2} className="text-sm text-primary-foreground">
                  적합한 페르소나를 찾고 있습니다
                </motion.p>
              </motion.div>

              <motion.div 
                custom={3} 
                variants={bubbleVariants}
                initial="initial"
                animate="animate"
                className="flex items-center justify-center p-4 self-end"
              >
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </motion.div>
            </div>
          </motion.div>
        )}

        {searchPhase === "result" && resultData && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReturnClick} 
              className="mb-6 flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              다시 검색하기
            </Button>
            
            <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-background/60 to-background pb-12">
              <div className="absolute inset-0 bg-black/5 backdrop-blur-[2px] z-0"></div>
              
              <div className="flex flex-col lg:flex-row items-center lg:items-stretch relative z-10">
                {/* 페르소나 이미지 섹션 - 투명 배경 활용 */}
                <motion.div 
                  variants={personaImageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full lg:w-2/5 flex justify-center lg:justify-end relative"
                >
                  <div className="relative w-64 h-64 lg:w-80 lg:h-80 xl:w-96 xl:h-96 mt-6 lg:mt-0 lg:-mr-6 z-10">
                    <Image
                      src={resultData.image}
                      alt={resultData.name}
                      fill
                      className="object-contain drop-shadow-xl"
                      sizes="(max-width: 768px) 16rem, (max-width: 1024px) 20rem, 24rem"
                      priority
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-radial from-primary/10 to-transparent z-0 opacity-60"></div>
                </motion.div>

                {/* 페르소나 정보 섹션 */}
                <motion.div 
                  variants={personaInfoVariants}
                  initial="initial"
                  animate="animate"
                  className="w-full lg:w-3/5 px-6 lg:pl-8 lg:pr-10 pt-6 pb-4 flex flex-col"
                >
                  <div className="flex flex-wrap gap-1 mb-3">
                    {resultData.keywords.map((keyword, i) => (
                      <Badge key={i} variant="secondary" className="bg-secondary/50 backdrop-blur-sm">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                  
                  <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground/90">{resultData.name}</h2>
                  
                  <motion.div 
                    variants={resultCardVariants}
                    initial="initial"
                    animate="animate"
                    className="w-full space-y-4"
                  >
                    <div className="p-4 rounded-xl bg-primary/5 backdrop-blur-sm border border-primary/10">
                      <p className="text-sm text-foreground/80 leading-relaxed italic">
                        "{reason}"
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-background/50 backdrop-blur-sm p-4 rounded-xl border border-muted">
                        <h4 className="text-sm font-semibold text-primary mb-1">주요 인사이트</h4>
                        <p className="text-sm text-foreground/80">{resultData.insight}</p>
                      </div>
                      
                      <div className="bg-background/50 backdrop-blur-sm p-4 rounded-xl border border-muted">
                        <h4 className="text-sm font-semibold text-primary mb-1">페인 포인트</h4>
                        <p className="text-sm text-foreground/80">{resultData.painPoint}</p>
                      </div>
                      
                      <div className="bg-background/50 backdrop-blur-sm p-4 rounded-xl border border-muted">
                        <h4 className="text-sm font-semibold text-primary mb-1">숨겨진 니즈</h4>
                        <p className="text-sm text-foreground/80">{resultData.hiddenNeeds}</p>
                      </div>
                    </div>
                    
                    <Button 
                      className="mt-6 gap-2 w-full md:w-auto" 
                      size="lg"
                      onClick={handleChatClick}
                    >
                      <MessageSquare className="h-4 w-4" />
                      페르소나와 대화 시작하기
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 