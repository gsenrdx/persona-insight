'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Play, FileText, Calendar, MoreHorizontal, Trash2, Plus, Eye } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { IntervieweeData } from '@/types/interviewee'

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
}

export default function ProjectInterviews({ project }: ProjectInterviewsProps) {
  const { profile } = useAuth()
  const [interviews, setInterviews] = useState<IntervieweeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAll, setSelectedAll] = useState(false)
  const [selectedInterviews, setSelectedInterviews] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    if (profile?.company_id && project?.id) {
      fetchInterviews()
    }
  }, [profile?.company_id, project?.id])

  const fetchInterviews = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!profile?.company_id || !project?.id) {
        setError('회사 또는 프로젝트 정보를 찾을 수 없습니다')
        return
      }

      const response = await fetch(`/api/supabase/interviewee?company_id=${profile.company_id}&project_id=${project.id}`)
      
      if (!response.ok) {
        throw new Error('데이터를 가져오는데 실패했습니다')
      }
      
      const result = await response.json()
      setInterviews(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (interviewId: string) => {
    if (!confirm('정말로 이 인터뷰를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/supabase/interviewee/${interviewId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('인터뷰 삭제에 실패했습니다')
      }

      // 목록에서 삭제된 항목 제거
      setInterviews(prev => prev.filter(item => item.id !== interviewId))
      setSelectedInterviews(prev => prev.filter(id => id !== interviewId))
      
      alert('인터뷰가 삭제되었습니다')
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다')
    }
  }

  const getTypeIcon = (userType: string) => {
    // 실제 user_type 필드는 문자열이므로 아이콘을 매핑
    return <FileText className="w-5 h-5 text-gray-600" />
  }

  const toggleSelectAll = () => {
    setSelectedAll(!selectedAll)
    if (!selectedAll) {
      setSelectedInterviews(interviews.map(i => i.id))
    } else {
      setSelectedInterviews([])
    }
  }

  const toggleSelectInterview = (id: string) => {
    setSelectedInterviews(prev => {
      const newSelected = prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
      
      setSelectedAll(newSelected.length === interviews.length)
      return newSelected
    })
  }

  const handleAddInterview = () => {
    router.push('/interviews')
  }

  const handleViewDetail = (interview: IntervieweeData) => {
    router.push(`/interviews/${interview.id}`)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">인터뷰 관리</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
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
          <Button variant="outline" onClick={fetchInterviews}>다시 시도</Button>
        </div>
      </div>
    )
  }

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
          {/* 전체 선택 헤더 */}
          <div className="flex items-center gap-4 py-3 px-4 bg-gray-50 rounded-lg">
            <Checkbox
              checked={selectedAll}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm font-medium text-gray-700">인터뷰 목록 ({interviews.length}개)</span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                페르소나 기준 보기
              </Button>
              <Button variant="outline" size="sm">
                AI 자동 처리
              </Button>
            </div>
          </div>

          {/* 인터뷰 목록 */}
          <div className="space-y-2">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="flex items-center gap-4 py-4 px-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Checkbox
                  checked={selectedInterviews.includes(interview.id)}
                  onCheckedChange={() => toggleSelectInterview(interview.id)}
                />
                
                <div className="flex-shrink-0">
                  {getTypeIcon(interview.user_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {interview.interviewee_fake_name || '이름 없음'}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span>{interview.user_type}</span>
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(interview.session_date).toLocaleDateString('ko-KR')}
                    </span>
                    {interview.user_description && (
                      <span className="truncate max-w-[200px]">{interview.user_description}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {interview.interviewee_summary ? '분석 완료' : '분석 대기'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {interview.created_at ? new Date(interview.created_at).toLocaleDateString('ko-KR') : ''}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDetail(interview)}>
                        <Eye className="w-4 h-4 mr-2" />
                        자세히 보기
                      </DropdownMenuItem>
                      <DropdownMenuItem>수정</DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDelete(interview.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
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
    </div>
  )
} 