"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import PersonaCard from "./persona-card"
import { PersonaCardProps } from "@/types/components"
import { useInView } from "react-intersection-observer"
import { PersonaCardData } from "@/lib/data/persona-data"
import { getPersonaTypeInfo } from "@/lib/utils/persona"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertOctagon, RefreshCw, SearchX } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/hooks/use-auth"
import { usePersonas } from '@/hooks/use-personas'
import SkeletonCardGrid from "@/components/shared/skeleton-card-grid"

// 전역 캐시 제거 - React 상태로만 관리하여 프로젝트 전환 시 자동 새로고침

export default function PersonaCardGrid() {
  const { profile, loading: authLoading } = useAuth() // 사용자 프로필에서 company_id 가져오기
  const [filteredPersonas, setFilteredPersonas] = useState<PersonaCardData[]>([])
  const searchParams = useSearchParams()

  // 새로운 usePersonas 훅 사용 - company_id가 있을 때만 실행
  const { 
    data: rawPersonas = [], 
    isLoading, 
    error,
    refetch 
  } = usePersonas({
    companyId: profile?.company_id
  }, {
    enabled: !!profile?.company_id && !authLoading // 인증 로딩이 완료되고 company_id가 있을 때만 실행
  })

  // PersonaData를 PersonaCardData로 변환
  const allPersonas: PersonaCardData[] = useMemo(() => {
    return rawPersonas.map((persona) => {
      const typeInfo = getPersonaTypeInfo(persona.persona_type)
      
      return {
        id: persona.id,
        name: persona.persona_title,
        image: persona.thumbnail || `/placeholder.svg?height=300&width=400&text=${encodeURIComponent(persona.persona_title)}`,
        keywords: [], // 키워드는 비워둠
        insight: persona.insight,
        summary: persona.persona_description,
        painPoint: persona.painpoints,
        hiddenNeeds: persona.needs,
        persona_character: persona.persona_style,
        persona_type: persona.persona_type,
        persona_description: persona.persona_description,
        interview_count: persona.interview_count || 0,
        // Chat API에서 필요한 추가 필드들
        persona_title: persona.persona_title,
        persona_summary: persona.persona_summary,
        persona_style: persona.persona_style,
        painpoints: persona.painpoints,
        needs: persona.needs,
        insight_quote: persona.insight_quote
      }
    }).sort((a, b) => {
      // 1순위: interview_count 내림차순 (할당된 인터뷰가 많은 것부터)
      if (a.interview_count !== b.interview_count) {
        return (b.interview_count || 0) - (a.interview_count || 0)
      }
      // 2순위: persona_type 오름차순 (P1, P2, P3...)
      return a.persona_type.localeCompare(b.persona_type)
    })
  }, [rawPersonas])


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


  // React Query가 데이터 로딩을 담당하므로 useEffect 제거

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



  // 인증 로딩 중일 때
  if (authLoading) {
    return <SkeletonCardGrid />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="bg-destructive/10 p-6 rounded-xl text-center max-w-md mx-auto mb-6">
          <AlertOctagon className="h-10 w-10 text-destructive mx-auto mb-4" />
          <p className="text-xl font-semibold text-destructive mb-2">데이터 로드 실패</p>
          <p className="text-muted-foreground mb-6">{error instanceof Error ? error.message : '데이터를 불러오는 중 오류가 발생했습니다.'}</p>
          <Button
            onClick={() => refetch()}
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
    return <SkeletonCardGrid />
  }

  if (filteredPersonas.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="text-center max-w-lg mx-auto">
          {allPersonas.length === 0 ? (
            <>
              <SearchX className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-xl font-semibold mb-2">아직 생성된 페르소나가 없습니다</p>
              <p className="text-muted-foreground mb-6">프로젝트에서 인터뷰를 추가해 첫 번째 페르소나를 만들어보세요!</p>
            </>
          ) : (
            <>
              <SearchX className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-xl font-semibold mb-2">검색 결과가 없습니다</p>
              <p className="text-muted-foreground mb-2">다른 검색어나 필터를 사용해 보세요.</p>
              <Button 
                variant="secondary" 
                onClick={() => window.location.href = '/'}
                className="mt-4"
              >
                모든 페르소나 보기
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4 py-4"
      key={`${profile?.company_id}-${selectedKeywords.join(',')}`} // 회사 ID와 선택된 키워드 변경 시 애니메이션 재생
    >
      {filteredPersonas.map((persona) => (
        <motion.div key={persona.id} variants={item} className="h-[220px]">
          <PersonaCard
            id={persona.id}
            name={persona.name}
            image={persona.image}
            keywords={persona.keywords}
            insight={persona.insight}
            summary={persona.summary}
            painPoint={persona.painPoint}
            hiddenNeeds={persona.hiddenNeeds}
            persona_character={persona.persona_character}
            persona_type={persona.persona_type}
            persona_description={persona.persona_description}
            interview_count={persona.interview_count}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}
