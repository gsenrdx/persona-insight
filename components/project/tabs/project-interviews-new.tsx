'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Plus, RotateCw, Wifi, WifiOff } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { Interview } from '@/types/interview'
import { InterviewList } from '@/components/interview/interview-list'
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
  
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddInterviewModal, setShowAddInterviewModal] = useState(false)
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 선택된 인터뷰 가져오기
  useEffect(() => {
    const fetchSelectedInterview = async () => {
      if (selectedInterviewId && session?.access_token) {
        try {
          const response = await fetch(`/api/interviews/${selectedInterviewId}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
          
          if (response.ok) {
            const { data } = await response.json()
            setSelectedInterview(data)
          }
        } catch (error) {
          // Error already handled above
        }
      } else {
        setSelectedInterview(null)
      }
    }
    
    fetchSelectedInterview()
  }, [selectedInterviewId, session?.access_token])

  // 인터뷰 목록 초기 로딩
  const fetchInterviews = useCallback(async () => {
    if (!profile?.company_id || !project?.id || !session?.access_token) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(
        `/api/interviews?project_id=${project.id}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('인터뷰 목록을 불러오는데 실패했습니다')
      }
      
      const result = await response.json()
      const { data, success, error } = result
      
      if (!success) {
        throw new Error(error || '인터뷰 목록을 불러오는데 실패했습니다')
      }
      
      setInterviews(data || [])
      
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다')
      // Error already handled above
    } finally {
      setLoading(false)
    }
  }, [profile?.company_id, project?.id, session?.access_token])

  // 새로고침 함수
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchInterviews()
    setIsRefreshing(false)
    toast.success('목록을 새로고침했습니다')
  }

  // 컴포넌트 마운트 시 인터뷰 목록 가져오기
  useEffect(() => {
    fetchInterviews()
  }, [fetchInterviews])

  // WebSocket 실시간 구독 설정
  const { isConnected: realtimeConnected, reconnect, lastError, connectionStatus } = useRealtimeInterviews({
    projectId: project?.id || '',
    enabled: !!project?.id && !!profile?.company_id,
    onUpdate: (updatedInterview) => {
      // 로컬 state 업데이트
      setInterviews(prev => 
        prev.map(i => i.id === updatedInterview.id ? updatedInterview : i)
      )
      
      // 선택된 인터뷰 업데이트
      if (selectedInterview?.id === updatedInterview.id) {
        setSelectedInterview(updatedInterview)
      }
    },
    onInsert: (newInterview) => {
      // 중복 체크 후 추가
      setInterviews(prev => {
        if (prev.some(i => i.id === newInterview.id)) return prev
        return [newInterview, ...prev]
      })
    },
    onDelete: (deletedId) => {
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


  // 인터뷰 삭제
  const handleDeleteInterview = async (interviewId: string) => {
    if (!session?.access_token) return
    
    try {
      const response = await fetch(`/api/interviews/${interviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '인터뷰 삭제에 실패했습니다')
      }

      // 목록에서 삭제
      setInterviews(prev => prev.filter(item => item.id !== interviewId))
      
      
      toast.success('인터뷰가 삭제되었습니다')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '인터뷰 삭제에 실패했습니다')
    }
  }



  // 인터뷰 상세 보기
  if (selectedInterview) {
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
              disabled={isRefreshing}
              className="h-8 w-8"
            >
              <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
            onClick={() => fetchInterviews()}
          >
            다시 시도
          </Button>
        </div>
      ) : (
        <InterviewList
          interviews={interviews}
          onView={(id) => {
            // URL에 interview 쿼리 파라미터 추가
            const url = new URL(window.location.href)
            url.searchParams.set('interview', id)
            router.push(url.pathname + url.search, { scroll: false })
          }}
          onDelete={handleDeleteInterview}
          loading={loading}
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