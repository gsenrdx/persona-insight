'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Plus, RotateCw, Wifi, WifiOff, Loader2 } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { useInterviewsRealtime, useInterviewDetailRealtime } from '@/hooks/use-interviews-realtime'
import { useProjectMembers } from '@/hooks/use-projects'
import { useInterviewRealtime } from '@/lib/realtime/interview-realtime-provider'
import { useAssignPersonaDefinitionToInterview } from '@/hooks/use-interviews'
import { Interview } from '@/types/interview'
import { InterviewDataTableInfinite } from '@/components/interview/interview-data-table-infinite'
import { useInterviewStatusMonitor } from '@/hooks/use-interview-status-monitor'
import InterviewDetail from '@/components/interview/interview-detail'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAllPresence } from '@/lib/realtime/interview-realtime-provider'
import { PresenceIndicator } from '@/components/ui/presence-indicator'
import { RealtimeConnectionStatus } from '@/components/ui/realtime-connection-status'

// 모달 동적 import
const AddInterviewModal = dynamic(() => import('@/components/modal').then(mod => ({ default: mod.AddInterviewModal })), {
  ssr: false,
  loading: () => null
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

export default function ProjectInterviewsRealtime({ project, selectedInterviewId, onSectionsChange }: ProjectInterviewsProps) {
  const { profile, session } = useAuth()
  const router = useRouter()
  const { data: members } = useProjectMembers(project.id)
  
  // Check if current user is admin
  const currentUserMember = members?.find(m => m.user_id === profile?.id)
  const isProjectAdmin = currentUserMember?.role === 'admin' || currentUserMember?.role === 'owner'
  
  // Realtime 훅 사용
  const { 
    interviews, 
    isLoading, 
    error, 
    createInterview, 
    updateInterview, 
    deleteInterview 
  } = useInterviewsRealtime(project.id, isProjectAdmin)
  
  // subscribeToProject와 forceRefreshData 함수 가져오기
  const { subscribeToProject, forceRefreshData } = useInterviewRealtime()
  
  // 전체 presence 정보 가져오기
  const allPresence = useAllPresence()
  
  // Only track presence when actually viewing an interview
  const { 
    interview: selectedInterview, 
    notes, 
    presence,
    broadcastUpdate 
  } = useInterviewDetailRealtime(selectedInterviewId || '')
  
  const [showAddInterviewModal, setShowAddInterviewModal] = useState(false)
  const [personaAssignmentModal, setPersonaAssignmentModal] = useState<{
    open: boolean
    interviewId: string
    currentPersonaDefinitionId?: string | null
    recommendedPersona?: string
  }>({ open: false, interviewId: '' })
  
  
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
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ interviewId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '재시도에 실패했습니다.')
      }

      const result = await response.json()
      toast.success(result.message || '인터뷰 처리를 다시 시작했습니다.')
    } catch (error: any) {
      toast.error(error.message || '재시도 중 오류가 발생했습니다.')
    }
  }, [session])
  
  // 상태 모니터링
  const { statusCounts, hasProcessing } = useInterviewStatusMonitor({ 
    interviews,
    onRetry: handleRetry
  })
  
  // Clean up presence when component unmounts or when leaving interview detail
  useEffect(() => {
    return () => {
      // This will run when component unmounts (e.g., navigating away from project)
      // Component unmounting, presence will be cleared automatically
    }
  }, [])

  // 새로고침 함수
  const handleRefresh = useCallback(async () => {
    // Realtime에서는 자동으로 동기화되므로 단순히 메시지만 표시
    toast.success('데이터가 실시간으로 동기화되고 있습니다')
  }, [])

  // 인터뷰 추가 처리
  const handleFilesSubmit = async (content: string | File, targetProjectId?: string, title?: string, lastModified?: number) => {
    if (!session?.access_token) return
    
    try {
      let response: Response;
      
      if (content instanceof File) {
        // 파일인 경우 FormData 사용
        const formData = new FormData()
        formData.append('file', content)
        formData.append('projectId', targetProjectId || project.id)
        formData.append('title', title || '제목 없음')
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
        // 텍스트인 경우 JSON 사용
        response = await fetch('/api/workflow/async', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: content,
            projectId: targetProjectId || project.id,
            title: title || '제목 없음'
          })
        })
      }

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '처리 중 오류가 발생했습니다')
      }

      // 성공 시 모달 닫기
      if (result.success) {
        toast.success('인터뷰가 제출되었습니다. 실시간으로 업데이트됩니다.')
        setShowAddInterviewModal(false)
        
        // 임시: 인터뷰 추가 직후 한 번만 강제로 데이터 새로고침
        // API에서 브로드캐스트로 추가 새로고침이 트리거됨
        setTimeout(() => {
          forceRefreshData()
        }, 100)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '처리 중 오류가 발생했습니다')
    }
  }

  // 페르소나 정의 할당 mutation
  const assignPersonaDefinitionMutation = useAssignPersonaDefinitionToInterview()

  // 페르소나 정의 할당 핸들러
  const handleAssignPersonaDefinition = async (personaDefinitionId: string) => {
    if (!personaAssignmentModal.interviewId) return
    
    try {
      await assignPersonaDefinitionMutation.mutateAsync({ 
        interviewId: personaAssignmentModal.interviewId, 
        personaDefinitionId 
      })
      toast.success('페르소나가 반영되었습니다.')
      setPersonaAssignmentModal({ open: false, interviewId: '' })
      
      // 실시간 업데이트가 작동하지 않을 경우를 대비해 수동 새로고침
      setTimeout(() => {
        subscribeToProject(project.id)
      }, 500)
    } catch (error) {
      toast.error('페르소나 반영에 실패했습니다.')
    }
  }

  // 페르소나 할당 모달 열기
  const handleOpenPersonaModal = (interviewId: string, recommendedPersona?: string) => {
    const interview = interviews.find(i => i.id === interviewId)
    setPersonaAssignmentModal({
      open: true,
      interviewId,
      currentPersonaDefinitionId: interview?.ai_persona_match,
      recommendedPersona: recommendedPersona || interview?.ai_persona_definition?.name_ko
    })
  }

  // 일괄 페르소나 할당 처리 (모달 없이 직접 처리)
  const [isBatchAssigning, setIsBatchAssigning] = useState(false)
  
  const handleBatchAssignPersona = async (interviewIds: string[]) => {
    if (!session?.access_token || isBatchAssigning) return

    // AI 추천이 있는 인터뷰만 필터링
    const interviewsWithRecommendations = interviews
      .filter(i => interviewIds.includes(i.id) && i.ai_persona_match && !i.confirmed_persona_definition_id)
      .map(i => ({
        interviewId: i.id,
        personaDefinitionId: i.ai_persona_match!
      }))

    if (interviewsWithRecommendations.length === 0) {
      toast.warning('AI 추천이 있는 미반영 인터뷰가 없습니다.')
      return
    }

    setIsBatchAssigning(true)

    try {
      const response = await fetch('/api/interviews/batch-assign-persona', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ assignments: interviewsWithRecommendations })
      })

      if (!response.ok) {
        throw new Error('일괄 반영에 실패했습니다.')
      }

      const result = await response.json()
      
      if (result.results.successCount > 0) {
        toast.success(`${result.results.successCount}개 인터뷰에 페르소나가 반영되었습니다.`)
      }
      if (result.results.failedCount > 0) {
        toast.error(`${result.results.failedCount}개 인터뷰 반영에 실패했습니다.`)
      }

      // 실시간 업데이트를 위한 수동 새로고침
      setTimeout(() => {
        subscribeToProject(project.id)
      }, 500)

      return result // 결과를 반환하여 테이블에서 사용할 수 있도록 함
    } catch (error) {
      toast.error('일괄 반영 중 오류가 발생했습니다.')
    } finally {
      setIsBatchAssigning(false)
    }
  }

  // 인터뷰 삭제 핸들러
  const handleDeleteInterview = async (interviewId: string) => {
    try {
      await deleteInterview(interviewId)
      
      // 선택된 인터뷰가 삭제된 경우 목록으로 돌아가기
      if (selectedInterviewId === interviewId) {
        const url = new URL(window.location.href)
        url.searchParams.delete('interview')
        router.replace(url.pathname + url.search, { scroll: false })
      }
      
      // 임시: 삭제 후 강제 새로고침 (REPLICA IDENTITY DEFAULT에서 DELETE 이벤트 문제)
      setTimeout(() => {
        forceRefreshData()
      }, 500)
    } catch (error) {
      // 에러는 hook 내부에서 처리됨
    }
  }

  // 현재 보고 있는 사용자 수 계산
  const viewerCount = presence.length

  // 인터뷰 상세 보기
  if (selectedInterview) {
    // 처리 중인 인터뷰인 경우 목록으로 돌아가기
    if (selectedInterview.status === 'pending' || 
        selectedInterview.status === 'processing') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-medium">인터뷰 분석 중입니다...</p>
          <p className="text-sm text-muted-foreground">
            분석이 완료되면 상세 내용을 확인할 수 있습니다.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              const url = new URL(window.location.href)
              url.searchParams.delete('interview')
              router.replace(url.pathname + url.search, { scroll: false })
            }}
          >
            목록으로 돌아가기
          </Button>
        </div>
      )
    }
    
    return (
      <div className="h-full p-6 lg:p-8 overflow-auto">
        <InterviewDetail 
          interview={selectedInterview}
          presence={presence}
          currentUserId={profile?.id}
          onBack={() => {
            // Clear presence before navigating back
            // URL에서 interview 쿼리 파라미터 제거
            const url = new URL(window.location.href)
            url.searchParams.delete('interview')
            router.replace(url.pathname + url.search, { scroll: false })
          }}
          onDelete={handleDeleteInterview}
          onSectionsChange={onSectionsChange}
        />
      </div>
    )
  }

  // 인터뷰 목록
  return (
    <div className="flex flex-col h-full">
      {/* 상단 헤더 - 고정 */}
      <div className="flex-shrink-0 px-6 lg:px-8 pt-6 lg:pt-8 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">인터뷰 관리</h2>
            <p className="text-sm text-gray-500 mt-1">총 {interviews.length}개의 인터뷰가 등록되어 있습니다</p>
          </div>
          <div className="flex items-center gap-3">
            <RealtimeConnectionStatus 
              projectId={project.id}
              onRefresh={handleRefresh}
            />
            <button
              onClick={() => setShowAddInterviewModal(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <Plus className="h-4 w-4" />
              인터뷰 추가
            </button>
          </div>
        </div>
      </div>

      {/* 인터뷰 테이블 - 스크롤 가능 영역 */}
      <div className="flex-1 min-h-0">
        {error ? (
        <div className="bg-white p-12 text-center">
          <p className="text-gray-500 mb-4">{error.message}</p>
          <Button 
            variant="outline"
            onClick={() => window.location.reload()}
          >
            페이지 새로고침
          </Button>
        </div>
      ) : (
        <InterviewDataTableInfinite
          interviews={interviews}
          currentUserId={profile?.id}
          isAdmin={isProjectAdmin}
          onView={(id) => {
            const interview = interviews.find(i => i.id === id)
            
            if (interview?.status === 'pending' || 
                interview?.status === 'processing') {
              toast.warning('인터뷰 분석이 진행 중입니다. 완료 후 확인해주세요.')
              return
            }
            
            // 다른 사용자에게 브로드캐스트
            broadcastUpdate({ action: 'view', userId: profile?.id })
            
            const url = new URL(window.location.href)
            url.searchParams.set('interview', id)
            router.replace(url.pathname + url.search, { scroll: false })
          }}
          onDelete={handleDeleteInterview}
          onRetry={handleRetry}
          isLoading={isLoading}
          presence={allPresence}
          onAssignPersona={handleOpenPersonaModal}
          onBatchAssignPersona={handleBatchAssignPersona}
          isBatchAssigning={isBatchAssigning}
          projectId={project.id}
        />
        )}
      </div>

      {/* 인터뷰 추가 모달 */}
      <AddInterviewModal
        open={showAddInterviewModal}
        onOpenChange={setShowAddInterviewModal}
        onFilesSubmit={handleFilesSubmit}
        projectId={project.id}
      />

      {/* 페르소나 할당 모달 */}
      <PersonaAssignmentModal
        open={personaAssignmentModal.open}
        onOpenChange={(open) => setPersonaAssignmentModal(prev => ({ ...prev, open }))}
        interviewId={personaAssignmentModal.interviewId}
        currentPersonaDefinitionId={personaAssignmentModal.currentPersonaDefinitionId}
        recommendedPersona={personaAssignmentModal.recommendedPersona}
        onAssign={handleAssignPersonaDefinition}
      />

    </div>
  )
}

