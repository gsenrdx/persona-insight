import { Suspense } from "react"
import { PersonaCardGrid } from "@/components/persona"
import { SearchBar, SearchResult } from "@/components/search"
import { TagList, SkeletonCardGrid } from "@/components/shared"
import { AppLayout } from "@/components/layout/app-layout"
import { PagePrefetch } from "./page-prefetch"

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string, searchIntent?: string, results?: string }> }) {
  const params = await searchParams
  const isSearching = !!params.searchIntent || !!params.results
  
  return (
    <AppLayout>
      {/* 프로젝트 데이터 프리페칭 */}
      <PagePrefetch />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            우리의 고객을 만나보세요
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed">
            Persona Insight는 고객의 니즈와 행동 패턴을 더 깊이 이해하고 대화할 수 있는 서비스입니다.
          </p>
        </div>

        <div className="max-w-3xl mx-auto mb-6">
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
      </div>
      
      <footer className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        <p>© 2025 Persona Insight by MISO. All rights reserved.</p>
      </footer>
    </AppLayout>
  )
}
