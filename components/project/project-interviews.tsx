'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Play, FileText, Calendar, MoreHorizontal, Trash2, Plus, User, Sparkles } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { IntervieweeData } from '@/types/interviewee'
import InterviewDetail from './interview-detail'
import { supabase } from '@/lib/supabase'
import PersonaSelectionModal from '@/components/modal/persona-selection-modal'
import { PersonaClassificationModal } from '@/components/modal'

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
  const [selectedInterview, setSelectedInterview] = useState<IntervieweeData | null>(null)
  const [criteriaConfig, setCriteriaConfig] = useState<any>(null)
  const [personaSynthesizing, setPersonaSynthesizing] = useState<string[]>([])
  const [showPersonaModal, setShowPersonaModal] = useState(false)
  const [selectedInterviewForPersona, setSelectedInterviewForPersona] = useState<IntervieweeData | null>(null)
  const [showPersonaClassificationModal, setShowPersonaClassificationModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (profile?.company_id && project?.id) {
      fetchInterviews()
    }
  }, [profile?.company_id, project?.id])

  useEffect(() => {
    if (profile?.company_id) {
      fetchCriteriaConfig()
    }
  }, [profile?.company_id])

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

  const fetchCriteriaConfig = async () => {
    try {
      if (!profile?.company_id) return
      
      const response = await fetch(`/api/supabase/persona-criteria?company_id=${profile.company_id}`)
      
      if (response.ok) {
        const result = await response.json()
        if (result.data && result.data.length > 0) {
          setCriteriaConfig(result.data[0])
        }
      }
    } catch (err) {
      console.error('페르소나 기준 설정을 가져오는데 실패했습니다:', err)
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
    setSelectedInterview(interview)
  }

  const handleBackToList = () => {
    setSelectedInterview(null)
  }

  const handleDeleteInterview = async (interviewId: string) => {
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
      setSelectedInterview(null) // 상세보기도 닫기
      
      alert('인터뷰가 삭제되었습니다')
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다')
    }
  }

  const handleOpenPersonaModal = (interview: IntervieweeData) => {
    setSelectedInterviewForPersona(interview)
    setShowPersonaModal(true)
  }

  const handleClosePersonaModal = () => {
    setShowPersonaModal(false)
    setSelectedInterviewForPersona(null)
  }

  const handleConfirmPersona = async (selectedPersonaId: string) => {
    if (!selectedInterviewForPersona) return
    
    try {
      setPersonaSynthesizing(prev => [...prev, selectedInterviewForPersona.id])

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('인증 정보를 찾을 수 없습니다. 다시 로그인해주세요.')
      }

      // 먼저 인터뷰의 persona_id 업데이트
      if (selectedPersonaId !== selectedInterviewForPersona.persona_id) {
        const { error: updateError } = await supabase
          .from('interviewees')
          .update({ persona_id: selectedPersonaId })
          .eq('id', selectedInterviewForPersona.id)

        if (updateError) {
          throw new Error('인터뷰 페르소나 배정 업데이트에 실패했습니다')
        }
      }

      const selectedInterviewee = typeof selectedInterviewForPersona === 'string' 
        ? selectedInterviewForPersona 
        : JSON.stringify(selectedInterviewForPersona)

      const response = await fetch('/api/persona-synthesis', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selectedInterviewee,
          personaType: selectedInterviewForPersona.personas?.persona_type || selectedInterviewForPersona.user_type,
          personaId: selectedPersonaId,
          projectId: project?.id
        })
      })

      if (!response.ok) {
        let errorMessage = '페르소나 반영 중 오류가 발생했습니다'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          const errorText = await response.text()
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      // 인터뷰 목록 새로고침
      await fetchInterviews()
      
      // 모달 닫기
      handleClosePersonaModal()
      
      alert('페르소나 반영이 완료되었습니다')
    } catch (error: any) {
      console.error('페르소나 반영 오류:', error)
      alert(error.message || '페르소나 반영 중 오류가 발생했습니다')
    } finally {
      setPersonaSynthesizing(prev => prev.filter(id => id !== selectedInterviewForPersona.id))
    }
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

  // 인터뷰 상세보기 모드일 때는 상세 컴포넌트 렌더링
  if (selectedInterview) {
    return (
      <InterviewDetail
        interview={selectedInterview}
        criteriaConfig={criteriaConfig}
        onBack={handleBackToList}
        onDelete={handleDeleteInterview}
      />
    )
  }

  // 인터뷰 리스트 모드
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
          <div className="flex items-center justify-between py-4 px-6 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedAll}
                onCheckedChange={toggleSelectAll}
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <div className="flex flex-col">
                <span className="text-base font-semibold text-gray-900">인터뷰 목록</span>
                <span className="text-sm text-gray-500">{interviews.length}개의 인터뷰</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                className="bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
                onClick={() => setShowPersonaClassificationModal(true)}
              >
                <User className="w-4 h-4 mr-2" />
                페르소나 분류 현황
              </Button>
            </div>
          </div>

          {/* 인터뷰 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="bg-white border border-gray-200 rounded-2xl hover:border-gray-300 hover:scale-[1.01] transition-all duration-300 cursor-pointer group overflow-hidden relative"
                onClick={() => handleViewDetail(interview)}
              >
                
                <div className="p-5">
                  {/* 헤더 */}
                  <div className="flex items-start justify-between mb-4">
                    <Checkbox
                      checked={selectedInterviews.includes(interview.id)}
                      onCheckedChange={() => {
                        toggleSelectInterview(interview.id)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 border-gray-300 rounded-md"
                    />
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-gray-100 rounded-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4 text-gray-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-0 shadow-lg">
                        <DropdownMenuItem 
                          className="text-red-600 hover:bg-red-50 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteInterview(interview.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* 제목 */}
                  <h3 className="font-semibold text-base text-gray-900 line-clamp-2 mb-3 leading-snug group-hover:text-blue-600 transition-colors duration-300">
                    {interview.interviewee_fake_name || `인터뷰 ${interview.user_type}`}
                  </h3>
                  
                  
                  {/* 요약 */}
                  {interview.interviewee_summary && (
                    <div className="mb-4 p-3 bg-gray-50/70 rounded-xl border-0">
                      <p className="text-xs text-gray-600 line-clamp-4 leading-relaxed">
                        {interview.interviewee_summary}
                      </p>
                    </div>
                  )}
                  
                  {/* 메타데이터 */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="font-medium">
                          {new Date(interview.session_date).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        interview.persona_reflected 
                          ? 'bg-green-100 text-green-700'
                          : interview.interviewee_summary 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {interview.persona_reflected 
                          ? '반영완료'
                          : interview.interviewee_summary 
                          ? '분석완료' 
                          : '대기중'
                        }
                      </div>
                    </div>
                    
                    {interview.created_by && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User className="h-3.5 w-3.5" />
                        <span className="font-medium">
                          {interview.created_by === profile?.id 
                            ? '나' 
                            : interview.created_by_profile?.name || '팀원'
                          }
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* 액션 영역 */}
                  {interview.persona_reflected ? (
                    <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                        <span className="text-xs font-medium text-indigo-700 truncate">
                          {interview.personas?.persona_title || interview.personas?.persona_type}
                        </span>
                      </div>
                    </div>
                  ) : interview.interviewee_summary && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full h-9 text-xs font-medium bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 hover:border-purple-300 text-purple-700 rounded-xl transition-all duration-300 hover:shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenPersonaModal(interview)
                      }}
                      disabled={personaSynthesizing.includes(interview.id)}
                    >
                      {personaSynthesizing.includes(interview.id) ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mr-2" />
                          반영 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 mr-2" />
                          페르소나 반영하기
                        </>
                      )}
                    </Button>
                  )}
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

      {/* 페르소나 선택 모달 */}
      <PersonaSelectionModal
        isOpen={showPersonaModal}
        onClose={handleClosePersonaModal}
        onConfirm={handleConfirmPersona}
        recommendedPersonaId={selectedInterviewForPersona?.persona_id}
        isLoading={selectedInterviewForPersona ? personaSynthesizing.includes(selectedInterviewForPersona.id) : false}
      />

      {/* 페르소나 분류 현황 모달 */}
      <PersonaClassificationModal
        isOpen={showPersonaClassificationModal}
        onClose={() => setShowPersonaClassificationModal(false)}
        interviews={interviews}
      />
    </div>
  )
} 