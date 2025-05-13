"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertOctagon, RefreshCw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 에러 로깅
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="bg-destructive/10 p-6 rounded-xl text-center max-w-md mx-auto mb-6">
        <AlertOctagon className="h-10 w-10 text-destructive mx-auto mb-4" />
        <p className="text-xl font-semibold text-destructive mb-2">오류가 발생했습니다</p>
        <p className="text-muted-foreground mb-6">
          페이지를 로드하는 중 문제가 발생했습니다. 다시 시도하거나 홈으로 돌아가세요.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => reset()}
            variant="outline"
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </Button>
          <Button asChild>
            <Link href="/">홈으로 돌아가기</Link>
          </Button>
        </div>
      </div>
    </div>
  )
} 