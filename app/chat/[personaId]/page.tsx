"use client"

import { Suspense, useState, useEffect, use } from "react"
import { ChatInterface } from "@/components/chat"
import { fetchPersonas } from "@/lib/data/persona-data"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { PersonaSwitcher } from "@/components/persona"
import { Badge } from "@/components/ui/badge"
import { Home, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

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
  // Chat API에서 필요한 추가 필드들
  persona_title?: string;
  persona_summary?: string;
  persona_style?: string;
  painpoints?: string;
  needs?: string;
  insight_quote?: string;
}

interface ChatPageProps {
  params: Promise<{
    personaId: string
  }>
}

export default function ChatPage({ params }: ChatPageProps) {
  // params 객체 unwrap
  const unwrappedParams = use(params);
  const personaId = unwrappedParams.personaId;
  
  const { profile } = useAuth() // 사용자 프로필에서 company_id 가져오기
  const [persona, setPersona] = useState<PersonaForPage | null>(null)
  const [allPersonas, setAllPersonas] = useState<PersonaForPage[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isSubscribed = true;
    
    const loadData = async () => {
      try {
        // 프로필이 아직 로드되지 않았으면 대기
        if (!profile?.company_id) {
          return;
        }

        // 전체 페르소나를 한 번만 가져오기
        const allPersonasData = await fetchPersonas(profile.company_id) as PersonaForPage[]
        
        // 컴포넌트가 언마운트되었으면 상태 업데이트 하지 않음
        if (!isSubscribed) return;
        
        // 가져온 데이터에서 현재 페르소나 찾기
        const personaData = allPersonasData.find(p => p.id === personaId) || null
        
        if (!personaData) {
          notFound()
        }
        
        setPersona(personaData)
        setAllPersonas(allPersonasData)
        setLoading(false)
      } catch (error) {
        if (isSubscribed) {
          // 데이터 로딩 오류
          notFound()
        }
      }
    }
    
    loadData()
    
    return () => {
      isSubscribed = false;
    }
  }, [personaId, profile?.company_id])
  
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
      <div className="md:hidden flex items-center justify-between p-3 border-b border-zinc-200 bg-white shadow-sm">
        <Link href="/" className="inline-flex">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5 text-zinc-800 font-medium hover:bg-zinc-100 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="text-sm">메인</span>
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar}
          className="h-8 w-8 md:hidden"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      
      {/* 콘텐츠 영역 - 최적화된 레이아웃 구조 */}
      <div className="flex flex-1 h-full overflow-hidden">
        {/* 사이드바 - 개선된 모던 디자인 */}
        <aside className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
          fixed md:relative md:w-80 lg:w-96 z-30 md:z-auto
          h-[calc(100dvh-57px)] md:h-full w-[85%] max-w-xs
          bg-white/95 backdrop-blur-sm flex flex-col shadow-lg md:shadow-none
          border-r border-zinc-200/50 
          overflow-hidden transition-all duration-300 ease-in-out
        `}>
          {/* 상단 헤더 - 최소화된 네비게이션 */}
          <div className="hidden md:flex shrink-0 items-center justify-between p-4 border-b border-zinc-100/80 h-14">
            <Link href="/" className="inline-flex">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1.5 text-zinc-700 font-medium hover:bg-zinc-100 transition-all duration-200 rounded-lg"
              >
                <Home className="h-4 w-4" />
                <span className="text-sm">홈</span>
              </Button>
            </Link>
          </div>
          
          {/* 페르소나 프로필 섹션 - 원래 디자인 + 여백 개선 */}
          <div className="shrink-0 h-36 sm:h-40 md:h-44 relative border-b border-zinc-100 bg-zinc-50/50">
            <div className="relative h-full flex justify-between items-center p-4 sm:p-5 md:p-6">
              <div className="flex-1 pr-3 sm:pr-4 md:pr-5 z-10">
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-zinc-900 mb-1.5">
                  {persona.persona_title || persona.name}
                </h2>
                {persona.summary && (
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {persona.summary.split('.')[0] + '.'}
                  </p>
                )}
              </div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 relative flex-shrink-0">
                <Image
                  src={persona.image || `/placeholder.svg?height=256&width=256&text=${encodeURIComponent(persona.persona_title || persona.name)}`}
                  alt={persona.persona_title || persona.name}
                  width={96}
                  height={96}
                  className="object-contain w-full h-full select-none drop-shadow-md"
                  priority
                  unoptimized={persona.image?.includes('supabase.co')}
                />
              </div>
            </div>
          </div>

          {/* 스크롤 가능한 정보 영역 - 개선된 디자인 */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent">
            <div className="px-5 py-4 space-y-5">
              {/* 성격 및 말투 - 모던 카드 스타일 */}
              {(persona.persona_style || persona.persona_character) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                    성격 & 특징
                  </h3>
                  <div className="text-sm leading-relaxed text-zinc-600 p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-xl border border-blue-100/50">
                    {persona.persona_style || persona.persona_character}
                  </div>
                </div>
              )}

              {/* 페인 포인트 - 개선된 스타일 */}
              {(persona.painpoints || persona.painPoint) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                    <div className="w-1 h-4 bg-rose-500 rounded-full"></div>
                    고민 & 어려움
                  </h3>
                  <div className="text-sm leading-relaxed text-zinc-600 p-4 bg-gradient-to-br from-rose-50/50 to-pink-50/30 rounded-xl border border-rose-100/50">
                    {persona.painpoints || persona.painPoint}
                  </div>
                </div>
              )}

              {/* 인사이트와 니즈 - 통합된 섹션 */}
              {(persona.insight || persona.needs || persona.hiddenNeeds) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                    니즈 & 인사이트
                  </h3>
                  <div className="space-y-3">
                    {persona.insight && (
                      <div className="text-sm leading-relaxed text-zinc-600 p-4 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 rounded-xl border border-emerald-100/50">
                        {persona.insight}
                      </div>
                    )}
                    {(persona.needs || persona.hiddenNeeds) && (
                      <div className="text-sm leading-relaxed text-zinc-600 p-4 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 rounded-xl border border-emerald-100/50">
                        {persona.needs || persona.hiddenNeeds}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 키워드 섹션 - 개선된 태그 디자인 */}
              {(persona.keywords || []).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                    <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                    키워드
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(persona.keywords || []).map((keyword, index) => (
                      <Badge 
                        key={index} 
                        className="text-xs font-medium bg-gradient-to-r from-zinc-100 to-zinc-50 hover:from-zinc-200 hover:to-zinc-100 text-zinc-700 rounded-lg px-3 py-1.5 border border-zinc-200/50 transition-all duration-200"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 페르소나 선택 - 개선된 디자인 */}
          <div className="shrink-0 border-t border-zinc-100/80 bg-gradient-to-t from-zinc-50/80 to-transparent p-4">
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
            <ChatInterface personaId={personaId} personaData={persona} allPersonas={allPersonas} />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
