'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from "framer-motion"
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
  const handleRefresh = async () => {
    const toastId = toast.loading('목록을 새로고침하는 중...')
    await refetch()
    toast.dismiss(toastId)
    toast.success('목록을 새로고침했습니다')
  }

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
      
      // 처리 완료 시 캐시 무효화 (서버에서 최신 데이터 다시 가져오기)
      if (updatedInterview.processing_status === 'completed' || 
          updatedInterview.processing_status === 'failed') {
        // 인터뷰 상세 정보 캐시 무효화
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.interviews.detail(updatedInterview.id) 
        })
        
        // 프로젝트의 인터뷰 목록도 갱신
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.interviews.byProject(project.id) 
        })
        
        // 처리 완료 알림
        if (updatedInterview.processing_status === 'completed') {
          toast.success(`"${updatedInterview.name || '인터뷰'}" 분석이 완료되었습니다!`)
        } else if (updatedInterview.processing_status === 'failed') {
          toast.error(`"${updatedInterview.name || '인터뷰'}" 분석에 실패했습니다.`)
        }
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
  const handleFilesSubmit = async (content: string | File, targetProjectId?: string, title?: string) => {
    if (!session?.access_token) return
    
    try {
      let response: Response;
      
      if (content instanceof File) {
        // 파일인 경우 FormData 사용
        const formData = new FormData()
        formData.append('file', content)
        formData.append('projectId', targetProjectId || project.id)
        formData.append('title', title || '제목 없음')
        
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
    <div>
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">인터뷰 관리</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="flex items-center gap-2">
              {realtimeConnected ? (
                <div className="flex items-center gap-1">
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">실시간</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <WifiOff className="h-4 w-4 text-red-500" title={`${connectionStatus}${lastError ? `: ${lastError}` : ''}`} />
                  <span className="text-xs text-red-600 font-medium">{connectionStatus}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reconnect}
                    className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                  >
                    재연결
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <Button 
            onClick={() => setShowAddInterviewModal(true)}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            인터뷰 추가
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          총 {interviews.length}개의 인터뷰가 등록되어 있습니다
        </p>
        <div className="h-px bg-gray-200 mt-6" />
      </div>

      {/* 인터뷰 목록 */}
      {error ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <p className="text-gray-500 mb-3">{error}</p>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            다시 시도
          </Button>
        </div>
      ) : (
        <InterviewDataTable
          interviews={interviews}
          onView={(id) => {
            // 선택한 인터뷰 찾기
            const interview = interviews.find(i => i.id === id)
            
            // 처리 중인 인터뷰는 상세 보기 차단
            if (interview?.processing_status === 'pending' || 
                interview?.processing_status === 'processing') {
              toast.warning('인터뷰 분석이 진행 중입니다. 완료 후 확인해주세요.')
              return
            }
            
            // URL에 interview 쿼리 파라미터 추가
            const url = new URL(window.location.href)
            url.searchParams.set('interview', id)
            router.push(url.pathname + url.search, { scroll: false })
          }}
          onDelete={handleDeleteInterview}
          loading={isLoading}
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