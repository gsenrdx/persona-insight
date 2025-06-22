'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { FileText, Trash2, Plus, User, Sparkles } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { IntervieweeData } from '@/types/interviewee'
import InterviewDetail from '@/components/project/tabs/interview-detail'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'

// 성능 최적화: 모달 컴포넌트들 동적 import (코드 스플리팅)
const PersonaSelectionModal = dynamic(() => import('@/components/modal/persona-selection-modal'), {
  ssr: false,
  loading: () => null
})

const PersonaClassificationModal = dynamic(() => import('@/components/modal').then(mod => ({ default: mod.PersonaClassificationModal })), {
  ssr: false,
  loading: () => null
})

const AddInterviewModal = dynamic(() => import('@/components/modal').then(mod => ({ default: mod.AddInterviewModal })), {
  ssr: false,
  loading: () => null
})

const WorkflowProgressModal = dynamic(() => import('@/components/modal').then(mod => ({ default: mod.WorkflowProgressModal })), {
  ssr: false,
  loading: () => null
})
import { useWorkflowQueue, WorkflowJob } from '@/hooks/use-workflow-queue'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

interface Project {
  id: string
  name: string
  description: string
  company_id: string
  created_by: string
  visibility: 'public' | 'private'
  join_method: 'open' | 'invite_only' | 'password'
  created_at: string
  member_count?: number
  interview_count?: number
  persona_count?: number
}

interface ProjectInterviewsProps {
  project: Project
  selectedInterviewId?: string | null
}

export default function ProjectInterviews({ project, selectedInterviewId }: ProjectInterviewsProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [interviews, setInterviews] = useState<IntervieweeData[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const limit = 20
  const [selectedInterview, setSelectedInterview] = useState<IntervieweeData | null>(null)
  const [personaSynthesizing, setPersonaSynthesizing] = useState<string[]>([])
  const [showPersonaModal, setShowPersonaModal] = useState(false)
  const [selectedInterviewForPersona, setSelectedInterviewForPersona] = useState<IntervieweeData | null>(null)
  const [showPersonaClassificationModal, setShowPersonaClassificationModal] = useState(false)
  const [showAddInterviewModal, setShowAddInterviewModal] = useState(false)
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

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
  } = useWorkflowQueue()

  useEffect(() => {
    let abortController = new AbortController()
    
    const loadInterviews = async () => {
      if (!profile?.company_id || !project?.id) return
      
      try {
        setLoading(true)
        setError(null)
        setOffset(0)
        setHasMore(true)
        
        // 캐시된 데이터 먼저 확인
        const cachedKey = queryKeys.interviews.byProject(project.id, { limit: 20 })
        const cachedData = queryClient.getQueryData(cachedKey)
        
        if (cachedData && Array.isArray(cachedData)) {
          setInterviews(cachedData.slice(0, limit))
          setHasMore(cachedData.length === 20)
          setOffset(Math.min(cachedData.length, limit))
          setLoading(false)
          return
        }
        
        const response = await fetch(
          `/api/interviews?company_id=${profile.company_id}&project_id=${project.id}&limit=${limit}&offset=0`,
          { signal: abortController.signal }
        )
        
        if (!response.ok) {
          throw new Error('데이터를 가져오는데 실패했습니다')
        }
        
        const { data, success, error } = await response.json()
        if (!success) {
          throw new Error(error || '데이터를 가져오는데 실패했습니다')
        }
        
        if (!abortController.signal.aborted) {
          setInterviews(data || [])
          setHasMore((data || []).length === limit)
          setOffset((data || []).length)
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message)
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false)
        }
      }
    }
    
    loadInterviews()
    
    return () => {
      abortController.abort()
    }
  }, [profile?.company_id, project?.id, limit, queryClient])

  // 무한 스크롤 처리
  useEffect(() => {
    let scrollAbortController: AbortController | null = null
    
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000 // 하단 1000px 전에 로드
      ) {
        if (hasMore && !loading && !loadingMore) {
          if (scrollAbortController) {
            scrollAbortController.abort()
          }
          scrollAbortController = new AbortController()
          fetchInterviews(true, scrollAbortController.signal)
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollAbortController) {
        scrollAbortController.abort()
      }
    }
  }, [hasMore, loading, loadingMore, offset])

  // Persona criteria는 필요할 때만 로드 (현재는 사용하지 않음)

  // 워크플로우 완료 시 인터뷰 목록 새로고침
  useEffect(() => {
    let refreshAbortController: AbortController | null = null
    
    if (completedJobs.length > 0) {
      refreshAbortController = new AbortController()
      fetchInterviews(false, refreshAbortController.signal)
    }
    
    return () => {
      if (refreshAbortController) {
        refreshAbortController.abort()
      }
    }
  }, [completedJobs.length])

  // URL 쿼리스트링에서 인터뷰 ID 확인하여 상세보기 설정
  useEffect(() => {
    if (selectedInterviewId && interviews.length > 0) {
      const interview = interviews.find(i => i.id === selectedInterviewId)
      if (interview) {
        setSelectedInterview(interview)
      }
    } else if (!selectedInterviewId) {
      setSelectedInterview(null)
    }
  }, [selectedInterviewId, interviews])

  const fetchInterviews = async (loadMore = false, signal?: AbortSignal) => {
    try {
      if (loadMore) {
        setLoadingMore(true)
      }
      
      if (!profile?.company_id || !project?.id) {
        setError('회사 또는 프로젝트 정보를 찾을 수 없습니다')
        return
      }

      const currentOffset = loadMore ? offset : 0
      
      // 캐시된 데이터 먼저 확인
      const cachedKey = queryKeys.interviews.byProject(project.id, { limit, offset: currentOffset })
      const cachedData = queryClient.getQueryData(cachedKey)
      
      if (cachedData && !loadMore) {
        setInterviews(cachedData as IntervieweeData[])
        setHasMore((cachedData as IntervieweeData[]).length === limit)
        setOffset((cachedData as IntervieweeData[]).length)
        return
      }
      
      const response = await fetch(
        `/api/interviews?company_id=${profile.company_id}&project_id=${project.id}&limit=${limit}&offset=${currentOffset}`,
        { signal }
      )
      
      if (!response.ok) {
        throw new Error('데이터를 가져오는데 실패했습니다')
      }
      
      const { data, success, error } = await response.json()
      if (!success) {
        throw new Error(error || '데이터를 가져오는데 실패했습니다')
      }
      
      if (signal?.aborted) return
      
      const newInterviews = data || []
      
      if (loadMore) {
        setInterviews(prev => [...prev, ...newInterviews])
      } else {
        setInterviews(newInterviews)
      }
      
      // 더 가져올 데이터가 있는지 확인
      setHasMore(newInterviews.length === limit)
      setOffset(currentOffset + newInterviews.length)
      
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingMore(false)
      }
    }
  }



  const getTypeIcon = (userType: string) => {
    // 실제 user_type 필드는 문자열이므로 아이콘을 매핑
    return <FileText className="w-5 h-5 text-gray-600" />
  }


  const handleAddInterview = () => {
    if (isProcessing) {
      setIsProgressModalOpen(true);
    } else {
      if (jobs.length > 0) {
        setIsProgressModalOpen(true);
      } else {
        setShowAddInterviewModal(true);
      }
    }
  }

  const handleAddInterviewComplete = () => {
    setShowAddInterviewModal(false)
    // 인터뷰 목록 새로고침
    fetchInterviews()
  }

  const handleAddMore = () => {
    setIsProgressModalOpen(false);
    setShowAddInterviewModal(true);
  }

  const handleJobClick = (job: WorkflowJob) => {
    // 통합된 모달에서 내부적으로 처리
  }

  const handleViewDetail = (interview: IntervieweeData) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('interview', interview.id)
    router.push(`?${params.toString()}`)
  }

  const handleBackToList = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('interview')
    router.push(`?${params.toString()}`)
  }

  const handleDeleteInterview = async (interviewId: string) => {
    try {
      const response = await fetch(`/api/interviews/${interviewId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '인터뷰 삭제에 실패했습니다')
      }

      const { success, error } = await response.json()
      if (!success) {
        throw new Error(error || '인터뷰 삭제에 실패했습니다')
      }

      // 목록에서 삭제된 항목 제거
      setInterviews(prev => prev.filter(item => item.id !== interviewId))
      
      // 현재 보고 있는 인터뷰가 삭제된 경우 목록으로 돌아가기
      if (selectedInterview?.id === interviewId) {
        handleBackToList()
      }
      
      toast.success('인터뷰가 삭제되었습니다')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다')
    }
  }

  const handleOpenPersonaModal = (interview: IntervieweeData) => {
    setSelectedInterviewForPersona(interview)
    setShowPersonaModal(true)
  }

  const handleClosePersonaModal = () => {
    setShowPersonaModal(false)
    setSelectedInterviewForPersona(null)
  }

  const handleConfirmPersona = async (selectedPersonaId: string) => {
    if (!selectedInterviewForPersona) return
    
    try {
      setPersonaSynthesizing(prev => [...prev, selectedInterviewForPersona.id])

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('인증 정보를 찾을 수 없습니다. 다시 로그인해주세요.')
      }

      // 먼저 인터뷰의 persona_id 업데이트
      if (selectedPersonaId !== selectedInterviewForPersona.persona_id) {
        const { error: updateError } = await supabase
          .from('interviewees')
          .update({ persona_id: selectedPersonaId })
          .eq('id', selectedInterviewForPersona.id)

        if (updateError) {
          throw new Error('인터뷰 페르소나 배정 업데이트에 실패했습니다')
        }
      }

      const selectedInterviewee = typeof selectedInterviewForPersona === 'string' 
        ? selectedInterviewForPersona 
        : JSON.stringify(selectedInterviewForPersona)

      const response = await fetch('/api/personas/synthesis', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selectedInterviewee,
          personaType: selectedInterviewForPersona.personas?.persona_type || selectedInterviewForPersona.user_type,
          personaId: selectedPersonaId,
          projectId: project?.id
        })
      })

      if (!response.ok) {
        let errorMessage = '페르소나 반영 중 오류가 발생했습니다'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          const errorText = await response.text()
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      // 인터뷰 목록 새로고침
      await fetchInterviews()
      
      // 모달 닫기
      handleClosePersonaModal()
      
      toast.success('페르소나 반영이 완료되었습니다')
    } catch (error: any) {
      toast.error(error.message || '페르소나 반영 중 오류가 발생했습니다')
    } finally {
      setPersonaSynthesizing(prev => prev.filter(id => id !== selectedInterviewForPersona.id))
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">인터뷰 관리</h1>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>
        </div>
        
        {/* 인터뷰 헤더 카드 스켈레톤 */}
        <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-9 w-40" />
          </div>
        </div>
        
        {/* 인터뷰 그리드 스켈레톤 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }, (_, i) => (
            <div 
              key={i} 
              className="bg-white border border-gray-200 rounded-2xl p-4"
            >
              <div className="space-y-3">
                {/* 제목과 상태 */}
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                
                {/* 메타정보 */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
                
                {/* 요약 텍스트 */}
                <div className="p-2.5 bg-gray-50/70 rounded-lg">
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                </div>
                
                {/* 액션 버튼 */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 flex-1 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">인터뷰 관리</h1>
        </div>
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{error}</p>
          <Button variant="outline" onClick={() => fetchInterviews()}>다시 시도</Button>
        </div>
      </div>
    )
  }

  // 인터뷰 상세보기 모드일 때는 상세 컴포넌트 렌더링
  if (selectedInterview) {
    return (
      <InterviewDetail
        interview={selectedInterview}
        onBack={handleBackToList}
        onDelete={handleDeleteInterview}
      />
    )
  }

  // 인터뷰 리스트 모드
  return (
    <div className="space-y-6 relative">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">인터뷰 관리</h1>
      </div>

      {/* 인터뷰 목록 */}
      {interviews.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">인터뷰가 없습니다</h3>
          <p className="text-gray-500 mb-6">첫 번째 인터뷰를 추가해보세요</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between py-4 px-6 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="flex flex-col">
              <span className="text-base font-semibold text-gray-900">인터뷰 목록</span>
              <span className="text-sm text-gray-500">{interviews.length}개의 인터뷰</span>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                className="bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
                onClick={() => setShowPersonaClassificationModal(true)}
              >
                <User className="w-4 h-4 mr-2" />
                페르소나 분류 현황
              </Button>
            </div>
          </div>

          {/* 인터뷰 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="bg-white border border-gray-200 rounded-2xl hover:border-gray-300 hover:scale-[1.01] transition-all duration-300 cursor-pointer group overflow-hidden relative"
                onClick={() => handleViewDetail(interview)}
              >
                
                <div className="p-4">
                  {/* 제목과 상태 */}
                  <div className="flex items-start justify-between mb-2 gap-3">
                    <h3 className="font-semibold text-base text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors duration-300 flex-1">
                      {interview.interviewee_fake_name || `인터뷰 ${interview.user_type}`}
                    </h3>
                    
                    {/* 분석 상태 */}
                    <div className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                      interview.persona_reflected 
                        ? 'bg-green-100 text-green-700'
                        : interview.interviewee_summary 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {interview.persona_reflected 
                        ? '반영완료'
                        : interview.interviewee_summary 
                        ? '분석완료' 
                        : '대기중'
                      }
                    </div>
                  </div>
                  
                  {/* 메타정보 */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <span className="font-medium">
                      {interview.created_by === profile?.id 
                        ? profile?.name || '나'
                        : interview.created_by_profile?.name || '팀원'
                      }
                    </span>
                    <span>|</span>
                    <span>
                      {new Date(interview.created_at || '').toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  {/* 요약 */}
                  {interview.interviewee_summary && (
                    <div className="mb-3 p-2.5 bg-gray-50/70 rounded-lg border-0">
                      <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                        {interview.interviewee_summary}
                      </p>
                    </div>
                  )}
                  
                  {/* 액션 영역 */}
                  {interview.persona_reflected ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 py-2">
                        <div className="text-xs font-medium text-gray-700 flex items-center">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0" />
                          Type {interview.personas?.persona_type || interview.user_type}. {interview.personas?.persona_title || interview.personas?.persona_type}
                        </div>
                      </div>
                      
                      {/* 삭제 버튼 (본인 것만) */}
                      {interview.created_by === profile?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-9 w-8 p-0 hover:bg-gray-100 rounded-lg flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-col gap-0.5">
                                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                              </div>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-0 shadow-lg">
                            <DropdownMenuItem 
                              className="text-red-600 hover:bg-red-50 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteInterview(interview.id)
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ) : interview.interviewee_summary ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 h-9 text-xs font-medium bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 hover:border-purple-300 text-purple-700 rounded-xl transition-all duration-300 hover:shadow-sm flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenPersonaModal(interview)
                        }}
                        disabled={personaSynthesizing.includes(interview.id)}
                      >
                        {personaSynthesizing.includes(interview.id) ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mr-2" />
                            반영 중...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 mr-2" />
                            페르소나 반영하기
                          </>
                        )}
                      </Button>
                      
                      {/* 삭제 버튼 (본인 것만) */}
                      {interview.created_by === profile?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-9 w-8 p-0 hover:bg-gray-100 rounded-lg flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-col gap-0.5">
                                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                              </div>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-0 shadow-lg">
                            <DropdownMenuItem 
                              className="text-red-600 hover:bg-red-50 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteInterview(interview.id)
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ) : (
                    /* 분석 대기 상태일 때도 삭제 버튼 표시 (본인 것만) */
                    interview.created_by === profile?.id && (
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-col gap-0.5">
                                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                              </div>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-0 shadow-lg">
                            <DropdownMenuItem 
                              className="text-red-600 hover:bg-red-50 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteInterview(interview.id)
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* 로딩 더 표시 */}
          {loadingMore && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
          
          {/* 더 이상 데이터가 없을 때 */}
          {!hasMore && interviews.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              모든 인터뷰를 불러왔습니다
            </div>
          )}
        </div>
      )}

      {/* 플로팅 액션 버튼 */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="fixed bottom-8 right-8 z-50"
            >
              <Button
                onClick={handleAddInterview}
                className="rounded-full shadow-lg px-5 py-2.5 h-[48px] bg-primary hover:bg-primary/90 text-primary-foreground border-0 min-w-[140px] max-w-[220px] backdrop-blur-sm"
              >
                <div className="flex items-center gap-2.5 w-full">
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">인터뷰 추가하기</span>
                </div>
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-gray-900 text-white border-gray-700">
            <p className="text-sm">새 고객 인터뷰 추가</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* 페르소나 선택 모달 */}
      <PersonaSelectionModal
        isOpen={showPersonaModal}
        onClose={handleClosePersonaModal}
        onConfirm={handleConfirmPersona}
        recommendedPersonaId={selectedInterviewForPersona?.persona_id}
        isLoading={selectedInterviewForPersona ? personaSynthesizing.includes(selectedInterviewForPersona.id) : false}
      />

      {/* 페르소나 분류 현황 모달 */}
      <PersonaClassificationModal
        isOpen={showPersonaClassificationModal}
        onClose={() => setShowPersonaClassificationModal(false)}
        interviews={interviews}
      />

      {/* 워크플로우 진행상황 모달 */}
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

      {/* 인터뷰 추가 모달 */}
      <AddInterviewModal
        open={showAddInterviewModal}
        onOpenChange={setShowAddInterviewModal}
        onClose={() => setShowAddInterviewModal(false)}
        onComplete={handleAddInterviewComplete}
        onFilesSubmit={(files, criteria, projectId) => {
          // 현재 프로젝트 ID로 설정
          const targetProjectId = project?.id || projectId;
          addJobs(files, targetProjectId!, criteria);
          if (files.length > 0) {
            setIsProgressModalOpen(true);
          }
        }}
        projectId={project?.id}
      />
    </div>
  )
} 