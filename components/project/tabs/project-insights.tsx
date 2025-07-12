'use client'

import { useState } from 'react'
import { useInterviews } from '@/hooks/use-interviews'
import { useProjectSummary } from '@/hooks/use-project-summary'
import { Button } from '@/components/ui/button'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface Project {
  id: string
  name: string
  description: string
  company_id: string
}

interface ProjectInsightsProps {
  project: Project
  onInsightsChange?: (sections: any[] | null, activeSection: number | null, scrollToSection: ((sectionIndex: number) => void) | null) => void
}

export default function ProjectInsights({ project }: ProjectInsightsProps) {
  // 인터뷰 데이터 가져오기
  const { interviews, isLoading, totalCount } = useInterviews({
    projectId: project.id,
    enabled: true
  })

  // 프로젝트 요약 데이터 가져오기
  const { 
    summary, 
    isLoading: summaryLoading, 
    hasNewInterviews, 
    newInterviewsCount, 
    generateSummary, 
    isGenerating 
  } = useProjectSummary(project.id)

  // keytakeaways 수 계산 (중복 제거된 전체 인사이트 카드 수, 삭제된 인터뷰 제외)
  const keytakeawaysCount = (() => {
    const uniqueInsights = new Set<string>()
    interviews.forEach(interview => {
      // 삭제된 인터뷰 제외
      if (!interview.deleted_at && interview.key_takeaways && Array.isArray(interview.key_takeaways)) {
        interview.key_takeaways.forEach(takeaway => {
          uniqueInsights.add(takeaway)
        })
      }
    })
    return uniqueInsights.size
  })()

  // 전체 보기 상태
  const [showAll, setShowAll] = useState(false)

  // keytakeaways 데이터 처리
  const processedInsights = (() => {
    const insightMap = new Map<string, {
      content: string
      mentionCount: number
      interviewCount: number
      interviewIds: Set<string>
    }>()

    interviews.forEach(interview => {
      // 삭제된 인터뷰 제외
      if (!interview.deleted_at && interview.key_takeaways && Array.isArray(interview.key_takeaways)) {
        interview.key_takeaways.forEach(takeaway => {
          if (insightMap.has(takeaway)) {
            const existing = insightMap.get(takeaway)!
            existing.mentionCount += 1
            existing.interviewIds.add(interview.id)
            existing.interviewCount = existing.interviewIds.size
          } else {
            insightMap.set(takeaway, {
              content: takeaway,
              mentionCount: 1,
              interviewCount: 1,
              interviewIds: new Set([interview.id])
            })
          }
        })
      }
    })

    return Array.from(insightMap.values()).sort((a, b) => b.mentionCount - a.mentionCount)
  })()

  // 표시할 인사이트 수 결정
  const displayedInsights = showAll ? processedInsights : processedInsights.slice(0, 6)

  // 섹션별 페인포인트와 니즈 매핑 데이터 처리
  const sectionBasedData = (() => {
    const sectionMap = new Map<string, {
      sectionName: string
      koreanName: string
      painPoints: string[]
      needs: string[]
      interviewIds: Set<string>
      totalItems: number
    }>()

    // 각 인터뷰별로 처리 (삭제된 인터뷰 제외)
    interviews.forEach(interview => {
      // 삭제된 인터뷰 제외
      if (interview.deleted_at) return
      
      const scriptSections = interview.script_sections || []
      
      // 페인포인트 처리
      interview.primary_pain_points?.forEach(painPoint => {
        const section = findSectionForEvidence(painPoint.evidence, scriptSections)
        if (section) {
          const koreanName = translateSectionName(section.sector_name)
          const key = section.sector_name
          
          if (sectionMap.has(key)) {
            const existing = sectionMap.get(key)!
            existing.painPoints.push(painPoint.description)
            existing.interviewIds.add(interview.id)
            existing.totalItems += 1
          } else {
            sectionMap.set(key, {
              sectionName: section.sector_name,
              koreanName,
              painPoints: [painPoint.description],
              needs: [],
              interviewIds: new Set([interview.id]),
              totalItems: 1
            })
          }
        }
      })

      // 니즈 처리
      interview.primary_needs?.forEach(need => {
        const section = findSectionForEvidence(need.evidence, scriptSections)
        if (section) {
          const koreanName = translateSectionName(section.sector_name)
          const key = section.sector_name
          
          if (sectionMap.has(key)) {
            const existing = sectionMap.get(key)!
            existing.needs.push(need.description)
            existing.interviewIds.add(interview.id)
            existing.totalItems += 1
          } else {
            sectionMap.set(key, {
              sectionName: section.sector_name,
              koreanName,
              painPoints: [],
              needs: [need.description],
              interviewIds: new Set([interview.id]),
              totalItems: 1
            })
          }
        }
      })
    })

    const totalInterviews = interviews.filter(interview => !interview.deleted_at).length
    return Array.from(sectionMap.entries())
      .map(([_, data]) => ({
        sectionName: data.sectionName,
        koreanName: data.koreanName,
        painPoints: data.painPoints,
        needs: data.needs,
        totalItems: data.totalItems,
        percentage: totalInterviews > 0 ? Math.round((data.interviewIds.size / totalInterviews) * 100) : 0,
        interviewCount: data.interviewIds.size
      }))
      .sort((a, b) => b.percentage - a.percentage)
  })()

  // evidence id가 어떤 섹션에 속하는지 찾는 함수
  function findSectionForEvidence(evidence: number[], scriptSections: any[]): any | null {
    if (!evidence || evidence.length === 0 || !scriptSections) return null
    
    for (const section of scriptSections) {
      for (const evidenceId of evidence) {
        if (evidenceId >= section.start_line && evidenceId <= section.end_line) {
          return section
        }
      }
    }
    return null
  }

  // 섹션명을 한글로 번역하는 함수
  function translateSectionName(sectionName: string): string {
    const translations: { [key: string]: string } = {
      'introduction': '도입부',
      'background': '배경 설명',
      'current_state': '현재 상황',
      'challenges': '도전과제',
      'pain_points': '어려움',
      'needs': '필요사항',
      'solutions': '해결방안',
      'expectations': '기대사항',
      'conclusion': '마무리',
      'demographics': '인구통계',
      'experience': '경험',
      'workflow': '업무 프로세스',
      'tools': '도구 사용',
      'collaboration': '협업',
      'feedback': '피드백',
      'future': '미래 전망'
    }
    
    return translations[sectionName.toLowerCase()] || sectionName
  }

  // 선택된 섹션 상태
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  
  // 선택된 인사이트 항목 상태 (인용구 보기용)
  const [selectedInsight, setSelectedInsight] = useState<{
    type: 'painPoint' | 'need'
    content: string
    evidence: number[]
    sectionName: string
  } | null>(null)
  
  // 선택된 페르소나 상태 (파이차트 클릭용)
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null)

  // evidence ID로 실제 스크립트 문장 찾기
  function getQuotesFromEvidence(evidence: number[], interviewId: string): string[] {
    const interview = interviews.find(i => i.id === interviewId)
    if (!interview?.cleaned_script) return []
    
    return evidence
      .map(evidenceId => {
        const scriptItem = interview.cleaned_script?.find(item => 
          Array.isArray(item.id) ? item.id.includes(evidenceId) : item.id === evidenceId
        )
        return scriptItem?.cleaned_sentence || null
      })
      .filter(Boolean) as string[]
  }

  // 선택된 인사이트의 모든 인용구 수집
  const selectedInsightQuotes = selectedInsight ? (() => {
    const quotes: { interviewId: string, quotes: string[] }[] = []
    
    interviews.forEach(interview => {
      const relevantItems = selectedInsight.type === 'painPoint' 
        ? interview.primary_pain_points?.filter(pp => pp.description === selectedInsight.content) || []
        : interview.primary_needs?.filter(need => need.description === selectedInsight.content) || []
      
      relevantItems.forEach(item => {
        const interviewQuotes = getQuotesFromEvidence(item.evidence, interview.id)
        if (interviewQuotes.length > 0) {
          quotes.push({
            interviewId: interview.id,
            quotes: interviewQuotes
          })
        }
      })
    })
    
    return quotes
  })() : []

  // AI 페르소나 매칭 데이터 처리
  const personaDistributionData = (() => {
    const personaCount = new Map<string, number>()
    
    interviews.forEach(interview => {
      // 확정된 페르소나가 있으면 우선 사용, 없으면 AI 매칭 결과 사용
      const personaDefinition = interview.confirmed_persona_definition || interview.ai_persona_definition
      
      if (personaDefinition?.name_ko) {
        const personaName = personaDefinition.name_ko
        const currentCount = personaCount.get(personaName) || 0
        personaCount.set(personaName, currentCount + 1)
      }
    })
    
    // 차트 데이터 형식으로 변환하고 색상 할당
    const colorPalette = [
      '#3b82f6', // blue
      '#10b981', // emerald
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // purple
      '#14b8a6', // teal
      '#ec4899', // pink
      '#6366f1', // indigo
      '#84cc16', // lime
      '#f97316', // orange
    ]
    
    const chartData = Array.from(personaCount.entries()).map(([persona, count], index) => ({
      name: persona,
      value: count,
      percentage: interviews.length > 0 ? Math.round((count / interviews.length) * 100) : 0,
      color: colorPalette[index % colorPalette.length]
    }))
    
    return chartData.sort((a, b) => b.value - a.value)
  })()

  // 선택된 페르소나에 해당하는 인터뷰 필터링
  const filteredInterviewsByPersona = selectedPersona ? (() => {
    return interviews.filter(interview => {
      const personaDefinition = interview.confirmed_persona_definition || interview.ai_persona_definition
      return personaDefinition?.name_ko === selectedPersona
    })
  })() : []
  // 인터뷰 데이터가 로딩 중일 때 전체 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <img 
            src="/assets/pin/pin-processing.png" 
            alt="Processing" 
            className="w-32 h-32 object-contain mx-auto mb-4"
          />
          <p className="text-gray-600 font-medium">인사이트를 분석하고 있어요</p>
          <p className="text-sm text-gray-500 mt-1">잠시만 기다려주세요...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="relative bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 rounded-2xl p-6 overflow-hidden">
            {/* 메인 콘텐츠 */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-8">
                {/* Pin 캐릭터 */}
                <div className="w-24 h-24 flex-shrink-0">
                  <img 
                    src="/assets/pin/pin-insight.png" 
                    alt="Pin character with insights"
                    className="w-full h-full object-contain drop-shadow-lg"
                  />
                </div>
                
                {/* 텍스트 콘텐츠 */}
                <div>
                  <div className="flex items-baseline gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {!isLoading && totalCount > 0 && keytakeawaysCount > 0 ? (
                        <>
                          <span className="text-3xl text-blue-600">{totalCount}개</span>의 인터뷰에서 <span className="text-3xl text-blue-600">{keytakeawaysCount}개</span>의 인사이트를 얻었어요!
                        </>
                      ) : !isLoading && totalCount === 0 ? (
                        '아직 분석할 인터뷰가 없어요'
                      ) : !isLoading && keytakeawaysCount === 0 ? (
                        '인터뷰 분석을 기다리고 있어요'
                      ) : (
                        '인사이트 분석 중'
                      )}
                    </h2>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    {!isLoading && totalCount > 0 && keytakeawaysCount > 0 ? (
                      '고객의 소중한 이야기에서 의미있는 패턴과 통찰을 발견했어요'
                    ) : !isLoading && totalCount === 0 ? (
                      '새로운 인터뷰를 추가하고 분석 결과를 확인해보세요'
                    ) : !isLoading && keytakeawaysCount === 0 ? (
                      '인터뷰 분석이 완료되면 인사이트를 확인할 수 있어요'
                    ) : (
                      '데이터를 불러오고 있습니다...'
                    )}
                  </p>
                </div>
              </div>
              
              {/* 요약 생성/업데이트 버튼 */}
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  {hasNewInterviews && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                      새 인터뷰 {newInterviewsCount}개
                    </span>
                  )}
                  {summary ? (
                    <Button
                      onClick={() => generateSummary()}
                      disabled={isGenerating || !hasNewInterviews}
                      variant="outline"
                      size="sm"
                    >
                      {isGenerating ? '분석 중...' : hasNewInterviews ? '재분석' : '업데이트'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => generateSummary()}
                      disabled={isGenerating || totalCount === 0}
                      variant="outline"
                      size="sm"
                    >
                      {isGenerating ? '생성 중...' : '요약 생성'}
                    </Button>
                  )}
                </div>
                {summary && (
                  <div className="text-xs text-gray-500">
                    Pin이 {summary.interview_count_at_creation}개 인터뷰를 모두 확인했어요!
                  </div>
                )}
              </div>
            </div>
            
            {/* 장식용 배경 요소 */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-200/25 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-200/25 rounded-full blur-2xl" />
          </div>
        </div>
        
        {/* 프로젝트 전체 요약 */}
        <div className="mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-3"></div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">프로젝트 전체 요약</h3>
                <div className="text-gray-700 leading-relaxed">
                  {summaryLoading ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                      <span>요약을 불러오는 중...</span>
                    </div>
                  ) : summary ? (
                    <p>{summary.summary_text}</p>
                  ) : totalCount === 0 ? (
                    <p className="text-gray-500">분석할 인터뷰가 없습니다. 인터뷰를 추가해주세요.</p>
                  ) : (
                    <p className="text-gray-500">
                      프로젝트 요약을 생성하려면 &ldquo;요약 생성&rdquo; 버튼을 클릭하세요.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 전체 인사이트 섹션 */}
        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">전체 인사이트</h3>
            {processedInsights.length > 6 && (
              <Button
                variant="outline"
                onClick={() => setShowAll(!showAll)}
                className="text-sm"
              >
                {showAll ? '접기' : `전체 보기 (${processedInsights.length}개)`}
              </Button>
            )}
          </div>

          {/* 인사이트 카드 그리드 */}
          {processedInsights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedInsights.map((insight, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow h-32 flex flex-col"
                >
                  <div className="flex-1 mb-3">
                    <p className="text-gray-800 text-sm leading-relaxed line-clamp-3">
                      {insight.content}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap mt-auto">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {insight.interviewCount}개 인터뷰
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      {insight.mentionCount}번 언급
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>아직 분석된 인사이트가 없습니다.</p>
              <p className="text-sm mt-1">인터뷰가 분석되면 여기에 인사이트가 표시됩니다.</p>
            </div>
          )}
        </div>

        {/* 섹션별 페인포인트 & 니즈 매핑 */}
        {sectionBasedData.length > 0 && (
          <div className="mt-12 space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">토픽 별 인사이트</h3>
            
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="grid grid-cols-2 h-96">
                {/* 좌측: 수평 막대 그래프 */}
                <div className="p-4 overflow-y-auto">
                  <div className="space-y-4">
                    {sectionBasedData.map((item) => (
                      <div
                        key={item.sectionName}
                        className={`group cursor-pointer transition-all duration-200 p-3 rounded-lg ${
                          selectedSection === item.sectionName 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          setSelectedSection(item.sectionName)
                          setSelectedInsight(null) // 디테일 페이지에서 나가기
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {item.koreanName}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="font-semibold">{item.percentage}%</span>
                            <span className="text-gray-400">({item.totalItems}개)</span>
                          </div>
                        </div>
                        
                        {/* 수평 막대 */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              selectedSection === item.sectionName
                                ? 'bg-blue-600'
                                : 'bg-blue-400 group-hover:bg-blue-500'
                            }`}
                            style={{
                              width: `${item.percentage}%`,
                              minWidth: '8px'
                            }}
                          />
                        </div>
                        
                        {/* 페인포인트/니즈 개수 표시 */}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {item.painPoints.length > 0 && (
                            <span className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                              페인포인트 {item.painPoints.length}
                            </span>
                          )}
                          {item.needs.length > 0 && (
                            <span className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                              니즈 {item.needs.length}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {sectionBasedData.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">섹션별 데이터를 찾을 수 없습니다.</p>
                      <p className="text-xs mt-1">인터뷰 스크립트가 섹션화되면 여기에 표시됩니다.</p>
                    </div>
                  )}
                </div>

                {/* 우측: 상세 내용 영역 */}
                <div className="border-l border-gray-100 bg-gray-50/50 p-5 overflow-y-auto">
                  {selectedInsight ? (
                    /* 인사이트 상세 페이지 */
                    <div className="h-full">
                      {/* 헤더 */}
                      <div className="flex items-center gap-3 mb-5">
                        <button
                          onClick={() => setSelectedInsight(null)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${selectedInsight.type === 'painPoint' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                            <span className="text-xs text-gray-500">
                              {selectedInsight.type === 'painPoint' ? '페인포인트' : '니즈'}
                            </span>
                          </div>
                          <h4 className="text-base font-semibold text-gray-900 leading-snug">
                            {selectedInsight.content}
                          </h4>
                        </div>
                      </div>
                      
                      {/* 인용구 컨텐츠 */}
                      <div>
                        {selectedInsightQuotes.length > 0 ? (
                          <div className="space-y-3">
                            <div className="text-xs font-medium text-gray-600 mb-3">
                              인용구 {selectedInsightQuotes.reduce((acc, item) => acc + item.quotes.length, 0)}개
                            </div>
                            {selectedInsightQuotes.map((item, interviewIdx) => {
                              const interview = interviews.find(i => i.id === item.interviewId)
                              return (
                                <div key={interviewIdx} className="space-y-2">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs text-gray-600 font-medium">
                                      {interview?.title || `인터뷰 #${item.interviewId.slice(-4)}`}
                                    </div>
                                    <button
                                      onClick={() => {
                                        window.open(`/projects/${project.id}?interview=${item.interviewId}`, '_blank')
                                      }}
                                      className="text-xs text-blue-500 hover:text-blue-600 hover:underline transition-colors flex items-center gap-1"
                                    >
                                      바로가기
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </button>
                                  </div>
                                  {item.quotes.map((quote, quoteIdx) => (
                                    <div key={quoteIdx} className="bg-gray-50 p-3 rounded-lg">
                                      <p className="text-sm text-gray-700 leading-relaxed">
                                        &ldquo;{quote}&rdquo;
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="text-gray-300 mb-2">
                              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </div>
                            <p className="text-sm text-gray-400">
                              인용구를 찾을 수 없습니다
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : selectedSection ? (
                    /* 섹션 상세 페이지 */
                    <div className="h-full">
                      {/* 헤더 */}
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 leading-tight">
                            {sectionBasedData.find(item => item.sectionName === selectedSection)?.koreanName}
                          </h4>
                          <div className="mt-2 text-xs text-gray-500">
                            {(() => {
                              const sectionData = sectionBasedData.find(item => item.sectionName === selectedSection)
                              return sectionData ? `${sectionData.interviewCount}명 참여 • ${sectionData.totalItems}개 이슈` : ''
                            })()}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedSection(null)}
                          className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* 컨텐츠 */}
                      <div className="space-y-5">
                        {(() => {
                          const sectionData = sectionBasedData.find(
                            item => item.sectionName === selectedSection
                          )
                          if (!sectionData) return null
                          
                          return (
                            <>
                              {/* 페인포인트 */}
                              {sectionData.painPoints.length > 0 && (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <h5 className="text-sm font-medium text-gray-900">
                                      페인포인트
                                    </h5>
                                    <span className="text-xs text-gray-500 bg-red-50 px-2 py-0.5 rounded-full">
                                      {sectionData.painPoints.length}개
                                    </span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {sectionData.painPoints.map((painPoint, idx) => (
                                      <div 
                                        key={idx} 
                                        className="p-2.5 rounded-lg text-xs text-gray-700 leading-relaxed cursor-pointer hover:bg-red-50 transition-colors group"
                                        onClick={() => setSelectedInsight({
                                          type: 'painPoint',
                                          content: painPoint,
                                          evidence: [],
                                          sectionName: selectedSection!
                                        })}
                                      >
                                        <div className="flex items-start justify-between">
                                          <span className="flex-1">{painPoint}</span>
                                          <svg className="w-3 h-3 text-gray-300 group-hover:text-gray-400 ml-2 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* 니즈 */}
                              {sectionData.needs.length > 0 && (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <h5 className="text-sm font-medium text-gray-900">
                                      니즈
                                    </h5>
                                    <span className="text-xs text-gray-500 bg-blue-50 px-2 py-0.5 rounded-full">
                                      {sectionData.needs.length}개
                                    </span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {sectionData.needs.map((need, idx) => (
                                      <div 
                                        key={idx} 
                                        className="p-2.5 rounded-lg text-xs text-gray-700 leading-relaxed cursor-pointer hover:bg-blue-50 transition-colors group"
                                        onClick={() => setSelectedInsight({
                                          type: 'need',
                                          content: need,
                                          evidence: [],
                                          sectionName: selectedSection!
                                        })}
                                      >
                                        <div className="flex items-start justify-between">
                                          <span className="flex-1">{need}</span>
                                          <svg className="w-3 h-3 text-gray-300 group-hover:text-gray-400 ml-2 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* 데이터가 없는 경우 */}
                              {sectionData.painPoints.length === 0 && sectionData.needs.length === 0 && (
                                <div className="text-center py-8">
                                  <div className="text-gray-400 mb-2">
                                    <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                  </div>
                                  <p className="text-sm text-gray-500">이 섹션에는 아직 분석된 이슈가 없습니다</p>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  ) : (
                    /* 초기 상태 */
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <h4 className="text-sm font-medium text-gray-900 mb-1">섹션을 선택하세요</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          좌측에서 섹션을 클릭하면<br/>
                          페인포인트와 니즈를 확인할 수 있습니다
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI 페르소나 분류 분포 */}
        {personaDistributionData.length > 0 && (
          <div className="mt-12 space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">페르소나 분류 분포</h3>
            
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 파이 차트 */}
                <div className="flex flex-col items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={personaDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percentage }) => `${percentage}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        onClick={(data: any) => {
                          setSelectedPersona(data.name)
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {personaDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [`${value}명`, name]}
                        contentStyle={{ 
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          padding: '0.5rem'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* 범례 */}
                  <div className="mt-6 flex flex-wrap gap-4 justify-center">
                    {personaDistributionData.map((persona) => (
                      <div 
                        key={persona.name} 
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedPersona(persona.name)}
                      >
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: persona.color }}
                        />
                        <span className="text-sm text-gray-700">{persona.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 통계 정보 또는 선택된 페르소나의 인터뷰 리스트 */}
                <div className="space-y-4 h-[400px] overflow-hidden flex flex-col">
                  {selectedPersona ? (
                    /* 선택된 페르소나의 인터뷰 리스트 */
                    <div className="flex flex-col h-full">
                      {/* 헤더 */}
                      <div className="flex items-center justify-between mb-4 flex-shrink-0">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{selectedPersona}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {filteredInterviewsByPersona.length}개의 인터뷰
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedPersona(null)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* 인터뷰 리스트 */}
                      <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {filteredInterviewsByPersona.length > 0 ? (
                          filteredInterviewsByPersona.map((interview) => (
                            <div
                              key={interview.id}
                              className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                              onClick={() => {
                                window.open(`/projects/${project.id}?interview=${interview.id}`, '_blank')
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900 text-sm mb-1">
                                    {interview.title || `인터뷰 #${interview.id.slice(-4)}`}
                                  </h5>
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span>{new Date(interview.created_at).toLocaleDateString('ko-KR')}</span>
                                    {interview.interviewee_profile?.[0]?.demographics?.age_group && (
                                      <span>{interview.interviewee_profile[0].demographics.age_group}</span>
                                    )}
                                    {interview.interviewee_profile?.[0]?.demographics?.gender && (
                                      <span>{interview.interviewee_profile[0].demographics.gender}</span>
                                    )}
                                  </div>
                                  {interview.key_takeaways && interview.key_takeaways.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-xs text-gray-600 line-clamp-2">
                                        {interview.key_takeaways[0]}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-sm text-gray-500">
                              해당 페르소나의 인터뷰가 없습니다.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* 기본 통계 정보 */
                    <div className="flex flex-col h-full">
                      <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        <h4 className="text-sm font-medium text-gray-900 mb-4">상세 분포</h4>
                        {personaDistributionData.map((persona) => (
                          <div 
                            key={persona.name} 
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => setSelectedPersona(persona.name)}
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: persona.color }}
                              />
                              <div>
                                <p className="font-medium text-gray-900">{persona.name}</p>
                                <p className="text-xs text-gray-500">{persona.value}명의 인터뷰</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-gray-900">{persona.percentage}%</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 요약 정보 */}
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg flex-shrink-0">
                        <p className="text-sm text-blue-900">
                          <span className="font-semibold">가장 많은 페르소나:</span> {personaDistributionData[0]?.name} ({personaDistributionData[0]?.percentage}%)
                        </p>
                        {personaDistributionData.length > 1 && (
                          <p className="text-sm text-blue-700 mt-1">
                            총 {personaDistributionData.length}개의 페르소나 유형이 발견되었습니다.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}