'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw, Loader2, Activity, AlertCircle } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { useInterviews } from '@/hooks/use-interviews'
import { useProjectMembers } from '@/hooks/use-projects'
import { useAssignPersonaDefinitionToInterview } from '@/hooks/use-interview-persona'
import { Interview } from '@/types/interview'
import { InterviewDataTableInfinite } from '@/components/interview/interview-data-table-infinite'
import InterviewDetail from '@/components/interview/interview-detail'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeVariants } from '@/components/ui/page-transition'

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
}

export default function ProjectInterviews({ 
  project, 
  selectedInterviewId, 
  onSectionsChange 
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
    completedCount,
    failedCount,
    totalCount,
    createInterview,
    updateInterview, 
    deleteInterview,
    refetch,
    isCreating,
    isUpdating,
    isDeleting,
    hasProcessing,
    hasFailed,
    isEmpty
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
      updateInterview(interviewId, { workflow_status: 'processing' })
    } catch (error) {
      toast.error('인터뷰 재시도에 실패했습니다.')
    }
  }, [session, updateInterview])

  // 인터뷰 생성 핸들러
  const handleCreateInterview = useCallback(async (content: File | string, projectId: string, title: string, lastModified?: number) => {
    try {
      await createInterview({ content, title, lastModified })
      setShowAddInterviewModal(false)
    } catch (error) {
      // 에러는 mutation에서 처리됨
    }
  }, [createInterview])

  // 페르소나 할당
  const assignPersonaMutation = useAssignPersonaDefinitionToInterview()
  
  const handlePersonaAssignment = useCallback(async (interviewId: string, personaDefinitionId: string) => {
    try {
      await assignPersonaMutation.mutateAsync({
        interviewId,
        personaDefinitionId
      })
      setPersonaAssignmentModal({ open: false, interviewId: '' })
    } catch (error) {
      // Error handled by mutation onError
    }
  }, [assignPersonaMutation])

  // 상태 분석은 useInterviews 훅에서 제공됨
  
  // 선택된 인터뷰
  const selectedInterview = interviews.find(i => i.id === selectedInterviewId)
  
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">인터뷰 목록</h2>
            {/* 상태 표시 */}
            <div className="flex items-center gap-2">
              {processingCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span>{processingCount}개 처리 중</span>
                </div>
              )}
              
              {isFetching && !isLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>동기화 중</span>
                </div>
              )}
              
              {!isLoading && totalCount > 0 && (
                <div className="text-sm text-gray-500">
                  총 {totalCount}개 인터뷰
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              <span className="ml-2 hidden sm:inline">새로고침</span>
            </Button>
            
            <Button
              onClick={() => setShowAddInterviewModal(true)}
              size="sm"
              disabled={isCreating}
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span className="ml-2 hidden sm:inline">인터뷰 추가</span>
            </Button>
          </div>
        </div>
      )}

      {/* 콘텐츠 영역 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedInterviewId ? (
            <motion.div 
              key="list"
              className="h-full"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={fadeVariants}
            >
              <div className="bg-white rounded-lg shadow-sm h-full overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
                          recommendedPersona: interview.ai_persona_match
                        })
                      }
                    }}
                    projectId={project.id}
                    currentUserId={profile?.id}
                  />
                )}
              </div>
            </motion.div>
          ) : !selectedInterview ? (
            <motion.div 
              key="loading"
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">인터뷰를 불러오는 중...</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="detail"
              className="h-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-white rounded-lg shadow-sm h-full overflow-auto">
                <InterviewDetail
                  interview={selectedInterview}
                  onBack={() => {
                    router.push(`/projects/${project.id}`, { scroll: false })
                  }}
                  onSectionsChange={onSectionsChange}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 모달들 */}
      <AddInterviewModal
        open={showAddInterviewModal}
        onOpenChange={setShowAddInterviewModal}
        onFilesSubmit={handleCreateInterview}
        projectId={project.id}
      />
      
      <PersonaAssignmentModal
        isOpen={personaAssignmentModal.open}
        onClose={() => setPersonaAssignmentModal({ open: false, interviewId: '' })}
        onConfirm={handlePersonaAssignment}
        interviewId={personaAssignmentModal.interviewId}
        currentPersonaDefinitionId={personaAssignmentModal.currentPersonaDefinitionId}
        recommendedPersona={personaAssignmentModal.recommendedPersona}
      />
    </div>
  )
}