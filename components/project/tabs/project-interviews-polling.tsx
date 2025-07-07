'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw, Loader2, WifiOff, Wifi } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { useAdaptiveInterviews } from '@/hooks/use-adaptive-interviews'
import { useProjectMembers } from '@/hooks/use-projects'
import { useAssignPersonaDefinitionToInterview } from '@/hooks/use-interview-persona'
import { Interview } from '@/types/interview'
import { InterviewDataTableInfinite } from '@/components/interview/interview-data-table-infinite'
import { useInterviewStatusMonitor } from '@/hooks/use-interview-status-monitor'
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

interface ProjectInterviewsPollingProps {
  project: Project
  selectedInterviewId?: string | null
  onSectionsChange?: (sections: any[] | null, activeSection: string | null, scrollToSection: ((sectionName: string) => void) | null) => void
}

export default function ProjectInterviewsPolling({ 
  project, 
  selectedInterviewId, 
  onSectionsChange 
}: ProjectInterviewsPollingProps) {
  const { profile, session } = useAuth()
  const router = useRouter()
  const { data: members } = useProjectMembers(project.id)
  
  // Check if current user is admin
  const currentUserMember = members?.find(m => m.user_id === profile?.id)
  const isProjectAdmin = currentUserMember?.role === 'admin' || currentUserMember?.role === 'owner'
  
  // 적응형 인터뷰 목록 (네트워크 상태에 따라 자동 최적화)
  const { 
    interviews, 
    isLoading, 
    isFetching,
    error, 
    updateInterview, 
    deleteInterview,
    refetch,
    isUpdating,
    isDeleting
  } = useAdaptiveInterviews(project.id)
  
  const [showAddInterviewModal, setShowAddInterviewModal] = useState(false)
  const [isCreatingInterview, setIsCreatingInterview] = useState(false)
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
      const response = await fetch(`/api/interviews/${interviewId}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('재시도 실패')
      }
      
      const result = await response.json()
      
      // 목록 새로고침
      refetch()
      
      toast.success('인터뷰 분석을 다시 시작했습니다.')
    } catch (error) {
      toast.error('인터뷰 재시도에 실패했습니다.')
    }
  }, [session, refetch])

  // 인터뷰 생성 핸들러
  const handleCreateInterview = useCallback(async (content: File | string, projectId: string, title: string, lastModified?: number) => {
    setIsCreatingInterview(true)
    try {
      if (!session?.access_token) {
        toast.error('다시 로그인해주세요.')
        return
      }

      let response: Response

      if (content instanceof File) {
        // 파일 업로드 방식
        const formData = new FormData()
        formData.append('file', content)
        formData.append('projectId', projectId)
        formData.append('title', title)
        if (lastModified) {
          formData.append('lastModified', lastModified.toString())
        }

        response = await fetch('/api/workflow/async', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: formData
        })
      } else {
        // 텍스트 입력 방식
        response = await fetch('/api/workflow/async', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: content,
            projectId,
            title
          })
        })
      }

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`인터뷰 생성에 실패했습니다 (${response.status}: ${response.statusText})`)
      }

      const result = await response.json()
      
      // 인터뷰 목록 새로고침
      refetch()
      setShowAddInterviewModal(false)
      toast.success('인터뷰가 생성되어 분석을 시작합니다')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '인터뷰 생성에 실패했습니다')
    } finally {
      setIsCreatingInterview(false)
    }
  }, [session, refetch])

  // 페르소나 할당
  const assignPersonaMutation = useAssignPersonaDefinitionToInterview()
  
  const handlePersonaAssignment = useCallback(async (interviewId: string, personaDefinitionId: string) => {
    try {
      await assignPersonaMutation.mutateAsync({
        interviewId,
        personaDefinitionId
      })
      setPersonaAssignmentModal({ open: false, interviewId: '' })
      refetch() // 목록 새로고침
    } catch (error) {
      // Error handled by mutation onError
    }
  }, [assignPersonaMutation, refetch])

  // 인터뷰 상태 모니터링
  const { statusCounts, hasProcessing, hasFailed } = useInterviewStatusMonitor({
    interviews: interviews || [],
    onRetry: handleRetry
  })
  
  // 현재 코드에서는 status monitoring이 별도로 필요하지 않으므로
  // interviews를 그대로 사용
  const interviewsWithStatus = interviews
  
  // 선택된 인터뷰
  const selectedInterview = interviews.find(i => i.id === selectedInterviewId)
  
  // 에러 상태 처리
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <WifiOff className="w-12 h-12 text-gray-400" />
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
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Wifi className={cn(
                "w-4 h-4",
                isFetching ? "text-blue-500 animate-pulse" : "text-green-500"
              )} />
              <span>자동 새로고침 30초</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={cn(
                "w-4 h-4",
                isFetching && "animate-spin"
              )} />
              <span className="ml-2 hidden sm:inline">새로고침</span>
            </Button>
            
            <Button
              onClick={() => setShowAddInterviewModal(true)}
              size="sm"
              disabled={isCreatingInterview}
            >
              {isCreatingInterview ? (
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
                    interviews={interviewsWithStatus}
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
                  interview={selectedInterview!}
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