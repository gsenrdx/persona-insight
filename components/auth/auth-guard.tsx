'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, error, refreshProfile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // 로딩 중일 때
  if (loading) {
    return (
      <div className="relative min-h-screen bg-gradient-to-b from-background to-muted/20 overflow-hidden">
        {/* 배경 장식 요소 */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
        <div className="absolute top-20 -left-96 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 -right-96 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        
        <div className="flex items-center justify-center min-h-screen relative z-10">
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">인증 상태를 확인하고 있어요...</p>
          </div>
        </div>
      </div>
    )
  }

  // 인증 에러가 있는 경우
  if (error) {
    return (
      <div className="relative min-h-screen bg-gradient-to-b from-background to-muted/20 overflow-hidden">
        {/* 배경 장식 요소 */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
        <div className="absolute top-20 -left-96 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 -right-96 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        
        <div className="flex items-center justify-center min-h-screen relative z-10">
          <div className="max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">인증 오류가 발생했어요</h2>
              <p className="text-muted-foreground text-sm">잠시 후 다시 시도해주세요.</p>
            </div>
            
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => window.location.reload()} 
                className="flex-1"
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                새로고침
              </Button>
              <Button 
                onClick={refreshProfile}
                className="flex-1"
              >
                다시 시도
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 로그인되지 않은 경우 null 반환 (리다이렉트 진행 중)
  if (!user) {
    return (
      <div className="relative min-h-screen bg-gradient-to-b from-background to-muted/20 overflow-hidden">
        {/* 배경 장식 요소 */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
        <div className="absolute top-20 -left-96 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 -right-96 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        
        <div className="flex items-center justify-center min-h-screen relative z-10">
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">로그인 페이지로 이동 중...</p>
          </div>
        </div>
      </div>
    )
  }

  // 로그인된 경우 자식 컴포넌트 렌더링
  return <>{children}</>
} 