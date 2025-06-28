'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Plus, Search } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { Interview } from '@/types/interview'
import InterviewCard from '@/components/interview/interview-card'
import InterviewDetail from '@/components/interview/interview-detail'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'

// 모달 동적 import
const AddInterviewModal = dynamic(() => import('@/components/modal').then(mod => ({ default: mod.AddInterviewModal })), {
  ssr: false,
  loading: () => null
})

const WorkflowProgressModal = dynamic(() => import('@/components/modal').then(mod => ({ default: mod.WorkflowProgressModal })), {
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
  const [loading, setLoading] = useState(false)  // 초기값을 false로 변경
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const limit = 20
  const [showAddInterviewModal, setShowAddInterviewModal] = useState(false)
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)
  const [workflowJobs, setWorkflowJobs] = useState<any[]>([])
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null)

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
          console.error('Failed to fetch selected interview:', error)
        }
      } else {
        setSelectedInterview(null)
      }
    }
    
    fetchSelectedInterview()
  }, [selectedInterviewId, session?.access_token])

  // 인터뷰 목록 가져오기
  const fetchInterviews = async (loadMore = false, currentOffset?: number) => {
    console.log('fetchInterviews called with:', {
      profile_company_id: profile?.company_id,
      project_id: project?.id,
      session_token: !!session?.access_token,
      loadMore
    })
    
    if (!profile?.company_id || !project?.id || !session?.access_token) {
      console.log('Early return from fetchInterviews - missing required data')
      setLoading(false)  // loading을 false로 설정
      return
    }
    
    try {
      if (loadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      
      const offsetToUse = currentOffset ?? (loadMore ? offset : 0)
      
      const response = await fetch(
        `/api/interviews?project_id=${project.id}&limit=${limit}&offset=${offsetToUse}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('데이터를 가져오는데 실패했습니다')
      }
      
      const result = await response.json()
      console.log('API Response:', result)
      
      const { data, success, error } = result
      if (!success) {
        throw new Error(error || '데이터를 가져오는데 실패했습니다')
      }
      
      const newInterviews = data || []
      
      console.log('Fetched interviews:', newInterviews.length, 'items')
      console.log('First interview:', newInterviews[0])
      
      if (loadMore) {
        setInterviews(prev => [...prev, ...newInterviews])
      } else {
        setInterviews(newInterviews)
      }
      
      setHasMore(newInterviews.length === limit)
      setOffset(offsetToUse + newInterviews.length)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (profile?.company_id && project?.id && session?.access_token) {
      fetchInterviews()
    }
  }, [profile?.company_id, project?.id, session?.access_token, searchTerm])


  // 인터뷰 추가 처리
  const handleFilesSubmit = async (textOrFiles: string | File[], targetProjectId?: string) => {
    if (!session?.access_token) return
    
    try {
      setIsProgressModalOpen(true)
      
      // 텍스트만 처리 (파일은 텍스트로 변환되어 전달됨)
      const response = await fetch('/api/workflow', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: textOrFiles,
          projectId: targetProjectId || project.id
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '처리 중 오류가 발생했습니다')
      }

      // 성공 시 바로 목록 새로고침
      if (result.success) {
        toast.success('인터뷰가 성공적으로 추가되었습니다')
        setShowAddInterviewModal(false)
        setIsProgressModalOpen(false)
        fetchInterviews()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '처리 중 오류가 발생했습니다')
      setIsProgressModalOpen(false)
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

  // 로딩 상태
  console.log('Component state:', { loading, interviews: interviews.length, error })
  
  if (loading && interviews.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">인터뷰 관리</h1>
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // 오류 상태
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
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold">인터뷰 관리</h1>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="인터뷰 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button 
            onClick={() => setShowAddInterviewModal(true)}
            className="whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" />
            인터뷰 추가
          </Button>
        </div>
      </div>

      {/* 인터뷰 목록 */}
      {interviews.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">인터뷰가 없습니다</h3>
          <p className="text-gray-500 mb-6">첫 번째 인터뷰를 추가해보세요</p>
          <Button onClick={() => setShowAddInterviewModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            인터뷰 추가하기
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {interviews.map((interview) => (
              <motion.div
                key={interview.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <InterviewCard
                  interview={interview}
                  onView={(id) => {
                    // URL에 interview 쿼리 파라미터 추가
                    const url = new URL(window.location.href)
                    url.searchParams.set('interview', id)
                    router.push(url.pathname + url.search, { scroll: false })
                  }}
                  onDelete={handleDeleteInterview}
                />
              </motion.div>
            ))}
          </div>

          {/* 더보기 버튼 */}
          {hasMore && (
            <div className="text-center pt-6">
              <Button
                variant="outline"
                onClick={() => fetchInterviews(true)}
                disabled={loadingMore}
              >
                {loadingMore ? '불러오는 중...' : '더 보기'}
              </Button>
            </div>
          )}
        </>
      )}

      {/* 인터뷰 추가 모달 */}
      <AddInterviewModal
        open={showAddInterviewModal}
        onOpenChange={setShowAddInterviewModal}
        onFilesSubmit={handleFilesSubmit}
        projectId={project.id}
      />

      {/* 진행 상황 모달 */}
      <WorkflowProgressModal
        open={isProgressModalOpen}
        onOpenChange={setIsProgressModalOpen}
        jobs={workflowJobs}
        onComplete={() => {
          setIsProgressModalOpen(false)
          setWorkflowJobs([])
          fetchInterviews()
        }}
        onAddMore={() => {
          setIsProgressModalOpen(false)
          setShowAddInterviewModal(true)
        }}
      />
    </div>
  )
}