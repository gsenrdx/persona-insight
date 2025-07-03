'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Plus, RotateCw, Wifi, WifiOff, Loader2 } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { useInterviews, useInterview, useDeleteInterview } from '@/hooks/use-interviews'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { Interview } from '@/types/interview'
import { InterviewDataTable } from '@/components/interview/interview-data-table-clean'
import InterviewDetail from '@/components/interview/interview-detail'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { useRealtimeInterviews } from '@/hooks/use-realtime-interviews'
import { cn } from '@/lib/utils'

// 모달 동적 import
const AddInterviewModal = dynamic(() => import('@/components/modal').then(mod => ({ default: mod.AddInterviewModal })), {
  ssr: false,
  loading: () => null
})


interface Project {
  id: string
  name: string
  description: string
  company_id: string
  created_by: string
  visibility: 'public' | 'private'
  join_method: 'open' | 'invite_only' | 'password'
  created_at: string
}

interface ProjectInterviewsProps {
  project: Project
  selectedInterviewId?: string | null
}

export default function ProjectInterviews({ project, selectedInterviewId }: ProjectInterviewsProps) {
  const { profile, session } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  // React Query 훅 사용
  const { data: interviewsData, isLoading, error, refetch } = useInterviews({ projectId: project.id })
  const { data: selectedInterviewData } = useInterview(selectedInterviewId || '')
  
  const [showAddInterviewModal, setShowAddInterviewModal] = useState(false)
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null)

  // React Query 데이터를 state에 동기화
  useEffect(() => {
    if (interviewsData) {
      setInterviews(interviewsData)
    }
  }, [interviewsData])

  // 선택된 인터뷰 동기화
  useEffect(() => {
    if (selectedInterviewData) {
      setSelectedInterview(selectedInterviewData)
    } else if (!selectedInterviewId) {
      setSelectedInterview(null)
    }
  }, [selectedInterviewData, selectedInterviewId])

  // 새로고침 함수
  const handleRefresh = useCallback(async () => {
    const toastId = toast.loading('목록을 새로고침하는 중...')
    await refetch()
    toast.dismiss(toastId)
    toast.success('목록을 새로고침했습니다')
  }, [refetch])

  // WebSocket 실시간 구독 설정
  const { isConnected: realtimeConnected, reconnect, lastError, connectionStatus } = useRealtimeInterviews({
    projectId: project?.id || '',
    enabled: !!project?.id && !!profile?.company_id,
    onUpdate: (updatedInterview) => {
      // React Query 캐시 업데이트
      queryClient.setQueryData(
        queryKeys.interviews.byProject(project.id),
        (old: Interview[] | undefined) => {
          if (!old) return [updatedInterview]
          return old.map(i => i.id === updatedInterview.id ? updatedInterview : i)
        }
      )
      
      // 선택된 인터뷰 캐시 업데이트
      if (updatedInterview.id === selectedInterviewId) {
        queryClient.setQueryData(
          queryKeys.interviews.detail(updatedInterview.id),
          updatedInterview
        )
      }
      
      // 더 이상 토스트 알림을 표시하지 않음 - WebSocket으로 자동 업데이트되므로
      const isNewlyCompleted = updatedInterview.processing_status === 'completed' && 
        interviews.find(i => i.id === updatedInterview.id)?.processing_status !== 'completed'
        
      if (isNewlyCompleted) {
        // 크게 눈에 띄만한 성공 알림만 표시
        toast.success(`"${updatedInterview.title}" 분석이 완료되었습니다!`, {
          duration: 5000,
          action: {
            label: '확인',
            onClick: () => {
              const url = new URL(window.location.href)
              url.searchParams.set('interview', updatedInterview.id)
              router.replace(url.pathname + url.search, { scroll: false })
            }
          }
        })
      }
      
      // 로컬 state도 업데이트
      setInterviews(prev => 
        prev.map(i => i.id === updatedInterview.id ? updatedInterview : i)
      )
      
      if (selectedInterview?.id === updatedInterview.id) {
        setSelectedInterview(updatedInterview)
      }
    },
    onInsert: (newInterview) => {
      // React Query 캐시에 추가
      queryClient.setQueryData(
        queryKeys.interviews.byProject(project.id),
        (old: Interview[] | undefined) => {
          if (!old) return [newInterview]
          if (old.some(i => i.id === newInterview.id)) return old
          return [newInterview, ...old]
        }
      )
      
      // 로컬 state도 업데이트
      setInterviews(prev => {
        if (prev.some(i => i.id === newInterview.id)) return prev
        return [newInterview, ...prev]
      })
    },
    onDelete: (deletedId) => {
      // React Query 캐시에서 제거
      queryClient.setQueryData(
        queryKeys.interviews.byProject(project.id),
        (old: Interview[] | undefined) => {
          if (!old) return []
          return old.filter(i => i.id !== deletedId)
        }
      )
      
      // 삭제된 인터뷰의 상세 캐시도 무효화
      queryClient.removeQueries({ 
        queryKey: queryKeys.interviews.detail(deletedId) 
      })
      
      // 로컬 state도 업데이트
      setInterviews(prev => prev.filter(i => i.id !== deletedId))
      if (selectedInterview?.id === deletedId) {
        setSelectedInterview(null)
      }
    }
  })




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
        // WebSocket을 통해 자동으로 업데이트되므로 수동 fetch 불필요
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '처리 중 오류가 발생했습니다')
    }
  }


  // 인터뷰 삭제 훅 사용
  const deleteInterview = useDeleteInterview()
  
  // 인터뷰 삭제 핸들러
  const handleDeleteInterview = async (interviewId: string) => {
    try {
      await deleteInterview.mutateAsync(interviewId)
      toast.success('인터뷰가 삭제되었습니다')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '인터뷰 삭제에 실패했습니다')
    }
  }



  // 인터뷰 상세 보기
  if (selectedInterview) {
    // 처리 중인 인터뷰인 경우 목록으로 돌아가기
    if (selectedInterview.processing_status === 'pending' || 
        selectedInterview.processing_status === 'processing') {
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
      <InterviewDetail 
        interview={selectedInterview}
        onBack={() => {
          // URL에서 interview 쿼리 파라미터 제거
          const url = new URL(window.location.href)
          url.searchParams.delete('interview')
          router.replace(url.pathname + url.search, { scroll: false })
        }}
        onDelete={handleDeleteInterview}
      />
    )
  }

  // 인터뷰 목록
  return (
    <div className="space-y-6">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">인터뷰 관리</h2>
          <p className="text-sm text-gray-500 mt-1">총 {interviews.length}개의 인터뷰가 등록되어 있습니다</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-sm">
            {realtimeConnected ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-gray-700">연결됨</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-gray-700">연결 끊김</span>
              </>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              isLoading
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100 border border-gray-300"
            )}
          >
            <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
          <button
            onClick={() => setShowAddInterviewModal(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <Plus className="h-4 w-4" />
            인터뷰 추가
          </button>
        </div>
      </div>

      {/* 인터뷰 테이블 */}
      {error ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">{error}</p>
          <Button 
            variant="outline"
            onClick={() => refetch()}
          >
            다시 시도
          </Button>
        </div>
      ) : (
        <InterviewDataTable
          interviews={interviews}
          currentUserId={profile?.id}
          onView={(id) => {
            const interview = interviews.find(i => i.id === id)
            
            if (interview?.processing_status === 'pending' || 
                interview?.processing_status === 'processing') {
              toast.warning('인터뷰 분석이 진행 중입니다. 완료 후 확인해주세요.')
              return
            }
            
            const url = new URL(window.location.href)
            url.searchParams.set('interview', id)
            router.push(url.pathname + url.search, { scroll: false })
          }}
          onDelete={handleDeleteInterview}
          isLoading={isLoading}
        />
      )}

      {/* 인터뷰 추가 모달 */}
      <AddInterviewModal
        open={showAddInterviewModal}
        onOpenChange={setShowAddInterviewModal}
        onFilesSubmit={handleFilesSubmit}
        projectId={project.id}
      />
    </div>
  )
}