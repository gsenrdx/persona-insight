"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ErrorDisplay } from "@/components/ui/error-display"
import { RefreshCw, Home, AlertTriangle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 전역 에러 로깅
    // Global Error 발생
    
    // 향후 에러 리포팅 서비스 연동 (높은 우선순위)
    // ErrorReporter.report(error, { 
    //   context: 'global-error', 
    //   severity: 'critical',
    //   digest: error.digest 
    // })
  }, [error])

  return (
    <html>
      <body className="bg-background text-foreground">
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-lg mx-auto space-y-6">
            {/* 심각한 에러임을 강조하는 헤더 */}
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <AlertTriangle className="h-16 w-16 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-destructive">
                애플리케이션 오류
              </h1>
              <p className="text-muted-foreground">
                예상치 못한 심각한 문제가 발생했습니다
              </p>
            </div>

            {/* 통합 에러 표시 컴포넌트 사용 */}
            <ErrorDisplay
              error={error}
              variant="banner"
              size="lg"
              showErrorCode
              onRetry={reset}
              className="border-2 border-destructive/20"
            />
            
            {/* 복구 액션들 */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => reset()}
                  variant="default"
                  size="lg"
                  className="inline-flex items-center gap-2"
                >
                  <RefreshCw className="h-5 w-5" />
                  애플리케이션 다시 시작
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/" className="inline-flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    홈으로 돌아가기
                  </Link>
                </Button>
              </div>

              {/* 추가 도움말 */}
              <div className="text-center text-sm text-muted-foreground space-y-2">
                <p>문제가 지속되면 다음을 시도해보세요:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>브라우저 새로고침 (Ctrl+F5 또는 Cmd+Shift+R)</li>
                  <li>브라우저 캐시 삭제</li>
                  <li>다른 브라우저에서 접속</li>
                  <li>잠시 후 다시 시도</li>
                </ul>
              </div>
            </div>

            {/* 개발 모드에서만 상세 정보 표시 */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-8 p-4 bg-muted rounded-lg text-sm border">
                <summary className="cursor-pointer font-medium mb-3 text-destructive">
                  🔧 개발자 정보 (프로덕션에서는 숨겨짐)
                </summary>
                <div className="space-y-3 text-muted-foreground">
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <strong>Error Type:</strong> {error.constructor.name}
                    </div>
                    <div>
                      <strong>Error Name:</strong> {error.name}
                    </div>
                    <div>
                      <strong>Error Message:</strong> {error.message}
                    </div>
                    {error.digest && (
                      <div>
                        <strong>Error Digest:</strong> {error.digest}
                      </div>
                    )}
                    <div>
                      <strong>Timestamp:</strong> {new Date().toISOString()}
                    </div>
                  </div>
                  {error.stack && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="mt-2 text-xs bg-background p-3 rounded border overflow-auto max-h-48">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  )
} 