'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Plus, RotateCw, Wifi, WifiOff, Loader2 } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { useInterviewsRealtime, useInterviewDetailRealtime } from '@/hooks/use-interviews-realtime'
import { Interview } from '@/types/interview'
import { InterviewDataTable } from '@/components/interview/interview-data-table-clean'
import InterviewDetail from '@/components/interview/interview-detail'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { InterviewRealtimeProvider } from '@/lib/realtime/interview-realtime-provider'

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

function ProjectInterviewsContent({ project, selectedInterviewId }: ProjectInterviewsProps) {
  const { profile, session } = useAuth()
  const router = useRouter()
  
  // Realtime 훅 사용
  const { 
    interviews, 
    isLoading, 
    error, 
    createInterview, 
    updateInterview, 
    deleteInterview 
  } = useInterviewsRealtime(project.id)
  
  const { 
    interview: selectedInterview, 
    notes, 
    presence,
    broadcastUpdate 
  } = useInterviewDetailRealtime(selectedInterviewId || '')
  
  const [showAddInterviewModal, setShowAddInterviewModal] = useState(false)

  // 새로고침 함수
  const handleRefresh = useCallback(async () => {
    // Realtime에서는 자동으로 동기화되므로 단순히 메시지만 표시
    toast.success('데이터가 실시간으로 동기화되고 있습니다')
  }, [])

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
        // Realtime을 통해 자동으로 업데이트됨
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '처리 중 오류가 발생했습니다')
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
    } catch (error) {
      // 에러는 hook 내부에서 처리됨
    }
  }

  // 현재 보고 있는 사용자 수 계산
  const viewerCount = presence.length

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
      <div>
        {viewerCount > 1 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              현재 {viewerCount}명이 이 인터뷰를 보고 있습니다
            </p>
          </div>
        )}
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
      </div>
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
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-700">실시간 동기화</span>
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
          <p className="text-gray-500 mb-4">{error.message}</p>
          <Button 
            variant="outline"
            onClick={() => window.location.reload()}
          >
            페이지 새로고침
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
            
            // 다른 사용자에게 브로드캐스트
            broadcastUpdate({ action: 'view', userId: profile?.id })
            
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

// Provider로 감싸진 컴포넌트 export
export default function ProjectInterviewsRealtime(props: ProjectInterviewsProps) {
  return (
    <InterviewRealtimeProvider>
      <ProjectInterviewsContent {...props} />
    </InterviewRealtimeProvider>
  )
}