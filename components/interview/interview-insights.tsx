'use client'

import { useState } from 'react'
import { Interview, InsightItem } from '@/types/interview'
import { ScrollArea } from '@/components/ui/scroll-area'
import InterviewSummarySidebar from './interview-summary-sidebar'
import { Lightbulb, AlertCircle, Target, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InterviewInsightsProps {
  interview: Interview
  onEvidenceClick?: (scriptIds: number[]) => void
}

export default function InterviewInsights({ interview, onEvidenceClick }: InterviewInsightsProps) {
  const { key_takeaways, primary_pain_points, primary_needs, hmw_questions } = interview
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const handleEvidenceClick = (evidence: number[]) => {
    if (onEvidenceClick) {
      onEvidenceClick(evidence)
    }
  }

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
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
    const itemId = `${type}-${index}`
    const isExpanded = expandedItems.has(itemId)
    
    return (
      <div 
        key={itemId}
        className="group"
      >
        <div 
          className="py-3 cursor-pointer hover:bg-gray-50/50 rounded-lg transition-all px-3 -mx-3"
          onClick={() => toggleExpanded(itemId)}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-gray-700 leading-relaxed flex-1">
              {item.description}
            </p>
            {evidenceSentences.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
                <span>{evidenceSentences.length}</span>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            )}
          </div>
        </div>
        
        {/* 근거 문장들 - 토글 가능 */}
        {evidenceSentences.length > 0 && isExpanded && (
          <div className="ml-4 mt-2 space-y-3">
            {evidenceSentences.map((sentence, idx) => (
              <div 
                key={`evidence-${idx}`}
                className={cn(
                  "relative pl-4 before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full",
                  sentence.speaker === 'question' 
                    ? "before:bg-blue-400" 
                    : "before:bg-gray-300"
                )}
              >
                <blockquote className="text-sm text-gray-600 leading-relaxed">
                  {sentence.speaker === 'question' && (
                    <span className="text-gray-500 font-medium mr-1.5">Q.</span>
                  )}
                  "{sentence.cleaned_sentence}"
                </blockquote>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-auto">
      {/* 왼쪽 사이드바 - 인터뷰 요약 */}
      <InterviewSummarySidebar interview={interview} />
      
      {/* 오른쪽 인사이트 영역 */}
      <div className="flex-1 bg-white">
          <div className="max-w-4xl mx-auto px-8 py-8">
            {/* 핵심 시사점 - 1단 구조 */}
            <div className="mb-10">
              <div className="flex items-center gap-2.5 mb-5">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-900">핵심 시사점</h3>
              </div>
              {key_takeaways && key_takeaways.length > 0 ? (
                <div className="space-y-3">
                  {key_takeaways.map((takeaway, index) => (
                    <p key={index} className="text-sm text-gray-700 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400">
                      {takeaway}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">분석된 시사점이 없습니다</p>
              )}
            </div>

            {/* 하단 2단 구조 - Pain Points와 Needs */}
            <div className="grid grid-cols-2 gap-10 pt-10 border-t border-gray-200">
              {/* Pain Points */}
              <div>
                <div className="flex items-center gap-2.5 mb-5">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h3 className="text-lg font-semibold text-gray-900">주요 문제점</h3>
                  <span className="text-xs text-gray-500 font-normal ml-1">Pain Points</span>
                </div>
                {primary_pain_points && primary_pain_points.length > 0 ? (
                  <div className="space-y-4">
                    {primary_pain_points.map((painPoint, index) => 
                      renderInsightItem(painPoint, 'pain', index)
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">분석된 문제점이 없습니다</p>
                )}
              </div>

              {/* Needs */}
              <div>
                <div className="flex items-center gap-2.5 mb-5">
                  <Target className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900">주요 니즈</h3>
                  <span className="text-xs text-gray-500 font-normal ml-1">Needs</span>
                </div>
                {primary_needs && primary_needs.length > 0 ? (
                  <div className="space-y-4">
                    {primary_needs.map((need, index) => 
                      renderInsightItem(need, 'need', index)
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">분석된 니즈가 없습니다</p>
                )}
              </div>
            </div>

            {/* 모든 데이터가 없는 경우 */}
            {(!key_takeaways || key_takeaways.length === 0) && 
             (!primary_pain_points || primary_pain_points.length === 0) && 
             (!primary_needs || primary_needs.length === 0) && (
              <div className="col-span-2 text-center py-24">
                <p className="text-gray-500 text-base">
                  아직 분석된 인사이트가 없습니다.
                </p>
              </div>
            )}
          </div>
      </div>
    </div>
  )
}