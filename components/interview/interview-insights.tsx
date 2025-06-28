'use client'

import { Interview, InsightItem } from '@/types/interview'
import { ScrollArea } from '@/components/ui/scroll-area'
import InterviewSummarySidebar from './interview-summary-sidebar'
import { Lightbulb, AlertCircle, HelpCircle, Target } from 'lucide-react'

interface InterviewInsightsProps {
  interview: Interview
  onEvidenceClick?: (scriptIds: number[]) => void
}

export default function InterviewInsights({ interview, onEvidenceClick }: InterviewInsightsProps) {
  const { key_takeaways, primary_pain_points, primary_needs, hmw_questions } = interview

  const handleEvidenceClick = (evidence: number[]) => {
    if (onEvidenceClick) {
      onEvidenceClick(evidence)
    }
  }

  // 근거 문장들을 가져오는 함수
  const getEvidenceSentences = (evidenceIds: number[]) => {
    if (!interview.cleaned_script) return []
    
    return interview.cleaned_script.filter(item => 
      evidenceIds.some(ids => 
        Array.isArray(item.id) && item.id.some(id => ids === id)
      )
    )
  }

  const renderInsightItem = (item: InsightItem, type: 'pain' | 'need', index: number) => {
    const evidenceSentences = getEvidenceSentences(item.evidence)
    
    return (
      <div 
        key={`${type}-${index}`}
        className="pl-4 py-2"
      >
        <p className="text-sm text-gray-800 leading-relaxed mb-2">
          {item.description}
        </p>
        
        {/* 근거 문장들 - 더 심플하게 */}
        {evidenceSentences.length > 0 && (
          <div className="space-y-1">
            {evidenceSentences.slice(0, 2).map((sentence, idx) => (
              <p 
                key={`evidence-${idx}`}
                className="text-xs text-gray-500 leading-relaxed pl-3 italic"
              >
                "{sentence.cleaned_sentence}"
              </p>
            ))}
            {evidenceSentences.length > 2 && (
              <button
                onClick={() => handleEvidenceClick(item.evidence)}
                className="text-xs text-gray-400 hover:text-gray-600 pl-3"
              >
                +{evidenceSentences.length - 2}개 더 보기
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full bg-gray-50 overflow-auto">
      {/* 왼쪽 사이드바 - 인터뷰 요약 */}
      <InterviewSummarySidebar interview={interview} />
      
      {/* 오른쪽 인사이트 영역 */}
      <div className="flex-1 bg-white">
        {/* 헤더 영역 */}
        <div className="border-b border-gray-100 px-8 py-3 bg-gray-50/50 sticky top-0 z-10">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">인사이트 분석</h3>
            <p className="text-xs text-gray-500 mt-0.5">Interview Insights</p>
          </div>
        </div>
          <div className="max-w-6xl mx-auto px-8 py-8">
            {/* 상단 2단 구조 - 핵심 시사점과 HMW */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* 핵심 시사점 */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-gray-900">핵심 시사점</h3>
                </div>
                {key_takeaways && key_takeaways.length > 0 ? (
                  <div className="space-y-2">
                    {key_takeaways.map((takeaway, index) => (
                      <p key={index} className="text-sm text-gray-800 leading-relaxed">
                        • {takeaway}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">분석된 시사점이 없습니다</p>
                )}
              </div>

              {/* HMW Questions */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <HelpCircle className="w-5 h-5 text-purple-500" />
                  <h3 className="text-base font-bold text-gray-900">How Might We...?</h3>
                </div>
                {hmw_questions && hmw_questions.length > 0 ? (
                  <div className="space-y-2">
                    {hmw_questions.map((hmw, index) => (
                      <p key={index} className="text-sm text-gray-800 leading-relaxed">
                        • {hmw.hmw_questions}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">HMW 질문이 없습니다</p>
                )}
              </div>
            </div>

            {/* 하단 2단 구조 - Pain Points와 Needs */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-100">
              {/* Pain Points */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h3 className="text-base font-bold text-gray-900">주요 문제점</h3>
                  <span className="text-xs text-gray-500 font-normal">Pain Points</span>
                </div>
                {primary_pain_points && primary_pain_points.length > 0 ? (
                  <div className="space-y-3">
                    {primary_pain_points.map((painPoint, index) => 
                      renderInsightItem(painPoint, 'pain', index)
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">분석된 문제점이 없습니다</p>
                )}
              </div>

              {/* Needs */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-blue-500" />
                  <h3 className="text-base font-bold text-gray-900">주요 니즈</h3>
                  <span className="text-xs text-gray-500 font-normal">Needs</span>
                </div>
                {primary_needs && primary_needs.length > 0 ? (
                  <div className="space-y-3">
                    {primary_needs.map((need, index) => 
                      renderInsightItem(need, 'need', index)
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">분석된 니즈가 없습니다</p>
                )}
              </div>
            </div>

            {/* 모든 데이터가 없는 경우 */}
            {(!key_takeaways || key_takeaways.length === 0) && 
             (!primary_pain_points || primary_pain_points.length === 0) && 
             (!primary_needs || primary_needs.length === 0) && 
             (!hmw_questions || hmw_questions.length === 0) && (
              <div className="col-span-2 text-center py-16">
                <p className="text-gray-500">
                  아직 분석된 인사이트가 없습니다.
                </p>
              </div>
            )}
          </div>
      </div>
    </div>
  )
}