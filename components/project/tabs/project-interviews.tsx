'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw, Loader2, Activity, AlertCircle, History } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { useInterviews } from '@/hooks/use-interviews'
import { useProjectMembers } from '@/hooks/use-projects'
import { useAssignPersonaDefinitionToInterview } from '@/hooks/use-interview-persona'
import { InterviewDataTableInfinite } from '@/components/interview/interview-data-table-infinite'
import InterviewDetail from '@/components/interview/interview-detail'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// 모달 동적 import
const AddInterviewModal = dynamic(() => import('@/components/modal').then(mod => {
  return { default: mod.AddInterviewModal }
}), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

const PersonaAssignmentModal = dynamic(() => import('@/components/modal/persona-assignment-modal').then(mod => ({ default: mod.PersonaAssignmentModal })), {
  ssr: false,
  loading: () => null
})

const HistoryModal = dynamic(() => import('@/components/project/trash-modal').then(mod => ({ default: mod.default })), {
  ssr: false,
  loading: () => null
})

interface Project {
  id: string
  name: string
  description: string | null
  company_id: string
  created_by: string | null
  visibility: 'public' | 'private'
  join_method: 'open' | 'invite_only' | 'password'
  created_at: string
}

interface ProjectInterviewsProps {
  project: Project
  selectedInterviewId?: string | null
  onSectionsChange?: (sections: any[] | null, activeSection: string | null, scrollToSection: ((sectionName: string) => void) | null) => void
  onInterviewSelect?: (title: string | null) => void
  onEditButtonInfo?: (canEdit: boolean, onClick: (() => void) | null) => void
  onDownloadMenuChange?: (downloadHandlers: { 
    handleDownloadOriginal: () => void
    handleDownloadCleaned: () => void
  }) => void
}

export default function ProjectInterviews({ 
  project, 
  selectedInterviewId, 
  onSectionsChange,
  onInterviewSelect,
  onEditButtonInfo,
  onDownloadMenuChange
}: ProjectInterviewsProps) {
  const { profile, session } = useAuth()
  const router = useRouter()
  const { data: members } = useProjectMembers(project.id)
  
  // Check if current user is admin
  const currentUserMember = members?.find(m => m.user_id === profile?.id)
  const isProjectAdmin = currentUserMember?.role === 'admin' || currentUserMember?.role === 'owner'
  
  // 낙관적 업데이트 기반 인터뷰 목록
  const { 
    interviews, 
    isLoading, 
    error,
    isFetching,
    processingCount,
    totalCount,
    createInterview,
    updateInterview, 
    deleteInterview,
    refetch,
    isCreating
  } = useInterviews({
    projectId: project.id,
    enabled: true
  })
  
  const [showAddInterviewModal, setShowAddInterviewModal] = useState(false)
  const [personaAssignmentModal, setPersonaAssignmentModal] = useState<{
    open: boolean
    interviewId: string
    currentPersonaDefinitionId?: string | null
    recommendedPersona?: string
  }>({ open: false, interviewId: '' })
  
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  
  // 수동 새로고침
  const handleManualRefresh = useCallback(() => {
    refetch()
    toast.success('인터뷰 목록을 새로고침했습니다')
  }, [refetch])
  
  // 인터뷰 재시도 처리
  const handleRetry = useCallback(async (interviewId: string) => {
    if (!session?.access_token) {
      toast.error('다시 로그인해주세요.')
      return
    }
    
    try {
      const response = await fetch('/api/workflow/retry', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ interviewId })
      })
      
      if (!response.ok) {
        throw new Error('재시도 실패')
      }
      
      toast.success('인터뷰 분석을 다시 시작했습니다.')
      
      // 상태를 processing으로 낙관적 업데이트
      updateInterview({ id: interviewId, updates: { status: 'processing' } })
    } catch (error) {
      toast.error('인터뷰 재시도에 실패했습니다.')
    }
  }, [session, updateInterview])

  // 인터뷰 생성 핸들러
  const handleCreateInterview = useCallback(async (content: string | File, _projectId?: string, title?: string, lastModified?: number) => {
    if (!title) {
      toast.error('제목을 입력해주세요')
      return
    }
    try {
      createInterview({ content, title, lastModified })
      setShowAddInterviewModal(false)
    } catch (error) {
      // 에러는 mutation에서 처리됨
    }
  }, [createInterview])

  // 페르소나 할당
  const assignPersonaMutation = useAssignPersonaDefinitionToInterview()
  
  const handlePersonaAssignment = useCallback(async (personaDefinitionId: string) => {
    const { interviewId } = personaAssignmentModal
    if (!interviewId) return
    
    try {
      await assignPersonaMutation.mutateAsync({
        interviewId,
        personaDefinitionId
      })
      setPersonaAssignmentModal({ open: false, interviewId: '' })
    } catch (error) {
      // Error handled by mutation onError
    }
  }, [assignPersonaMutation, personaAssignmentModal])

  // 상태 분석은 useInterviews 훅에서 제공됨
  
  // 선택된 인터뷰
  const selectedInterview = interviews.find(i => i.id === selectedInterviewId)
  
  // 선택된 인터뷰의 제목을 전달
  useEffect(() => {
    if (selectedInterview) {
      onInterviewSelect?.(selectedInterview.title || null)
    } else if (selectedInterviewId && !selectedInterview) {
      // 인터뷰를 찾을 수 없는 경우
      onInterviewSelect?.(null)
    }
    
    // 컴포넌트 언마운트 시 제목 초기화
    return () => {
      if (!selectedInterviewId) {
        onInterviewSelect?.(null)
      }
    }
  }, [selectedInterview, selectedInterviewId, onInterviewSelect])
  
  // 에러 상태 처리
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="w-12 h-12 text-gray-400" />
        <p className="text-gray-600">인터뷰 목록을 불러올 수 없습니다</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          다시 시도
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 헤더 - 인터뷰 상세에서는 숨김 */}
      {!selectedInterviewId && (
        <div className="mb-6">
          {/* 헤더 배경 카드 */}
          <div className="relative bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 rounded-2xl p-6 overflow-hidden">
            {/* 메인 콘텐츠 - 좌측 영역 */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-8">
                {/* 핀 캐릭터 - 좌측에 배치 */}
                <div className="w-24 h-24 flex-shrink-0">
                  <img 
                    src="/assets/pin/pin-interview-list.png" 
                    alt="Pin character with papers"
                    className="w-full h-full object-contain drop-shadow-lg"
                  />
                </div>
                
                {/* 텍스트 콘텐츠 */}
                <div>
                  <div className="flex items-baseline gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {!isLoading && totalCount > 0 ? (
                        <>
                          <span className="text-3xl text-blue-600">{totalCount}개</span>의 인터뷰가 있어요!
                        </>
                      ) : !isLoading && totalCount === 0 ? (
                        '아직 인터뷰가 없어요'
                      ) : (
                        '인터뷰 목록'
                      )}
                    </h2>
                  </div>
                  
                  {/* 상태 메시지 - 심플하게 */}
                  <p className="text-sm text-gray-600">
                    {processingCount > 0 ? (
                      <span className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
                        <span className="text-blue-600 font-medium">{processingCount}개</span>를 열심히 분석하고 있어요
                      </span>
                    ) : totalCount > 0 ? (
                      '고객의 소중한 이야기들이 모여있어요'
                    ) : (
                      '새로운 인터뷰를 추가해보세요'
                    )}
                  </p>
                </div>
              </div>
              
              {/* 우측 액션 버튼 - 헤더에 맞는 크기 */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => setShowHistoryModal(true)}
                  className="h-10 w-10 p-0 rounded-xl hover:bg-white/70 transition-all duration-200 border border-white/40 backdrop-blur-sm"
                  title="기록"
                >
                  <History className="w-5 h-5 text-gray-600" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="default"
                  onClick={handleManualRefresh}
                  disabled={isLoading || isFetching}
                  className="h-10 w-10 p-0 rounded-xl hover:bg-white/70 transition-all duration-200 border border-white/40 backdrop-blur-sm"
                  title="새로고침"
                >
                  <RefreshCw className={cn(
                    "w-5 h-5 text-gray-600",
                    (isLoading || isFetching) && "animate-spin text-blue-600"
                  )} />
                </Button>
                
                <Button
                  onClick={() => setShowAddInterviewModal(true)}
                  size="default"
                  disabled={isCreating}
                  className="bg-white/90 hover:bg-white text-gray-800 hover:text-gray-900 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200/60 backdrop-blur-sm px-4 py-2.5 h-10 rounded-xl font-medium"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-sm">추가 중...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      <span className="text-sm">인터뷰 추가</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* 장식용 배경 요소 - 브랜드 컴러로 통일 */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-200/25 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-200/25 rounded-full blur-2xl" />
          </div>
        </div>
      )}

      {/* 콘텐츠 영역 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {!selectedInterviewId ? (
          <div className="h-full overflow-hidden">
            {isLoading ? (
              <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30 rounded-2xl shadow-xl border border-white/20">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">인터뷰 목록을 불러오는 중...</p>
                </div>
              </div>
            ) : (
              <InterviewDataTableInfinite
                interviews={interviews}
                onView={(id) => {
                  router.push(`/projects/${project.id}?interview=${id}`, { scroll: false })
                }}
                isAdmin={isProjectAdmin}
                onDelete={(id) => deleteInterview(id)}
                onRetry={handleRetry}
                onAssignPersona={(interviewId) => {
                  const interview = interviews.find(i => i.id === interviewId)
                  if (interview) {
                    setPersonaAssignmentModal({
                      open: true,
                      interviewId: interview.id,
                      currentPersonaDefinitionId: interview.confirmed_persona_definition_id,
                      recommendedPersona: interview.ai_persona_match ?? undefined
                    })
                  }
                }}
                projectId={project.id}
                currentUserId={profile?.id}
              />
            )}
          </div>
        ) : !selectedInterview ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">인터뷰를 불러오는 중...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm h-full overflow-auto">
            <InterviewDetail
              interview={selectedInterview}
              onBack={() => {
                router.push(`/projects/${project.id}`, { scroll: false })
              }}
              onSectionsChange={onSectionsChange}
              onDownloadMenuChange={onDownloadMenuChange}
            />
          </div>
        )}
      </div>

      {/* 모달들 */}
      <AddInterviewModal
        open={showAddInterviewModal}
        onOpenChange={setShowAddInterviewModal}
        onFilesSubmit={handleCreateInterview}
        projectId={project.id}
      />
      
      <PersonaAssignmentModal
        open={personaAssignmentModal.open}
        onOpenChange={(open) => !open && setPersonaAssignmentModal({ open: false, interviewId: '' })}
        onAssign={handlePersonaAssignment}
        interviewId={personaAssignmentModal.interviewId}
        currentPersonaDefinitionId={personaAssignmentModal.currentPersonaDefinitionId}
        recommendedPersona={personaAssignmentModal.recommendedPersona}
      />
      
      <HistoryModal
        open={showHistoryModal}
        onOpenChange={setShowHistoryModal}
        projectId={project.id}
        onRestore={refetch}
      />
    </div>
  )
}