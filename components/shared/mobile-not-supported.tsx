"use client"

import { useEffect, useState } from "react"
import { Monitor } from "lucide-react"

// 고객 경험에 대한 명언들
const customerQuotes = [
  "고객의 목소리는 가장 값진 피드백이다.",
  "고객을 이해하는 것이 성공의 첫걸음이다.",
  "고객의 경험이 브랜드의 진정한 가치를 결정한다.",
  "고객이 필요로 하는 것이 아니라 원하는 것을 파악하라.",
  "고객의 불만은 개선의 기회다.",
  "고객의 감정을 이해하면 진정한 솔루션을 찾을 수 있다.",
  "고객과의 모든 접점이 브랜드를 만든다.",
  "고객의 여정을 따라가면 답이 보인다.",
  "고객의 신뢰는 하루아침에 만들어지지 않는다.",
  "고객 중심 사고가 혁신의 출발점이다."
]

export default function MobileNotSupported() {
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentQuote, setCurrentQuote] = useState("")

  useEffect(() => {
    setMounted(true)
    
    const checkIfMobile = () => {
      const width = window.innerWidth
      // 768px 이하를 모바일로 간주 (Tailwind의 md breakpoint)
      setIsMobile(width < 768)
    }

    // 랜덤 명언 선택
    const randomQuote = customerQuotes[Math.floor(Math.random() * customerQuotes.length)]
    setCurrentQuote(randomQuote)

    // 초기 체크
    checkIfMobile()

    // 화면 크기 변경 감지
    window.addEventListener('resize', checkIfMobile)
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  // 서버사이드 렌더링 시에는 표시하지 않음
  if (!mounted) return null

  // 모바일이 아니면 표시하지 않음
  if (!isMobile) return null

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-black flex flex-col items-center justify-center p-8">
      {/* 중앙 콘텐츠 */}
      <div className="text-center space-y-8">
        {/* 로고 */}
        <div className="space-y-4">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto">
            <div className="w-8 h-8 bg-white rounded-xl"></div>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Persona Insight
          </h1>
        </div>

        {/* 메시지 */}
        <div className="space-y-2">
          <h2 className="text-xl font-medium text-gray-900 dark:text-white">
            모바일 준비중
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            PC에서 이용해주세요
          </p>
        </div>

        {/* 명언 */}
        {currentQuote && (
          <div className="max-w-xs mx-auto">
            <p className="text-sm text-gray-400 dark:text-gray-500 italic leading-relaxed">
              "{currentQuote}"
            </p>
          </div>
        )}
      </div>
    </div>
  )
}