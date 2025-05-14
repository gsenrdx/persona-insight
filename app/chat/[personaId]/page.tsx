"use client"

import { Suspense, useState, useEffect, use } from "react"
import ChatInterface from "@/components/chat-interface"
import { fetchPersonaById, fetchPersonas } from "@/lib/data"
import { notFound } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import Link from "next/link"
import PersonaSwitcher from "@/components/persona-switcher"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Home, UserPlus, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PersonaForPage {
  id: string;
  name: string;
  image?: string;
  keywords?: string[];
  insight?: string;
  summary?: string;
  painPoint?: string;
  hiddenNeeds?: string;
  persona_character?: string;
}

interface ChatPageProps {
  params: {
    personaId: string
  }
}

export default function ChatPage({ params }: ChatPageProps) {
  // params 객체 unwrap
  // Next.js runtime indicates params should be unwrapped with React.use().
  // Casting `params` to `any` to satisfy `use`'s `Usable` type requirement,
  // and casting the result of `use` to the expected shape.
  const unwrappedParams = use(params as any) as { personaId: string };
  const personaId = unwrappedParams.personaId;
  
  const [persona, setPersona] = useState<PersonaForPage | null>(null)
  const [allPersonas, setAllPersonas] = useState<PersonaForPage[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // 화면 크기 감지
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        const personaData = await fetchPersonaById(personaId) as PersonaForPage | null
        const allPersonasData = await fetchPersonas('all') as PersonaForPage[]
        
        if (!personaData) {
          notFound()
        }
        
        setPersona(personaData)
        setAllPersonas(allPersonasData)
        setLoading(false)
      } catch (error) {
        console.error("데이터 로딩 중 오류 발생:", error)
        notFound()
      }
    }
    
    loadData()
  }, [personaId])
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  if (loading) {
    return (
      <div className="h-screen grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">페르소나 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!persona) return null

  return (
    <div className="relative flex flex-col h-[100dvh] overflow-hidden isolate">
      {/* 배경 효과 - 부드러운 그라데이션과 패턴 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none -z-20" />
      <div className="absolute top-0 -left-96 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl -z-20" />
      <div className="absolute bottom-0 -right-96 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl -z-20" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-secondary/5 blur-3xl -z-20" />
      
      {/* 모바일 헤더 - 메뉴 토글 버튼 포함 */}
      <div className="md:hidden flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
        <Link href="/" className="inline-flex">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5 text-zinc-800 dark:text-zinc-200 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="text-sm">메인</span>
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="h-8 w-8 md:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      
      {/* 콘텐츠 영역 - 최적화된 레이아웃 구조 */}
      <div className="flex flex-1 h-full overflow-hidden">
        {/* 사이드바 - 토스 스타일 디자인, 모바일에서 토글 가능 */}
        <aside className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
          fixed md:relative md:w-80 lg:w-96 z-30 md:z-auto
          h-[calc(100dvh-57px)] md:h-full w-[85%] max-w-xs
          bg-white dark:bg-zinc-950 flex flex-col shadow-sm md:shadow-none
          border-r border-zinc-200 dark:border-zinc-800 
          overflow-hidden transition-transform duration-300
        `}>
          {/* 상단 헤더 - 깔끔한 네비게이션 (데스크톱 전용) */}
          <div className="hidden md:flex shrink-0 items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 h-16">
            <Link href="/" className="inline-flex">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1.5 text-zinc-800 dark:text-zinc-200 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Home className="h-4 w-4" />
                <span className="text-sm">돌아가기</span>
              </Button>
            </Link>
            <ModeToggle />
          </div>
          
          {/* 페르소나 프로필 섹션 - 페르소나 정보만 표시 */}
          <div className="shrink-0 h-32 sm:h-36 md:h-40 relative border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="relative h-full flex justify-between items-center p-3 sm:p-4 md:p-5">
              <div className="flex-1 pr-2 sm:pr-3 md:pr-4 z-10">
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                  {persona.name}
                </h2>
                {persona.summary && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {persona.summary.split('.')[0] + '.'}
                  </p>
                )}
              </div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 relative flex-shrink-0">
                <img
                  src={persona.image || `/placeholder.svg?height=256&width=256&query=${encodeURIComponent(persona.name)}`}
                  alt={persona.name}
                  className="object-contain w-full h-full select-none drop-shadow-md"
                  loading="eager"
                />
              </div>
            </div>
          </div>

          {/* 스크롤 가능한 정보 영역 - 토스 스타일 적용 */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <div className="px-4 sm:px-5 py-4 sm:py-5 space-y-4 sm:space-y-6">
              {/* 성격 및 말투 - 토스 스타일 적용 */}
              {persona.persona_character && (
                <div className="pb-4 sm:pb-5 border-b border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                    프로필
                  </h3>
                  <div className="text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 py-2.5 sm:py-3 px-3 sm:px-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    {persona.persona_character}
                  </div>
                </div>
              )}

              {/* 인사이트와 숨겨진 니즈 통합 섹션 */}
              {(persona.insight || persona.hiddenNeeds) && (
                <div className="pb-4 sm:pb-5 border-b border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                    핵심 니즈
                  </h3>
                  <div className="space-y-3">
                    {persona.insight && (
                      <div className="text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 py-2.5 sm:py-3 px-3 sm:px-4 bg-sky-50 dark:bg-sky-950/20 rounded-lg border border-sky-100 dark:border-sky-900/30">
                        <span className="font-medium text-zinc-600 dark:text-zinc-400"></span> {persona.insight}
                      </div>
                    )}
                    {persona.hiddenNeeds && (
                      <div className="text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 py-2.5 sm:py-3 px-3 sm:px-4 bg-sky-50 dark:bg-sky-950/20 rounded-lg border border-sky-100 dark:border-sky-900/30">
                        <span className="font-medium text-zinc-600 dark:text-zinc-400"></span> {persona.hiddenNeeds}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 페인 포인트 - 토스 스타일 적용 */}
              {persona.painPoint && (
                <div className="pb-4 sm:pb-5 border-b border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                    어려움
                  </h3>
                  <div className="text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 py-2.5 sm:py-3 px-3 sm:px-4 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-100 dark:border-rose-900/30">
                    {persona.painPoint}
                  </div>
                </div>
              )}

              {/* 키워드 섹션 - 토스 스타일 적용 */}
              {(persona.keywords || []).length > 0 && (
                <div className="pb-0 sm:pb-4">
                  <h3 className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                    키워드
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(persona.keywords || []).map((keyword, index) => (
                      <Badge 
                        key={index} 
                        className="text-[10px] sm:text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 페르소나 선택 - 통합된 컴포넌트 사용 */}
          <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3 sm:p-4">
            <PersonaSwitcher 
              currentPersona={persona} 
              allPersonas={allPersonas} 
              currentPersonaId={personaId}
            />
          </div>
        </aside>

        {/* 오버레이 - 모바일에서 사이드바 열릴 때 배경 어둡게 */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/30 z-20 md:hidden" 
            onClick={toggleSidebar}
            aria-hidden="true"
          />
        )}

        {/* 채팅 영역 - 최적화된 공간 활용 */}
        <main className="flex-1 flex flex-col bg-muted/5 min-w-0 relative">
          <Suspense fallback={
            <div className="h-full grid place-items-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground animate-pulse">대화 불러오는 중...</p>
              </div>
            </div>
          }>
            <ChatInterface personaId={personaId} personaData={persona} />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
