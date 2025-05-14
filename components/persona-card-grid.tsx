"use client"

import { useState, useEffect, useMemo } from "react"
import PersonaCard, { PersonaCardProps } from "./persona-card"
import { useInView } from "react-intersection-observer"
import { fetchPersonas } from "@/lib/data"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, AlertOctagon, RefreshCw, SearchX, Plus } from "lucide-react"
import { motion } from "framer-motion"
import AddInterviewModal from "./add-interview-modal"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Persona extends Omit<PersonaCardProps, 'summary'> {
  summary?: string;
}

// 전역 변수로 한 번 로드한 데이터 캐싱
let cachedAllPersonas: Persona[] | null = null;

export default function PersonaCardGrid() {
  const [allPersonas, setAllPersonas] = useState<Persona[]>(cachedAllPersonas || [])
  const [filteredPersonas, setFilteredPersonas] = useState<Persona[]>([])
  const [isLoading, setIsLoading] = useState(cachedAllPersonas === null)
  const [error, setError] = useState<string | null>(null)
  const [isAddInterviewModalOpen, setIsAddInterviewModalOpen] = useState(false)
  const searchParams = useSearchParams()

  // searchParams를 문자열로 변환하여 의존성 배열에 안전하게 사용
  const searchParamsString = useMemo(() => {
    if (typeof window === "undefined") return "";
    return searchParams ? new URLSearchParams(searchParams).toString() : "";
  }, [searchParams]);

  // searchParams에서 필요한 값 추출
  const searchQuery = useMemo(() => searchParams?.get("q") || "", [searchParamsString]);
  const selectedKeywords = useMemo(() => 
    searchParams?.get("keywords")?.split(",").filter(Boolean) || [], 
    [searchParamsString]
  );

  // 최초 한 번만 모든 데이터 로드
  useEffect(() => {
    // 이미 캐시된 데이터가 있으면 사용
    if (cachedAllPersonas) {
      setAllPersonas(cachedAllPersonas);
      setIsLoading(false);
      return;
    }

    async function loadAllPersonas() {
      try {
        setIsLoading(true)
        // 모든 페이지 데이터를 한번에 로드
        const data = await fetchPersonas('all')
        cachedAllPersonas = data; // 전역 캐시에 저장
        setAllPersonas(data)
      } catch (error) {
        console.error("Failed to fetch personas:", error)
        setError("데이터를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    loadAllPersonas();
  }, []) // 의존성 배열을 비워서 컴포넌트 마운트 시 한 번만 실행

  // 검색어와 필터에 따라 클라이언트 측에서 필터링
  useEffect(() => {
    if (allPersonas.length === 0) return;

    // 키워드 필터링만 적용하고 검색어에 의한 필터링은 제거
    const filtered = allPersonas.filter((persona) => {
      // 키워드 필터링
      const matchesKeywords =
        selectedKeywords.length > 0
          ? selectedKeywords.every((keyword) =>
              persona.keywords.some((k: string) => 
                k.toLowerCase().includes(keyword.toLowerCase()) || 
                keyword.toLowerCase().includes(k.toLowerCase())
              ),
            )
          : true

      return matchesKeywords
    })

    setFilteredPersonas(filtered)
  }, [allPersonas, selectedKeywords]) // searchQuery 의존성 제거

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="bg-destructive/10 p-6 rounded-xl text-center max-w-md mx-auto mb-6">
          <AlertOctagon className="h-10 w-10 text-destructive mx-auto mb-4" />
          <p className="text-xl font-semibold text-destructive mb-2">데이터 로드 실패</p>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button
            onClick={() => {
              cachedAllPersonas = null; // 캐시 초기화
              setIsLoading(true);
              setError(null);
              window.location.reload(); // 페이지 새로고침
            }}
            variant="outline"
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-primary/70 mb-4" />
        <p className="text-muted-foreground">페르소나 데이터 로드 중...</p>
      </div>
    )
  }

  if (filteredPersonas.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="text-center max-w-lg mx-auto">
          <p className="text-xl font-semibold mb-2">검색 결과가 없습니다</p>
          <p className="text-muted-foreground mb-2">다른 검색어나 필터를 사용해 보세요.</p>
          <Button 
            variant="secondary" 
            onClick={() => window.location.href = '/'}
            className="mt-4"
          >
            모든 페르소나 보기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4 py-4 pb-20"
        key={selectedKeywords.join(',')} // 선택된 키워드 변경 시만 애니메이션 재생
      >
        {filteredPersonas.map((persona) => (
          <motion.div key={persona.id} variants={item} className="h-full">
            <PersonaCard
              id={persona.id}
              name={persona.name}
              image={persona.image}
              keywords={persona.keywords}
              insight={persona.insight}
              summary={persona.summary}
              painPoint={persona.painPoint}
              hiddenNeeds={persona.hiddenNeeds}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Floating Action Button - 우측 하단에 고정 배치 */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsAddInterviewModalOpen(true)}
              className="fixed bottom-8 right-8 rounded-full shadow-lg px-6 z-50"
            >
              <Plus className="h-5 w-5 mr-2" />
              고객 인터뷰 추가
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>새 고객 인터뷰 데이터 추가</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AddInterviewModal 
        open={isAddInterviewModalOpen}
        onOpenChange={setIsAddInterviewModalOpen}
      />
    </>
  )
}
