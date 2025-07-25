'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { AuthGuardProps } from '@/types/components'

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-background" />
  )
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, profile, loading, error, refreshProfile } = useAuth()
  const router = useRouter()

  // 사용자가 로그인되지 않은 경우 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  // 권한별 리다이렉트 처리 - profile이 완전히 로딩된 후에만 실행
  useEffect(() => {
    // loading이 끝나고, user와 profile이 모두 있을 때만 실행
    if (!loading && user && profile) {
      const currentPath = window.location.pathname
      
      if (profile.role === 'super_admin') {
        // super_admin은 /admin 페이지로
        if (!currentPath.startsWith('/admin')) {
          router.replace('/admin')
        }
      } else if (profile.role === 'company_admin' || profile.role === 'company_user') {
        // company_admin, company_user는 /admin 접근 시 홈으로
        if (currentPath.startsWith('/admin')) {
          router.replace('/')
        }
      }
    }
  }, [user, profile, loading, router])

  // 로딩 중이거나 profile이 아직 로딩되지 않은 경우
  if (loading || (user && !profile)) {
    return <AuthLoadingScreen />
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
              <p className="text-muted-foreground text-sm">프로필 정보를 불러오는 중 문제가 발생했습니다.</p>
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

  // 사용자가 로그인되지 않은 경우 로딩 화면 표시
  if (!user) {
    return <AuthLoadingScreen />
  }

  // 로그인된 경우 자식 컴포넌트 렌더링
  return <>{children}</>
} 