"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function InterviewsPage() {
  const router = useRouter()

  useEffect(() => {
    // 프로젝트 페이지로 리다이렉트
    router.replace('/projects')
  }, [router])

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background to-muted/20 overflow-hidden">
      <div className="flex items-center justify-center min-h-screen relative z-10">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">프로젝트 페이지로 이동 중...</p>
        </div>
      </div>
    </div>
  )
} 