import { Suspense } from "react"
import Link from "next/link"
import { PersonaCardGrid } from "@/components/persona"
import { SearchBar, SearchResult } from "@/components/search"
import { TagList, SkeletonCardGrid, Navigation } from "@/components/shared"
import AuthGuard from "@/components/auth/auth-guard"
import UserMenu from "@/components/auth/user-menu"
import CompanyBranding from "@/components/auth/company-branding"

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string, searchIntent?: string, results?: string }> }) {
  const params = await searchParams
  const isSearching = !!params.searchIntent || !!params.results
  
  return (
    <AuthGuard>
    <div className="relative min-h-screen bg-gradient-to-b from-background to-muted/20 overflow-hidden">
      {/* 배경 장식 요소 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
      <div className="absolute top-20 -left-96 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute top-1/2 -right-96 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      
                  <header className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-baseline">
                <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Persona Insight</h2>
                <CompanyBranding />
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Navigation />
            <UserMenu />
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 relative z-10">
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
      </main>
      
      <footer className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        <p>© 2025 Persona Insight by MISO. All rights reserved.</p>
      </footer>
    </div>
    </AuthGuard>
  )
}
