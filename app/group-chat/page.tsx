"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ArrowLeft, 
  Send,
  Loader2,
  Users
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

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
}

interface Message {
  id: string
  sender: string
  senderType: "user" | "persona"
  senderName: string
  senderImage?: string
  content: string
  timestamp: Date
}

export default function GroupChat() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [personaList, setPersonaList] = useState<PersonaData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // 페르소나 데이터 로딩
  useEffect(() => {
    async function loadPersonaData() {
      try {
        const personaParam = searchParams?.get("personas")
        
        if (!personaParam) {
          router.push("/")
          return
        }
        
        const personaIds = personaParam.split(",")
        
        // 세션 스토리지에서 모든 결과 데이터 가져오기
        const resultsData = sessionStorage.getItem('personaSearchResults')
        if (!resultsData) {
          router.push("/")
          return
        }
        
        const allPersonas = JSON.parse(resultsData)
        
        // 선택된 페르소나만 필터링
        const selectedPersonas = allPersonas.filter(
          (persona: PersonaData) => personaIds.includes(persona.personaId)
        )
        
        if (selectedPersonas.length === 0) {
          router.push("/")
          return
        }
        
        setPersonaList(selectedPersonas)
        
        // 초기 환영 메시지 생성
        const welcomeMessages: Message[] = selectedPersonas.map((persona: PersonaData, index: number) => ({
          id: `welcome-${index}`,
          sender: persona.personaId,
          senderType: "persona",
          senderName: persona.personaData.name || `페르소나 ${index + 1}`,
          senderImage: persona.personaData.image,
          content: `안녕하세요, ${persona.personaData.name || `페르소나 ${index + 1}`}입니다. 무엇을 도와드릴까요?`,
          timestamp: new Date(Date.now() + index * 500)
        }))
        
        setMessages(welcomeMessages)
        setIsLoading(false)
      } catch (error) {
        console.error("페르소나 데이터 로딩 실패:", error)
        router.push("/")
      }
    }
    
    loadPersonaData()
  }, [searchParams, router])
  
  // 메시지 스크롤 처리
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])
  
  // 메시지 전송 함수
  const handleSendMessage = async () => {
    if (!message.trim() || isTyping) return
    
    // 사용자 메시지 추가
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      senderType: "user",
      senderName: "사용자",
      content: message,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setMessage("")
    setIsTyping(true)
    
    // 각 페르소나별 응답 생성 (비동기로 개별 처리)
    setTimeout(() => {
      personaList.forEach((persona, index) => {
        // 각 페르소나별로 조금씩 시간차를 두고 응답
        setTimeout(() => {
          // 실제로는 여기서 API 호출하여 페르소나별 응답을 받아야 함
          // 현재는 더미 데이터로 대체
          const personaResponse: Message = {
            id: `persona-${persona.personaId}-${Date.now() + index}`,
            sender: persona.personaId,
            senderType: "persona",
            senderName: persona.personaData.name || `페르소나 ${index + 1}`,
            senderImage: persona.personaData.image,
            content: generateDummyResponse(message, persona),
            timestamp: new Date()
          }
          
          setMessages(prev => [...prev, personaResponse])
          
          // 마지막 페르소나 응답 후 타이핑 상태 해제
          if (index === personaList.length - 1) {
            setIsTyping(false)
          }
        }, index * 1000) // 각 페르소나 응답 간 시간차
      })
    }, 1000) // 사용자 메시지 후 페르소나 응답 시작 전 딜레이
  }
  
  // 더미 응답 생성 함수 (실제로는 API 호출로 대체되어야 함)
  const generateDummyResponse = (userMessage: string, persona: PersonaData) => {
    const personaName = persona.personaData.name || "페르소나";
    const responses = [
      `네, ${personaName}입니다. ${userMessage}에 대해 말씀드리자면, ${persona.personaData.insight}`,
      `제 관점에서는 ${userMessage}에 대해 이렇게 생각합니다. ${persona.personaData.painPoint}`,
      `흥미로운 질문이네요! ${persona.personaData.summary || persona.personaData.insight}`,
      `${userMessage}라는 주제는 제게 중요합니다. ${persona.personaData.hiddenNeeds}`
    ]
    
    return responses[Math.floor(Math.random() * responses.length)]
  }
  
  // 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }
  
  // 이니셜을 안전하게 가져오는 함수
  const getInitial = (name: string | undefined): string => {
    if (!name || name.length === 0) return "P";
    return name.charAt(0);
  }
  
  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>페르소나 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-screen max-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-2 py-3 px-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => router.back()}
            className="rounded-full h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">돌아가기</span>
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="relative flex -space-x-2">
              {personaList.slice(0, 3).map((persona, index) => (
                <Avatar 
                  key={persona.personaId} 
                  className={`border-2 border-background w-8 h-8 ${index > 0 ? 'ml-[-10px]' : ''}`}
                >
                  <AvatarImage 
                    src={persona.personaData.image} 
                    alt={`${persona.personaData.name || `페르소나 ${index + 1}`} 프로필 이미지`} 
                  />
                  <AvatarFallback>{getInitial(persona.personaData.name)}</AvatarFallback>
                </Avatar>
              ))}
              {personaList.length > 3 && (
                <Avatar className="border-2 border-background w-8 h-8 ml-[-10px] bg-muted">
                  <AvatarFallback>+{personaList.length - 3}</AvatarFallback>
                </Avatar>
              )}
            </div>
            <div className="flex flex-col">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                그룹 채팅
                <Badge 
                  variant="outline" 
                  className="ml-1 py-0 h-5 text-xs font-normal"
                >
                  {personaList.length}명
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-[250px] md:max-w-none">
                {personaList.map(p => p.personaData.name || `페르소나`).join(', ')}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 채팅 영역 */}
      <ScrollArea className="flex-grow p-4">
        <div className="max-w-3xl mx-auto space-y-4 pb-20">
          {messages.map((msg, index) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2 max-w-[85%] ${msg.senderType === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.senderType === 'persona' && (
                  <Avatar className="flex-shrink-0 h-8 w-8">
                    {msg.senderImage ? (
                      <AvatarImage 
                        src={msg.senderImage} 
                        alt={`${msg.senderName} 프로필 이미지`} 
                      />
                    ) : (
                      <AvatarFallback>{getInitial(msg.senderName)}</AvatarFallback>
                    )}
                  </Avatar>
                )}
                
                <div className={`flex flex-col ${msg.senderType === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.senderType === 'persona' && (
                    <div className="text-xs text-muted-foreground ml-1 mb-1">
                      {msg.senderName}
                    </div>
                  )}
                  
                  <div className={`rounded-2xl px-4 py-2.5 ${
                    msg.senderType === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : 'bg-muted text-foreground rounded-tl-sm'
                  }`}>
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                  </div>
                  
                  <div className={`text-[10px] text-muted-foreground mt-1 ${msg.senderType === 'user' ? 'mr-1' : 'ml-1'}`}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-2 max-w-[85%]">
                <Avatar className="flex-shrink-0 h-8 w-8">
                  <AvatarFallback>...</AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col items-start">
                  <div className="bg-muted rounded-2xl px-4 py-3 rounded-tl-sm">
                    <div className="flex gap-1">
                      <span className="animate-bounce delay-0">●</span>
                      <span className="animate-bounce delay-75">●</span>
                      <span className="animate-bounce delay-150">●</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      
      {/* 메시지 입력 영역 */}
      <div className="p-4 border-t bg-background/50 backdrop-blur-sm sticky bottom-0">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            disabled={isTyping}
            className="py-6 bg-card"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!message.trim() || isTyping}
            className="h-auto px-4"
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">전송</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

// 시간 포맷 헬퍼 함수
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
} 