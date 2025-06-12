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

          {/* 인터뷰 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow duration-300 cursor-pointer group"
                onClick={() => handleViewDetail(interview)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Checkbox
                      checked={selectedInterviews.includes(interview.id)}
                      onCheckedChange={() => {
                        toggleSelectInterview(interview.id)
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          className="text-red-600"
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
                  
                  <h3 className="font-bold text-base text-slate-800 line-clamp-1 mb-2">
                    {interview.interviewee_fake_name || `인터뷰 ${interview.user_type}`}
                  </h3>
                  
                  {interview.user_description && (
                    <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                      {interview.user_description}
                    </p>
                  )}
                  
                  {interview.interviewee_summary && (
                    <p className="text-xs text-slate-500 line-clamp-3 mb-3">
                      {interview.interviewee_summary}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {new Date(interview.session_date).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      
                      <Badge 
                        variant={interview.interviewee_summary ? "secondary" : "outline"} 
                        className={`text-xs ${
                          interview.personas?.persona_reflected 
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                            : interview.interviewee_summary 
                            ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-50'
                        }`}
                      >
                        {interview.personas?.persona_reflected 
                          ? '페르소나 반영 완료'
                          : interview.interviewee_summary 
                          ? '분석 완료' 
                          : '분석 대기'
                        }
                      </Badge>
                    </div>
                    
                    {interview.created_by && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <User className="h-3 w-3" />
                        <span className="font-medium">
                          {interview.created_by === profile?.id 
                            ? '나' 
                            : interview.created_by_profile?.name || '팀원'
                          }
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {interview.personas?.persona_reflected ? (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-xs w-full justify-center">
                        {interview.personas.persona_title || interview.personas.persona_type}
                      </Badge>
                    </div>
                  ) : interview.interviewee_summary && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs h-7 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-pink-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenPersonaModal(interview)
                        }}
                        disabled={personaSynthesizing.includes(interview.id)}
                      >
                        {personaSynthesizing.includes(interview.id) ? (
                          <>
                            <div className="w-3 h-3 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mr-1.5" />
                            반영 중...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 mr-1.5" />
                            페르소나 반영하기
                          </>
                        )}
                      </Button>
                    </div>
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
    </div>
  )
} 