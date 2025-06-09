"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import PersonaCard, { PersonaCardProps } from "./persona-card"
import { useInView } from "react-intersection-observer"
import { fetchPersonas, PersonaCardData } from "@/lib/persona-data"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertOctagon, RefreshCw, SearchX, Plus, Clock, Play } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { AddInterviewModal, WorkflowProgressModal } from "@/components/modal"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useWorkflowQueue, WorkflowStatus, WorkflowJob } from "@/hooks/use-workflow-queue"
import { useAuth } from "@/hooks/use-auth"

// 전역 변수로 한 번 로드한 데이터 캐싱
let cachedAllPersonas: PersonaCardData[] | null = null;
let cachedCompanyId: string | null = null;

export default function PersonaCardGrid() {
  const { profile } = useAuth() // 사용자 프로필에서 company_id 가져오기
  const [allPersonas, setAllPersonas] = useState<PersonaCardData[]>(cachedAllPersonas || [])
  const [filteredPersonas, setFilteredPersonas] = useState<PersonaCardData[]>([])
  const [isLoading, setIsLoading] = useState(true) // 초기에는 로딩 상태
  const [error, setError] = useState<string | null>(null)
  const [isAddInterviewModalOpen, setIsAddInterviewModalOpen] = useState(false)
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)
  const searchParams = useSearchParams()
  
  // Button ref for positioning
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    retryJob
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

  // Handle button click
  const handleButtonClick = () => {
    if (isProcessing) {
      setIsProgressModalOpen(true);
    } else {
      if (jobs.length > 0) {
        setIsProgressModalOpen(true);
      } else {
        setIsAddInterviewModalOpen(true);
      }
    }
  };

  // Handle add more action
  const handleAddMore = () => {
    setIsProgressModalOpen(false);
    setIsAddInterviewModalOpen(true);
  };

  // 전체 진행률 계산 (활성 작업들의 평균)
  const overallProgress = useMemo(() => {
    if (activeJobs.length === 0) return 0;
    const totalProgress = activeJobs.reduce((sum, job) => sum + job.progress, 0);
    return totalProgress / activeJobs.length;
  }, [activeJobs]);

  // 최초 한 번만 모든 데이터 로드
  useEffect(() => {
    // 프로필이 아직 로드되지 않았으면 대기
    if (!profile?.company_id) {
      setIsLoading(true);
      return;
    }

    // 이미 캐시된 데이터가 있고 같은 회사의 데이터인 경우 사용
    if (cachedAllPersonas && cachedCompanyId === profile.company_id) {
      setAllPersonas(cachedAllPersonas);
      setIsLoading(false);
      return;
    }

    async function loadAllPersonas() {
      try {
        setIsLoading(true)
        setError(null)
        // 모든 페이지 데이터를 한번에 로드 (회사별)
        const data = await fetchPersonas(profile?.company_id || undefined)
        cachedAllPersonas = data; // 전역 캐시에 저장
        cachedCompanyId = profile?.company_id || null; // 회사 ID 캐시
        setAllPersonas(data)
      } catch (error) {
        console.error("Failed to fetch personas:", error)
        setError("데이터를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    loadAllPersonas();
  }, [profile?.company_id]) // profile.company_id가 변경될 때만 실행

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

  // 플로팅 액션 버튼 컴포넌트
  const FloatingActionButton = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div
                  key="processing"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative overflow-hidden"
                >
                  <Button
                    ref={buttonRef}
                    onClick={handleButtonClick}
                    className="rounded-full shadow-lg px-5 py-2.5 h-[48px] bg-primary text-primary-foreground border-0 min-w-[140px] max-w-[220px] backdrop-blur-sm relative overflow-hidden"
                  >
                    {/* 프로그레스 배경 (물결 효과) */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20"
                      animate={{
                        x: ['-100%', '100%'],
                        opacity: [0.3, 0.8, 0.3]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{
                        width: `${Math.max(overallProgress, 10)}%`,
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 100%)'
                      }}
                    />
                    
                    {/* 진행률 바 */}
                    <motion.div
                      className="absolute left-0 top-0 h-full bg-white/20 transition-all duration-500 ease-out"
                      style={{ width: `${overallProgress}%` }}
                    />
                    
                    <div className="flex items-center gap-2.5 w-full relative z-10">
                      <div className="relative">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="h-4 w-4 flex-shrink-0" />
                        </motion.div>
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">처리중</span>
                        <Badge variant="secondary" className="bg-white/20 text-white border-0 px-2 py-0.5 text-xs">
                          {activeJobs.length}개
                        </Badge>
                      </div>
                    </div>
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    ref={buttonRef}
                    onClick={handleButtonClick}
                    className="rounded-full shadow-lg px-5 py-2.5 h-[48px] bg-primary hover:bg-primary/90 text-primary-foreground border-0 min-w-[140px] max-w-[220px] backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-2.5 w-full">
                      <Plus className="h-4 w-4 flex-shrink-0" />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">페르소나 추가하기</span>
                        {jobs.length > 0 && (
                          <Badge variant="secondary" className="bg-white/20 text-white border-0 px-2 py-0.5 text-xs">
                            {completedJobs.length + failedJobs.length}/{jobs.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-gray-900 text-white border-gray-700">
          <p className="text-sm">
            {isProcessing 
              ? `${activeJobs.length}개 파일 처리 중... 클릭하여 진행 상황 확인`
              : jobs.length > 0
              ? "진행 상황 확인 또는 새 페르소나 추가"
              : "새 고객 인터뷰로 페르소나 생성"
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (error) {
    return (
      <>
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
        <FloatingActionButton />
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
        <FloatingActionButton />
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
        <FloatingActionButton />

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
        />

        <AddInterviewModal 
          open={isAddInterviewModalOpen}
          onOpenChange={setIsAddInterviewModalOpen}
          onFilesSubmit={(files) => {
            addJobs(files);
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
              persona_character={persona.persona_character}
              persona_type={persona.persona_type}
              persona_description={persona.persona_description}
            />
          </motion.div>
        ))}
      </motion.div>

      <FloatingActionButton />

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
      />

      <AddInterviewModal 
        open={isAddInterviewModalOpen}
        onOpenChange={setIsAddInterviewModalOpen}
        onFilesSubmit={(files) => {
          addJobs(files);
          if (files.length > 0) {
            setIsProgressModalOpen(true);
          }
        }}
      />
    </>
  )
}
