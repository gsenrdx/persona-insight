"use client"

import { Suspense, useState, useEffect, use } from "react"
import { ChatInterface } from "@/components/chat"
import { fetchPersonas } from "@/lib/data/persona-data"
import { notFound } from "next/navigation"
import Link from "next/link"
import PersonaSelector from "@/components/persona/persona-selector"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { usePersonaInterviewData } from "@/hooks/use-persona-interview-data"
import { usePersonaClassification } from "@/hooks/use-persona-classification"

interface PersonaForPage {
  id: string;
  name: string;
  image?: string;
  keywords?: string[];
  insight?: string;
  summary?: string;
  painPoint?: string;
  hiddenNeeds?: string;
  persona_character?: string;
  // Chat API에서 필요한 추가 필드들
  persona_title?: string;
  persona_summary?: string;
  persona_style?: string;
  painpoints?: string;
  needs?: string;
  insight_quote?: string;
}

interface ChatPageProps {
  params: Promise<{
    personaId: string
  }>
}

export default function ChatPage({ params }: ChatPageProps) {
  // params 객체 unwrap
  const unwrappedParams = use(params);
  const personaId = unwrappedParams.personaId;
  
  const { profile } = useAuth() // 사용자 프로필에서 company_id 가져오기
  const [persona, setPersona] = useState<PersonaForPage | null>(null)
  const [allPersonas, setAllPersonas] = useState<PersonaForPage[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // 인터뷰 데이터 조회
  const { data: interviewData, isLoading: isInterviewDataLoading } = usePersonaInterviewData(
    personaId,
    profile?.company_id || ''
  )
  
  // 분류 정보 조회
  const { data: classificationInfo, isLoading: isClassificationLoading } = usePersonaClassification(
    personaId,
    profile?.company_id || ''
  )

  useEffect(() => {
    let isSubscribed = true;
    
    const loadData = async () => {
      try {
        // 프로필이 아직 로드되지 않았으면 대기
        if (!profile?.company_id) {
          return;
        }

        // 전체 페르소나를 한 번만 가져오기
        const allPersonasData = await fetchPersonas(profile.company_id) as PersonaForPage[]
        
        // 컴포넌트가 언마운트되었으면 상태 업데이트 하지 않음
        if (!isSubscribed) return;
        
        // 가져온 데이터에서 현재 페르소나 찾기
        const personaData = allPersonasData.find(p => p.id === personaId) || null
        
        if (!personaData) {
          notFound()
        }
        
        setPersona(personaData)
        setAllPersonas(allPersonasData)
        setLoading(false)
      } catch (error) {
        if (isSubscribed) {
          // 데이터 로딩 오류
          notFound()
        }
      }
    }
    
    loadData()
    
    return () => {
      isSubscribed = false;
    }
  }, [personaId, profile?.company_id])
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  if (loading) {
    return (
      <div className="h-screen grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">페르소나 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!persona) return null

  return (
    <div className="relative flex flex-col h-[100dvh] overflow-hidden isolate">
      {/* 배경 효과 - 부드러운 그라데이션과 패턴 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none -z-20" />
      <div className="absolute top-0 -left-96 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl -z-20" />
      <div className="absolute bottom-0 -right-96 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl -z-20" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-secondary/5 blur-3xl -z-20" />
      
      {/* 모바일 헤더 - 메뉴 토글 버튼 포함 */}
      <div className="md:hidden flex items-center justify-between p-3 border-b border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link href="/" className="inline-flex">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1.5 text-zinc-800 font-medium hover:bg-zinc-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <PersonaSelector 
            currentPersona={persona} 
            allPersonas={allPersonas} 
            currentPersonaId={personaId}
          />
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar}
          className="h-8 w-8 md:hidden"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      
      {/* 콘텐츠 영역 - 최적화된 레이아웃 구조 */}
      <div className="flex flex-1 h-full overflow-hidden">
        {/* 사이드바 - 토스 스타일 깔끔한 디자인 */}
        <aside className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
          fixed md:relative md:w-80 lg:w-96 z-30 md:z-auto
          h-[calc(100dvh-57px)] md:h-full w-[85%] max-w-xs
          bg-gray-50/90 backdrop-blur-xl flex flex-col shadow-lg md:shadow-none
          border-r border-gray-200/60 
          overflow-hidden transition-all duration-300 ease-out
        `}>
          {/* 상단 헤더 - 뒤로가기 버튼과 페르소나 선택 */}
          <div className="hidden md:flex shrink-0 items-center gap-3 px-4 py-4 border-b border-gray-200/50 h-16 bg-white/60 backdrop-blur-sm">
            <Link href="/" className="inline-flex">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-700 font-medium hover:bg-gray-100 transition-all duration-200 rounded-lg h-9 px-3"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <PersonaSelector 
              currentPersona={persona} 
              allPersonas={allPersonas} 
              currentPersonaId={personaId}
            />
          </div>

          {/* 스크롤 가능한 정보 영역 - 토스 스타일 카드 디자인 */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent">
            <div className="p-4 space-y-4">
              
              {/* 페르소나 분류 정보 */}
              {classificationInfo && classificationInfo.length > 0 && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">분류</h3>
                    {isClassificationLoading && (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {classificationInfo.map((classification, index) => (
                      <div key={index} className="pb-3 border-b border-gray-50 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-500">{classification.classificationName}</span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            {classification.typeName}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {classification.typeDescription}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 핵심 인사이트 */}
              {((interviewData?.insights && interviewData.insights.length > 0) || persona.insight) && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">핵심 인사이트</h3>
                    {isInterviewDataLoading && (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    )}
                  </div>
                  {interviewData?.insights && interviewData.insights.length > 0 ? (
                    <div className="space-y-2">
                      {interviewData.insights.map((insight, index) => (
                        <div key={index} className="pb-2 border-b border-gray-50 last:border-b-0 last:pb-0">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {insight.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {persona.insight}
                    </p>
                  )}
                </div>
              )}

              {/* 주요 고민점 */}
              {((interviewData?.painPoints && interviewData.painPoints.length > 0) || persona.painpoints || persona.painPoint) && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">주요 고민점</h3>
                    {isInterviewDataLoading && (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    )}
                  </div>
                  {interviewData?.painPoints && interviewData.painPoints.length > 0 ? (
                    <div className="space-y-2">
                      {interviewData.painPoints.map((painPoint, index) => (
                        <div key={index} className="pb-2 border-b border-gray-50 last:border-b-0 last:pb-0">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {painPoint.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {persona.painpoints || persona.painPoint}
                    </p>
                  )}
                </div>
              )}

              {/* 핵심 니즈 */}
              {((interviewData?.needs && interviewData.needs.length > 0) || persona.needs || persona.hiddenNeeds) && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">핵심 니즈</h3>
                    {isInterviewDataLoading && (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    )}
                  </div>
                  {interviewData?.needs && interviewData.needs.length > 0 ? (
                    <div className="space-y-2">
                      {interviewData.needs.map((need, index) => (
                        <div key={index} className="pb-2 border-b border-gray-50 last:border-b-0 last:pb-0">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {need.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {persona.needs || persona.hiddenNeeds}
                    </p>
                  )}
                </div>
              )}

              {/* 키워드 */}
              {(persona.keywords || []).length > 0 && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">관련 키워드</h4>
                  <div className="flex flex-wrap gap-2">
                    {(persona.keywords || []).map((keyword, index) => (
                      <span 
                        key={index} 
                        className="px-2.5 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-xs font-medium border border-gray-100"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

        </aside>

        {/* 오버레이 - 모바일에서 사이드바 열릴 때 배경 어둡게 */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/30 z-20 md:hidden" 
            onClick={toggleSidebar}
            aria-hidden="true"
          />
        )}

        {/* 채팅 영역 - 최적화된 공간 활용 */}
        <main className="flex-1 flex flex-col bg-muted/5 min-w-0 relative">
          <Suspense fallback={
            <div className="h-full grid place-items-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground animate-pulse">대화 불러오는 중...</p>
              </div>
            </div>
          }>
            <ChatInterface personaId={personaId} personaData={persona} allPersonas={allPersonas} />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
