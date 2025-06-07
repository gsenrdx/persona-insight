import { Suspense } from "react"
import Link from "next/link"
import { ModeToggle } from "@/components/shared"
import LoginPageContent from "@/components/auth/login-page-content"

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background to-muted/20 overflow-hidden">
      {/* 배경 장식 요소 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
      <div className="absolute top-20 -left-96 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute top-1/2 -right-96 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      
      <header className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex justify-between items-center">
          <Link href="/login" className="flex items-center gap-2">
            <div className="flex items-baseline">
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Persona Insight</h2>
              <span className="ml-2 text-xs text-muted-foreground">by MISO</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <ModeToggle />
          </div>
        </div>
      </header>
      
      <main className="relative z-10 flex-1">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">로딩 중...</p>
            </div>
          </div>
        }>
          <LoginPageContent />
        </Suspense>
      </main>
      
      <footer className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        <p>© 2025 Persona Insight by MISO. All rights reserved.</p>
      </footer>
    </div>
  )
} 