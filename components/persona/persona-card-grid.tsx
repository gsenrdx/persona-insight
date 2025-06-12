"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import PersonaCard, { PersonaCardProps } from "./persona-card"
import { useInView } from "react-intersection-observer"
import { fetchPersonas, PersonaCardData } from "@/lib/persona-data"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertOctagon, RefreshCw, SearchX } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { AddInterviewModal, WorkflowProgressModal } from "@/components/modal"
import { useWorkflowQueue, WorkflowStatus, WorkflowJob } from "@/hooks/use-workflow-queue"
import { useAuth } from "@/hooks/use-auth"
import { useQuery } from '@tanstack/react-query'
import FloatingActionButton from "./floating-action-button"

// 전역 캐시 제거 - React 상태로만 관리하여 프로젝트 전환 시 자동 새로고침

export default function PersonaCardGrid() {
  const { profile } = useAuth() // 사용자 프로필에서 company_id 가져오기
  const [filteredPersonas, setFilteredPersonas] = useState<PersonaCardData[]>([])
  const [isAddInterviewModalOpen, setIsAddInterviewModalOpen] = useState(false)
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)
  const searchParams = useSearchParams()

  // React Query로 페르소나 데이터 관리
  const { 
    data: allPersonas = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['personas', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return []
      
      console.log('페르소나 데이터 로드 중 - 회사 단위:', profile?.company?.name, 'ID:', profile?.company_id);
      
      // 회사 단위로 모든 페르소나 로드 (프로젝트 필터링 없음)
      const data = await fetchPersonas(profile?.company_id)
      
      console.log('페르소나 데이터 로드 완료:', data.length, '개');
      return data
    },
    enabled: !!profile?.company_id,
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
    gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
  })

  // 워크플로우 큐 관리
  const {
    jobs,
    activeJobs,
    completedJobs,
    failedJobs,
    isProcessing,
    addJobs,
    removeJob,
    clearCompleted,
    clearAll,
    retryJob,
    startPersonaSynthesis
  } = useWorkflowQueue();

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

  // Handle job click - 통합된 모달에서 처리됨
  const handleJobClick = (job: WorkflowJob) => {
    // 통합된 모달에서 내부적으로 처리
  };

  // Handle button click - useCallback으로 메모이제이션
  const handleButtonClick = useCallback(() => {
    if (isProcessing) {
      setIsProgressModalOpen(true);
    } else {
      if (jobs.length > 0) {
        setIsProgressModalOpen(true);
      } else {
        setIsAddInterviewModalOpen(true);
      }
    }
  }, [isProcessing, jobs.length]);

  // Handle add more action - useCallback으로 메모이제이션
  const handleAddMore = useCallback(() => {
    setIsProgressModalOpen(false);
    setIsAddInterviewModalOpen(true);
  }, []);

  // 전체 진행률 계산 (활성 작업들의 평균) - 메모이제이션 개선
  const overallProgress = useMemo(() => {
    if (activeJobs.length === 0) return 0;
    const totalProgress = activeJobs.reduce((sum, job) => sum + job.progress, 0);
    return Math.round(totalProgress / activeJobs.length);
  }, [activeJobs.length, activeJobs.map(job => job.progress).join(',')]);

  // FloatingActionButton 메모이제이션을 위한 props 계산
  const buttonProps = useMemo(() => ({
    isProcessing,
    activeJobsLength: activeJobs.length,
    jobsLength: jobs.length,
    completedJobsLength: completedJobs.length,
    failedJobsLength: failedJobs.length,
    overallProgress,
    onButtonClick: handleButtonClick
  }), [
    isProcessing, 
    activeJobs.length, 
    jobs.length, 
    completedJobs.length, 
    failedJobs.length, 
    overallProgress,
    handleButtonClick
  ]);

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



  if (error) {
    return (
      <>
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
        <FloatingActionButton {...buttonProps} />
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary/70 mb-4" />
          <p className="text-muted-foreground">페르소나 데이터 로드 중...</p>
        </div>
        <FloatingActionButton {...buttonProps} />
      </>
    )
  }

  if (filteredPersonas.length === 0 && !isLoading) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <div className="text-center max-w-lg mx-auto">
            {allPersonas.length === 0 ? (
              <>
                <SearchX className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-xl font-semibold mb-2">아직 생성된 페르소나가 없습니다</p>
                <p className="text-muted-foreground mb-6">첫 번째 페르소나를 만들어보세요!</p>
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
        <FloatingActionButton {...buttonProps} />

        {/* Modals */}
        <WorkflowProgressModal
          open={isProgressModalOpen}
          onOpenChange={setIsProgressModalOpen}
          jobs={jobs}
          onRetryJob={retryJob}
          onRemoveJob={removeJob}
          onClearCompleted={clearCompleted}
          onClearAll={clearAll}
          onAddMore={handleAddMore}
          onJobClick={handleJobClick}
          onStartPersonaSynthesis={startPersonaSynthesis}
        />

        <AddInterviewModal 
          open={isAddInterviewModalOpen}
          onOpenChange={setIsAddInterviewModalOpen}
          onFilesSubmit={(files, criteria, projectId) => {
            // projectId는 모달 로직에 의해 보장됩니다.
            addJobs(files, projectId!, criteria);
            if (files.length > 0) {
              setIsProgressModalOpen(true);
            }
          }}
        />
      </>
    )
  }

  return (
    <>
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4 py-4 pb-24"
        key={`${profile?.company_id}-${selectedKeywords.join(',')}`} // 회사 ID와 선택된 키워드 변경 시 애니메이션 재생
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
              persona_character={persona.persona_character}
              persona_type={persona.persona_type}
              persona_description={persona.persona_description}
            />
          </motion.div>
        ))}
      </motion.div>

      <FloatingActionButton {...buttonProps} />

      {/* Modals */}
      <WorkflowProgressModal
        open={isProgressModalOpen}
        onOpenChange={setIsProgressModalOpen}
        jobs={jobs}
        onRetryJob={retryJob}
        onRemoveJob={removeJob}
        onClearCompleted={clearCompleted}
        onClearAll={clearAll}
        onAddMore={handleAddMore}
        onJobClick={handleJobClick}
        onStartPersonaSynthesis={startPersonaSynthesis}
      />

      <AddInterviewModal 
        open={isAddInterviewModalOpen}
        onOpenChange={setIsAddInterviewModalOpen}
        onFilesSubmit={(files, criteria, projectId) => {
          // projectId는 모달 로직에 의해 보장됩니다.
          addJobs(files, projectId!, criteria);
          if (files.length > 0) {
            setIsProgressModalOpen(true);
          }
        }}
      />
    </>
  )
}
