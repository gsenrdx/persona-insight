'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Users, Calendar, CheckCircle, Loader2 } from "lucide-react"
import { IntervieweeData } from '@/types/interviewee'
import { useAuth } from '@/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import { fetchPersonas } from '@/lib/persona-data'

interface Persona {
  id: string
  persona_type: string
  persona_title: string | null
  persona_description: string
  thumbnail: string | null
  company_id: string
}

interface PersonaClassification extends Persona {
  interviews: IntervieweeData[]
}

interface PersonaClassificationModalProps {
  isOpen: boolean
  onClose: () => void
  interviews: IntervieweeData[]
}

export default function PersonaClassificationModal({
  isOpen,
  onClose,
  interviews
}: PersonaClassificationModalProps) {
  const { profile } = useAuth()
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null)

  // 전체 페르소나 목록 조회 (React Query 사용)
  const { data: allPersonasRaw = [], isLoading: personasLoading } = useQuery({
    queryKey: ['personas', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return []
      
      // fetchPersonas 함수 사용하여 일관성 유지
      return await fetchPersonas(profile?.company_id)
    },
    enabled: !!profile?.company_id && isOpen,
    staleTime: 5 * 60 * 1000,
  })

  // PersonaCardData를 Persona 타입으로 변환
  const allPersonas: Persona[] = allPersonasRaw.map(persona => ({
    id: persona.id,
    persona_type: persona.persona_type,
    persona_title: persona.name, // name을 persona_title로 매핑
    persona_description: persona.summary, // summary를 persona_description으로 매핑
    thumbnail: persona.image && persona.image.includes('placeholder.svg') ? null : persona.image,
    company_id: profile?.company_id || ''
  }))

  // 페르소나별 인터뷰 분류 처리
  const processClassifications = (): { 
    classifications: PersonaClassification[], 
    unclassifiedInterviews: IntervieweeData[] 
  } => {
    const interviewsByPersona: { [key: string]: IntervieweeData[] } = {}
    const unclassified: IntervieweeData[] = []

    // 인터뷰를 페르소나별로 분류 (persona_reflected가 true인 것만)
    interviews.forEach((interview) => {
      if (interview.persona_id && interview.persona_reflected) {
        if (!interviewsByPersona[interview.persona_id]) {
          interviewsByPersona[interview.persona_id] = []
        }
        interviewsByPersona[interview.persona_id].push(interview)
      } else {
        unclassified.push(interview)
      }
    })

    // 전체 페르소나 목록에 인터뷰 매핑 (A-Z 순서대로)
    const classifications: PersonaClassification[] = allPersonas
      .sort((a, b) => a.persona_type.localeCompare(b.persona_type))
      .map(persona => ({
        ...persona,
        interviews: interviewsByPersona[persona.id] || []
      }))

    return { classifications, unclassifiedInterviews: unclassified }
  }

  const { classifications, unclassifiedInterviews } = processClassifications()

  // 첫 번째 페르소나 또는 미분류를 기본 선택
  useEffect(() => {
    if (isOpen) {
      if (classifications.length > 0) {
        setSelectedPersonaId(classifications[0].id)
      } else if (unclassifiedInterviews.length > 0) {
        setSelectedPersonaId('unclassified')
      } else {
        setSelectedPersonaId(null)
      }
    }
  }, [isOpen, classifications.length, unclassifiedInterviews.length])

  const selectedClassification = classifications.find(c => c.id === selectedPersonaId)
  const selectedInterviews = selectedClassification?.interviews || []

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            페르소나 분류 현황
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            반영완료된 인터뷰들의 페르소나별 분류 현황을 확인하세요
          </p>
        </DialogHeader>

        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* 왼쪽: 페르소나 리스트 */}
          <div className="w-80 flex-shrink-0">
            <div className="h-full overflow-y-auto space-y-3">
              {personasLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2 text-sm text-gray-500">페르소나 목록 로딩 중...</span>
                </div>
              ) : (
                <>
                  {/* 전체 페르소나 목록 (A-Z 순서, 인터뷰 배정 여부와 관계없이) */}
                  {classifications.map((classification) => (
                    <div
                      key={classification.id}
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedPersonaId === classification.id
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedPersonaId(classification.id)}
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={classification.thumbnail || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 text-blue-700">
                          {classification.persona_type.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {classification.persona_title || classification.persona_type}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={classification.interviews.length > 0 ? "secondary" : "outline"} 
                            className="text-xs"
                          >
                            {classification.interviews.length}개 인터뷰
                          </Badge>
                          {classification.interviews.length > 0 && (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* 미분류 섹션 */}
              {unclassifiedInterviews.length > 0 && (
                <div
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedPersonaId === 'unclassified'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-amber-200 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                  onClick={() => setSelectedPersonaId('unclassified')}
                >
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-amber-700" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">미분류 인터뷰</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                        {unclassifiedInterviews.length}개 대기중
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

                  {/* 빈 상태 */}
                  {!personasLoading && classifications.length === 0 && unclassifiedInterviews.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm text-gray-500">페르소나가 없습니다</p>
                    </div>
                  )}
            </div>
          </div>

          {/* 오른쪽: 선택된 페르소나의 인터뷰 목록 */}
          <div className="flex-1 overflow-hidden">
            {selectedPersonaId === 'unclassified' ? (
              <div className="h-full">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">미분류 인터뷰</h3>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                    {unclassifiedInterviews.length}개
                  </Badge>
                </div>
                
                <div className="h-full overflow-y-auto">
                  <div className="space-y-3">
                    {unclassifiedInterviews.map((interview) => (
                      <div key={interview.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {interview.interviewee_fake_name || `인터뷰 ${interview.user_type}`}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {new Date(interview.session_date).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline"
                          className={`${
                            interview.persona_id ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {interview.persona_id ? '반영대기' : '미분류'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : selectedClassification ? (
              <div className="h-full">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedClassification.thumbnail || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 text-blue-700">
                      {selectedClassification.persona_type.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedClassification.persona_title || selectedClassification.persona_type}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {selectedInterviews.length}개 인터뷰 반영완료
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="h-full overflow-y-auto">
                  {selectedInterviews.length > 0 ? (
                    <div className="space-y-3">
                      {selectedInterviews.map((interview) => (
                        <div key={interview.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {interview.interviewee_fake_name || `인터뷰 ${interview.user_type}`}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {new Date(interview.session_date).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            반영완료
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <User className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-sm">이 페르소나에 반영된 인터뷰가 없습니다</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>페르소나를 선택해주세요</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}