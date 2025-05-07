import { Suspense } from "react"
import ChatInterface from "@/components/chat-interface"
import { fetchPersonaById, fetchPersonas } from "@/lib/data"
import { notFound } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import Link from "next/link"
import PersonaSwitcher from "@/components/persona-switcher"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Home, UserPlus } from "lucide-react"
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
}

interface ChatPageProps {
  params: {
    personaId: string
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const persona = await fetchPersonaById(params.personaId) as PersonaForPage | null
  const allPersonas = await fetchPersonas('all') as PersonaForPage[]

  if (!persona) {
    notFound()
  }

  return (
    <div className="relative flex flex-col h-screen overflow-hidden isolate">
      {/* 배경 효과 - 부드러운 그라데이션과 패턴 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none -z-20" />
      <div className="absolute top-0 -left-96 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl -z-20" />
      <div className="absolute bottom-0 -right-96 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl -z-20" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-secondary/5 blur-3xl -z-20" />
      
      {/* 콘텐츠 영역 - 최적화된 레이아웃 구조 */}
      <div className="flex flex-1 h-full overflow-hidden">
        {/* 사이드바 - 토스 스타일 디자인 */}
        <aside className="w-80 md:w-96 bg-white dark:bg-zinc-950 flex flex-col shadow-sm border-r border-zinc-200 dark:border-zinc-800 overflow-hidden transition-all duration-300">
          {/* 상단 헤더 - 깔끔한 네비게이션 */}
          <div className="shrink-0 flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 h-16">
            <Link href="/" className="inline-flex">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1.5 text-zinc-800 dark:text-zinc-200 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Home className="h-4 w-4" />
                <span className="text-sm">메인으로</span>
              </Button>
            </Link>
            <ModeToggle />
          </div>
          
          {/* 페르소나 프로필 섹션 - 페르소나 정보만 표시 */}
          <div className="shrink-0 h-36 md:h-40 relative border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="relative h-full flex justify-between items-center p-4 md:p-5">
              <div className="flex-1 pr-3 md:pr-4 z-10">
                <h2 className="text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1 line-clamp-1">
                  {persona.name}
                </h2>
                {persona.summary && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
                    {persona.summary}
                  </p>
                )}
              </div>
              <div className="w-20 h-20 md:w-24 md:h-24 relative flex-shrink-0">
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
            <div className="px-6 py-5 space-y-6">
              {/* 인사이트 카드 - 토스 스타일 적용 */}
              {persona.insight && (
                <div className="pb-5 border-b border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                    내 인사이트
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 py-3 px-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    "{persona.insight}"
                  </p>
                </div>
              )}

              {/* 키워드 섹션 - 토스 스타일 적용 */}
              {(persona.keywords || []).length > 0 && (
                <div className="pb-5 border-b border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                    키워드
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(persona.keywords || []).map((keyword, index) => (
                      <Badge 
                        key={index} 
                        className="text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 rounded-full px-2.5 py-1"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 페인 포인트 - 토스 스타일 적용 */}
              {persona.painPoint && (
                <div className="pb-5 border-b border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                    내 어려움
                  </h3>
                  <div className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 py-3 px-4 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-100 dark:border-rose-900/30">
                    {persona.painPoint}
                  </div>
                </div>
              )}
              
              {/* 숨겨진 니즈 - 토스 스타일 적용 */}
              {persona.hiddenNeeds && (
                <div className="pb-5">
                  <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                    내 숨겨진 니즈
                  </h3>
                  <div className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 py-3 px-4 bg-sky-50 dark:bg-sky-950/20 rounded-lg border border-sky-100 dark:border-sky-900/30">
                    {persona.hiddenNeeds}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 페르소나 선택 - 통합된 컴포넌트 사용 */}
          <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4">
            <PersonaSwitcher 
              currentPersona={persona} 
              allPersonas={allPersonas} 
              currentPersonaId={params.personaId}
            />
          </div>
        </aside>

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
            <ChatInterface personaId={params.personaId} personaData={persona} />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
