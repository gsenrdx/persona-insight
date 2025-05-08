"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"

export default function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") || "")
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const { toast } = useToast()

  useEffect(() => {
    // 빈 쿼리일 때만 URL 파라미터 제거
    if (debouncedQuery === "" && searchParams.has("q")) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("q")
      // 화면 깜빡임 방지를 위해 replace 옵션 사용
      router.replace(`/?${params.toString()}`, { scroll: false })
    }
    // 검색어가 변경될 때 Enter 키를 눌렀을 때만 URL을 업데이트하도록 함
    // 일반적인 타이핑 중에는 URL 업데이트하지 않음
  }, [debouncedQuery, router, searchParams])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }

  const clearSearch = () => {
    setQuery("")
  }

  // 엔터 키 처리 - AI에게 적합한 페르소나 추천 받기
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim() && !isLoading) {
      try {
        setIsLoading(true)
        
        e.preventDefault()
        
        // 검색 이벤트를 트리거하기 위해 URL에 searchIntent 파라미터 추가
        const params = new URLSearchParams(searchParams.toString())
        params.set("q", query)
        params.set("searchIntent", "chat")
        router.push(`/?${params.toString()}`, {scroll: false})
        
        // AI 페르소나 검색 API 호출
        const response = await fetch('/api/persona-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        })
        
        if (!response.ok) {
          throw new Error('페르소나 검색에 실패했습니다')
        }
        
        const data = await response.json()
        
        if (data.recommendedPersonas && data.recommendedPersonas.length > 0) {
          // 검색 결과 URL 설정 - 여러 페르소나 결과를 JSON 문자열로 저장
          const resultParams = new URLSearchParams()
          resultParams.set("q", query)
          resultParams.set("results", "true") // 단일 결과가 아닌 여러 결과가 있음을 표시
          
          // 결과 데이터를 URL에 저장하지 않고 세션 스토리지에 저장
          sessionStorage.setItem('personaSearchResults', JSON.stringify(data.recommendedPersonas))
          
          router.push(`/?${resultParams.toString()}`, {scroll: false})
        } else {
          toast({
            title: "적합한 페르소나를 찾을 수 없습니다",
            description: "다른 검색어를 입력해 보세요.",
            variant: "destructive",
          })
          // 검색 의도 파라미터 제거
          const clearParams = new URLSearchParams(searchParams.toString())
          clearParams.delete("searchIntent")
          router.push(`/?${clearParams.toString()}`, {scroll: false})
        }
      } catch (error) {
        console.error('페르소나 검색 오류:', error)
        toast({
          title: "오류가 발생했습니다",
          description: "잠시 후 다시 시도해 주세요.",
          variant: "destructive",
        })
        // 검색 의도 파라미터 제거
        const clearParams = new URLSearchParams(searchParams.toString())
        clearParams.delete("searchIntent")
        router.push(`/?${clearParams.toString()}`, {scroll: false})
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full mx-auto max-w-2xl"
    >
      <div 
        className={`
          relative rounded-full transition-all duration-200 ease-in-out
          ${isFocused 
            ? 'shadow-xl shadow-primary/10 ring-2 ring-primary/20' 
            : 'shadow-md shadow-black/5 hover:shadow-lg hover:shadow-black/10'
          }
          ${isLoading ? 'pr-32' : ''}
        `}
      >
        <Search 
          className={`
            absolute left-5 top-1/2 transform -translate-y-1/2 transition-colors
            ${isFocused ? 'text-primary' : 'text-muted-foreground'} 
            h-5 w-5
          `} 
        />
        
        <Input 
          type="text" 
          placeholder="예: 안전 관리에 관심이 많은 주유소 관리자" 
          value={query} 
          onChange={handleSearch}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            pl-14 pr-14 py-6 h-16 text-lg bg-card border-muted rounded-full 
            placeholder:text-muted-foreground/70 transition-all
            focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary/30
            ${isLoading ? 'opacity-80' : ''}
          `} 
          disabled={isLoading}
        />
        
        {query && !isLoading && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={clearSearch}
            className="absolute right-5 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full 
              bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">검색어 지우기</span>
          </Button>
        )}
        
        {isLoading && (
          <div className="absolute right-5 top-1/2 transform -translate-y-1/2 flex items-center">
            <div className="mr-2 text-xs font-medium text-primary-foreground bg-primary/90 px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
              <span>AI가 페르소나 찾는 중</span>
            </div>
            <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>
      
      {query && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-5 -bottom-9 text-xs text-primary bg-background/80 px-2 py-1 rounded-md shadow-sm"
        >
          <span>Enter 키를 눌러 AI에게 적합한 대화 상대를 추천받으세요</span>
        </motion.div>
      )}
    </motion.div>
  )
}
