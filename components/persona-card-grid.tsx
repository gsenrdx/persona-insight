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
import AddInterviewModal from "./add-interview-modal"
import WorkflowProgressSpeedDial from "./workflow-progress-modal"
import JobDetailModal from "./job-detail-modal"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useWorkflowQueue, WorkflowStatus, WorkflowJob } from "@/hooks/use-workflow-queue"

// 전역 변수로 한 번 로드한 데이터 캐싱
let cachedAllPersonas: PersonaCardData[] | null = null;

export default function PersonaCardGrid() {
  const [allPersonas, setAllPersonas] = useState<PersonaCardData[]>(cachedAllPersonas || [])
  const [filteredPersonas, setFilteredPersonas] = useState<PersonaCardData[]>([])
  const [isLoading, setIsLoading] = useState(cachedAllPersonas === null)
  const [error, setError] = useState<string | null>(null)
  const [isAddInterviewModalOpen, setIsAddInterviewModalOpen] = useState(false)
  const [isProgressDropdownOpen, setIsProgressDropdownOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<WorkflowJob | null>(null)
  const [isJobDetailModalOpen, setIsJobDetailModalOpen] = useState(false)
  const searchParams = useSearchParams()
  
  // Button ref for positioning the dropdown
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

  // Handle job click to show detail modal
  const handleJobClick = (job: WorkflowJob) => {
    setSelectedJob(job);
    setIsJobDetailModalOpen(true);
    setIsProgressDropdownOpen(false);
  };

  // Handle button click
  const handleButtonClick = () => {
    if (isProcessing) {
      setIsProgressDropdownOpen(!isProgressDropdownOpen);
    } else {
      if (jobs.length > 0) {
        // If there are jobs but not processing, show dropdown first
        setIsProgressDropdownOpen(!isProgressDropdownOpen);
      } else {
        // If no jobs, directly open add interview modal
        setIsAddInterviewModalOpen(true);
      }
    }
  };

  // Handle add more action
  const handleAddMore = () => {
    setIsProgressDropdownOpen(false);
    setIsAddInterviewModalOpen(true);
  };

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
        const data = await fetchPersonas()
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
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4 py-4 ${
          isProgressDropdownOpen 
            ? 'pb-[320px]' // Speed Dial이 열려있을 때: 메인 버튼(48px) + 간격(24px) + Speed Dial 항목들(약 240px) + 여유분(8px)
            : 'pb-24' // 기본: 메인 버튼(48px) + 간격(48px)
        }`}
        key={selectedKeywords.join(',')} // 선택된 키워드 변경 시만 애니메이션 재생
        style={{
          transition: 'padding-bottom 0.3s ease-in-out'
        }}
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

      {/* Floating Action Button - 우측 하단에 고정 배치 */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div className="fixed bottom-8 right-8 z-50">
              <AnimatePresence mode="wait">
                {isProcessing ? (
                  <motion.div
                    key="processing"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      ref={buttonRef}
                      onClick={handleButtonClick}
                      className="rounded-full shadow-lg px-5 py-2.5 h-[48px] bg-blue-600 hover:bg-blue-700 text-white border-0 min-w-[140px] max-w-[220px] backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-2.5 w-full">
                        <div className="relative">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ 
                              duration: 1.5, 
                              repeat: Infinity, 
                              ease: "linear"
                            }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                          />
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">진행중</span>
                          <Badge variant="secondary" className="bg-white/20 text-white border-0 px-2 py-0.5 text-xs">
                            {activeJobs.length}
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

      {/* Speed Dial Menu */}
      <WorkflowProgressSpeedDial
        open={isProgressDropdownOpen}
        onOpenChange={setIsProgressDropdownOpen}
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
            setIsProgressDropdownOpen(true);
          }
        }}
      />

      <JobDetailModal
        job={selectedJob}
        open={isJobDetailModalOpen}
        onOpenChange={setIsJobDetailModalOpen}
        onRetryJob={retryJob}
        onRemoveJob={removeJob}
      />
    </>
  )
}
