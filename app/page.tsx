import { Suspense } from "react"
import PersonaCardGrid from "@/components/persona-card-grid"
import SearchBar from "@/components/search-bar"
import SearchResult from "@/components/search-result"
import TagList from "@/components/tag-list"
import SkeletonCardGrid from "@/components/skeleton-card-grid"
import { ModeToggle } from "@/components/mode-toggle"

export default function Home({ searchParams }: { searchParams: { q?: string, searchIntent?: string, results?: string } }) {
  const isSearching = !!searchParams.searchIntent || !!searchParams.results
  
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background to-muted/20 overflow-hidden">
      {/* 배경 장식 요소 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
      <div className="absolute top-20 -left-96 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute top-1/2 -right-96 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      
      <header className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/80" />
            <div className="flex items-baseline">
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Persona Insight</h2>
              <span className="ml-2 text-xs text-muted-foreground">by MISO1004</span>
            </div>
          </div>
          <ModeToggle />
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            당신의 고객을 경험하세요
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed">
            Persona Insight는 고객의 니즈와 행동 패턴을 더 깊이 이해하고 대화할 수 있는 서비스입니다.
          </p>
        </div>

        <div className="max-w-3xl mx-auto mb-12">
          <SearchBar />
          {!isSearching && (
            <div className="mt-6">
              <TagList />
            </div>
          )}
        </div>

        {isSearching ? (
          <SearchResult />
        ) : (
          <Suspense fallback={<SkeletonCardGrid />}>
            <PersonaCardGrid />
          </Suspense>
        )}
      </main>
    </div>
  )
}
