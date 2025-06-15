"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ErrorDisplay } from "@/components/ui/error-display"
import { ErrorUtils } from "@/lib/errors"
import { RefreshCw, Home } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 표준화된 에러 로깅
    console.error('Page Error:', ErrorUtils.toLogObject(error))
    
    // 향후 에러 리포팅 서비스 연동
    // ErrorReporter.report(error, { context: 'page-error', digest: error.digest })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* 통합 에러 표시 컴포넌트 사용 */}
        <ErrorDisplay
          error={error}
          variant="banner"
          size="lg"
          showErrorCode
          onRetry={reset}
          className="text-center"
        />
        
        {/* 추가 액션 버튼들 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => reset()}
            variant="default"
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </Button>
          <Button asChild variant="outline">
            <Link href="/" className="inline-flex items-center gap-2">
              <Home className="h-4 w-4" />
              홈으로 돌아가기
            </Link>
          </Button>
        </div>

        {/* 개발 모드에서만 추가 정보 표시 */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 p-4 bg-muted rounded-lg text-sm">
            <summary className="cursor-pointer font-medium mb-2">
              개발자 정보 (개발 모드에서만 표시)
            </summary>
            <div className="space-y-2 text-muted-foreground">
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
              {error.stack && (
                <div>
                  <strong>Stack Trace:</strong>
                  <pre className="mt-1 text-xs bg-background p-2 rounded border overflow-auto">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  )
} 