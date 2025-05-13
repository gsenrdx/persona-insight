"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Loader2, ArrowLeft, User, ArrowRight } from "lucide-react"
import Image from "next/image"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PersonaData {
  personaId: string
  personaData: {
    name: string
    image: string
    keywords: string[]
    insight: string
    summary?: string
    painPoint: string
    hiddenNeeds: string
  }
  reason: string
  relevanceScore: number
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

const personaCardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: (custom: number) => ({
    opacity: 1, 
    y: 0,
    transition: { 
      delay: custom * 0.1 + 1.0, 
      duration: 0.5, 
      type: "spring",
      stiffness: 300,
      damping: 20 
    }
  })
}

export default function SearchResult() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchPhase, setSearchPhase] = useState<string | null>(null)
  const [resultPersonas, setResultPersonas] = useState<PersonaData[]>([])
  const [selectedPersona, setSelectedPersona] = useState<PersonaData | null>(null)
  const [isDetailView, setIsDetailView] = useState(false)

  useEffect(() => {
    const query = searchParams?.get("q") || ""
    const searchIntent = searchParams?.get("searchIntent")
    const hasResults = searchParams?.get("results")

    // 검색 단계 감지
    if (searchIntent === "chat") {
      setSearchPhase("searching")
      // 애니메이션을 위한 상태 관리만 수행
    } else if (hasResults) {
      setSearchPhase("results")
      
      // 세션 스토리지에서 결과 데이터 가져오기
      const resultsData = sessionStorage.getItem('personaSearchResults')
      if (resultsData) {
        try {
          const parsedData = JSON.parse(resultsData)
          // 상위 2개 페르소나만 표시
          setResultPersonas(parsedData.slice(0, 2))
        } catch (error) {
          console.error("결과 데이터 파싱 실패:", error)
        }
      }
    } else {
      setSearchPhase(null)
      setIsDetailView(false)
      setSelectedPersona(null)
    }
  }, [searchParams])

  const handleChatClick = (personaId: string) => {
    if (personaId) {
      router.push(`/chat/${personaId}`)
    }
  }
  
  const handleReturnClick = () => {
    if (isDetailView) {
      setIsDetailView(false)
      setSelectedPersona(null)
    } else {
      const params = new URLSearchParams(searchParams?.toString() || "")
      params.delete("searchIntent")
      params.delete("results")
      router.push(`/?${params.toString()}`, {scroll: false})
    }
  }

  const handleDetailView = (persona: PersonaData) => {
    setSelectedPersona(persona)
    setIsDetailView(true)
  }
  
  // 안전하게 이름 값을 가져오는 함수
  const getPersonaName = (persona: PersonaData, index?: number): string => {
    return persona.personaData.name || `페르소나 ${index !== undefined ? index + 1 : ''}`
  }
  
  // 안전하게 키워드 배열을 가져오는 함수
  const getPersonaKeywords = (persona: PersonaData): string[] => {
    return Array.isArray(persona.personaData.keywords) ? persona.personaData.keywords : []
  }

  if (!searchPhase) return null

  return (
    <div className="mt-16 w-full max-w-6xl mx-auto px-4 min-h-[70vh]">
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

        {searchPhase === "results" && resultPersonas.length > 0 && !isDetailView && (
          <motion.div
            key="results-list"
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
            
            <div className="mb-10">
              <h2 className="text-2xl font-bold mb-3 text-center">
                &quot;{searchParams?.get("q")}&quot;에 대한 추천 페르소나
              </h2>
              <p className="text-center text-muted-foreground">당신의 질문에 가장 잘 맞는 페르소나 2명을 찾았습니다</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {resultPersonas.map((persona, index) => (
                <motion.div
                  key={persona.personaId}
                  variants={personaCardVariants}
                  custom={index}
                  initial="initial"
                  animate="animate"
                >
                  <Card className="h-full overflow-hidden transition-all hover:shadow-lg flex flex-col border-none bg-gradient-to-br from-background to-muted/50 shadow-xl hover:shadow-2xl hover:-translate-y-1">
                    <CardContent className="p-0">
                      <div className="relative">
                        <div className="absolute top-4 right-4 z-10">
                          <Badge className="font-medium bg-primary/80 backdrop-blur-sm">
                            일치도 {persona.relevanceScore}%
                          </Badge>
                        </div>
                        <div className="h-60 relative overflow-hidden bg-gradient-to-b from-primary/5 to-primary/10 border-b">
                          {persona.personaData.image ? (
                            <Image
                              src={persona.personaData.image}
                              alt={`${getPersonaName(persona, index)} 페르소나 이미지`}
                              fill
                              className="object-contain p-4"
                              sizes="(max-width: 768px) 100vw, 50vw"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="h-24 w-24 text-primary/20" />
                            </div>
                          )}
                        </div>
                        <div className="p-6">
                          <h3 className="text-2xl font-bold mb-3">{getPersonaName(persona, index)}</h3>
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {getPersonaKeywords(persona).slice(0, 4).map((keyword, i) => (
                              <Badge key={i} variant="secondary" className="bg-secondary/50 text-xs px-2 py-0.5">
                                {keyword}
                              </Badge>
                            ))}
                            {getPersonaKeywords(persona).length > 4 && (
                              <Badge variant="outline" className="text-xs px-2 py-0.5">+{getPersonaKeywords(persona).length - 4}</Badge>
                            )}
                          </div>
                          <div className="bg-muted/40 p-4 rounded-xl backdrop-blur-sm mb-4 border border-muted">
                            <p className="text-sm text-foreground/80 italic line-clamp-3">
                              "{persona.reason || '이 페르소나는 검색 쿼리와 관련이 있습니다.'}"
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="px-6 py-4 mt-auto gap-3 pt-0">
                      <Button 
                        variant="outline" 
                        className="flex-1 gap-1.5 h-11 rounded-xl"
                        onClick={() => handleDetailView(persona)}
                      >
                        <User className="h-4 w-4" />
                        상세 정보
                      </Button>
                      <Button 
                        className="flex-1 gap-1.5 h-11 rounded-xl bg-primary hover:bg-primary/90"
                        onClick={() => handleChatClick(persona.personaId)}
                      >
                        <MessageSquare className="h-4 w-4" />
                        대화하기
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {searchPhase === "results" && isDetailView && selectedPersona && (
          <motion.div
            key="detail-view"
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
              모든 결과로 돌아가기
            </Button>
            
            <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-background/80 to-muted/30 shadow-2xl">
              <div className="absolute inset-0 bg-primary/5 backdrop-blur-[2px] z-0"></div>
              
              <div className="flex flex-col lg:flex-row items-center lg:items-stretch relative z-10">
                {/* 페르소나 이미지 섹션 */}
                <div className="w-full lg:w-2/5 flex justify-center lg:justify-end relative">
                  <div className="relative w-64 h-64 lg:w-80 lg:h-80 xl:w-96 xl:h-96 mt-6 lg:mt-12 lg:-mr-6 z-10">
                    {selectedPersona.personaData.image ? (
                      <Image
                        src={selectedPersona.personaData.image}
                        alt={`${getPersonaName(selectedPersona)} 페르소나 상세 이미지`}
                        fill
                        className="object-contain drop-shadow-xl"
                        sizes="(max-width: 768px) 16rem, (max-width: 1024px) 20rem, 24rem"
                        priority
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted rounded-full">
                        <User className="h-24 w-24 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-radial from-primary/10 to-transparent z-0 opacity-60"></div>
                </div>

                {/* 페르소나 정보 섹션 */}
                <div className="w-full lg:w-3/5 px-6 lg:pl-10 lg:pr-12 pt-8 pb-10 flex flex-col">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap gap-1.5">
                      {getPersonaKeywords(selectedPersona).map((keyword, i) => (
                        <Badge key={i} variant="secondary" className="bg-secondary/50 backdrop-blur-sm">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                    <Badge className="font-medium bg-primary ml-auto">
                      일치도 {selectedPersona.relevanceScore}%
                    </Badge>
                  </div>
                  
                  <h2 className="text-3xl lg:text-4xl font-bold mb-5 text-foreground/90">
                    {getPersonaName(selectedPersona)}
                  </h2>
                  
                  <div className="w-full space-y-5">
                    <div className="p-4 rounded-xl bg-primary/10 backdrop-blur-sm border border-primary/20">
                      <h4 className="text-sm font-semibold text-primary mb-2">추천 이유</h4>
                      <p className="text-sm text-foreground/90 leading-relaxed italic">
                        "{selectedPersona.reason || '이 페르소나는 검색 쿼리와 관련이 있습니다.'}"
                      </p>
                    </div>
                    
                    <ScrollArea className="pr-4 max-h-[350px]">
                      <div className="space-y-4">
                        <div className="bg-background/70 backdrop-blur-sm p-4 rounded-xl border border-muted">
                          <h4 className="text-sm font-semibold text-primary mb-2">주요 인사이트</h4>
                          <p className="text-sm text-foreground/90">{selectedPersona.personaData.insight || '정보가 없습니다.'}</p>
                        </div>
                        
                        <div className="bg-background/70 backdrop-blur-sm p-4 rounded-xl border border-muted">
                          <h4 className="text-sm font-semibold text-primary mb-2">페인 포인트</h4>
                          <p className="text-sm text-foreground/90">{selectedPersona.personaData.painPoint || '정보가 없습니다.'}</p>
                        </div>
                        
                        <div className="bg-background/70 backdrop-blur-sm p-4 rounded-xl border border-muted">
                          <h4 className="text-sm font-semibold text-primary mb-2">숨겨진 니즈</h4>
                          <p className="text-sm text-foreground/90">{selectedPersona.personaData.hiddenNeeds || '정보가 없습니다.'}</p>
                        </div>
                      </div>
                    </ScrollArea>
                    
                    <Button 
                      className="w-full gap-2 h-12 rounded-xl mt-6 shadow-lg shadow-primary/20" 
                      size="lg"
                      onClick={() => handleChatClick(selectedPersona.personaId)}
                    >
                      <MessageSquare className="h-5 w-5" />
                      이 페르소나와 1:1 대화 시작하기
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 