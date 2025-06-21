"use client"

import { useState, useEffect, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { fetchKeywords } from "@/lib/data/persona-data"
import { useRouter, useSearchParams } from "next/navigation"
import { MoreHorizontal } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

// 키워드를 전역으로 저장하는 변수
let cachedKeywords: string[] | null = null

export default function TagList() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [keywords, setKeywords] = useState<string[]>(cachedKeywords || [])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(cachedKeywords === null)

  // searchParams를 문자열로 변환하여 의존성 배열에 안전하게 사용
  const searchParamsString = useMemo(() => {
    if (typeof window === "undefined") return "";
    return searchParams ? new URLSearchParams(searchParams).toString() : "";
  }, [searchParams]);

  // 선택된 키워드 추출
  const selectedKeywords = useMemo(() => 
    searchParams?.get("keywords")?.split(",").filter(Boolean) || [], 
    [searchParamsString]
  );

  useEffect(() => {
    // 캐시된 키워드가 없을 때만 API 호출
    const loadKeywords = async () => {
      if (cachedKeywords !== null) {
        setKeywords(cachedKeywords)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const data = await fetchKeywords()
        cachedKeywords = data
        setKeywords(data)
      } catch (error) {
        // \ud0a4\uc6cc\ub4dc \ub85c\ub4dc \uc2e4\ud328
      } finally {
        setIsLoading(false)
      }
    }

    loadKeywords()
  }, []) // 컴포넌트 마운트 시 한 번만 실행

  const toggleKeyword = (keyword: string) => {
    const newSelectedKeywords = selectedKeywords.includes(keyword)
      ? selectedKeywords.filter((k) => k !== keyword)
      : [...selectedKeywords, keyword]

    const params = new URLSearchParams(searchParams.toString())

    if (newSelectedKeywords.length > 0) {
      params.set("keywords", newSelectedKeywords.join(","))
    } else {
      params.delete("keywords")
    }

    router.push(`/?${params.toString()}`)
  }

  // 상위 5개의 키워드 또는 선택된 키워드를 보여주기 위한 로직
  const getVisibleTags = () => {
    // 선택된 키워드가 있다면 우선적으로 표시
    const selectedTags = selectedKeywords.filter(k => keywords.includes(k))
    
    // 나머지 슬롯에 표시할 인기 태그 (선택되지 않은 것들 중에서)
    const remainingPopularTags = keywords
      .filter(k => !selectedKeywords.includes(k))
      .slice(0, Math.max(0, 5 - selectedTags.length))
    
    return [...selectedTags, ...remainingPopularTags].slice(0, 5)
  }

  const visibleTags = getVisibleTags()
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const item = {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1 }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center">
        <div className="bg-muted/30 h-8 rounded-full w-64 animate-pulse"></div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-center">
        <motion.div 
          className="flex flex-wrap gap-2 justify-center py-2"
          variants={container}
          initial="hidden"
          animate="show"
          key={selectedKeywords.join(',')} // 선택된 태그가 변경될 때 애니메이션 재실행
        >
          {visibleTags.map((keyword, index) => (
            <motion.div key={keyword} variants={item}>
              <Badge
                variant={selectedKeywords.includes(keyword) ? "default" : "outline"}
                className={`
                  cursor-pointer text-sm px-3 py-1 rounded-full transition-all 
                  ${selectedKeywords.includes(keyword) 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'hover:bg-primary/10 hover:text-primary border-muted-foreground/30'}
                `}
                onClick={() => toggleKeyword(keyword)}
              >
                {keyword}
              </Badge>
            </motion.div>
          ))}
          
          {keywords.length > 0 && (
            <motion.div variants={item}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full h-8 w-8 flex items-center justify-center bg-muted/50 hover:bg-muted"
                onClick={() => setIsDialogOpen(true)}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">더 많은 태그 보기</span>
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center mb-4">모든 태그</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 max-h-[60vh] overflow-y-auto p-1">
            {keywords.map((keyword) => (
              <Badge
                key={keyword}
                variant={selectedKeywords.includes(keyword) ? "default" : "outline"}
                className={`
                  cursor-pointer text-sm px-3 py-1 rounded-full transition-all 
                  ${selectedKeywords.includes(keyword) 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'hover:bg-primary/10 hover:text-primary'}
                `}
                onClick={() => toggleKeyword(keyword)}
              >
                {keyword}
              </Badge>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 