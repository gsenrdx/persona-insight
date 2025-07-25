'use client'

import { useAuth } from '@/hooks/use-auth'

interface SuperAdminGuardProps {
  children: React.ReactNode
}

export default function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const { user, profile, loading } = useAuth()

  // 로딩 중일 때
  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // super_admin이 아닌 경우
  if (profile.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-4 text-center">
          <div className="h-16 w-16 bg-muted rounded-full mx-auto mb-6 flex items-center justify-center">
            🔒
          </div>
          <h1 className="text-2xl font-bold mb-4">접근 권한이 없습니다</h1>
          <p className="text-muted-foreground mb-6">
            이 페이지는 시스템 관리자만 접근할 수 있습니다.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  // super_admin인 경우 자식 컴포넌트 렌더링
  return <>{children}</>
} 