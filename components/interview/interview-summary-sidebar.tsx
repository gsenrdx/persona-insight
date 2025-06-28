'use client'

import { Interview } from '@/types/interview'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Calendar, User, Star } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface InterviewSummarySidebarProps {
  interview: Interview
}

export default function InterviewSummarySidebar({ interview }: InterviewSummarySidebarProps) {
  return (
    <aside className="w-80 bg-white border-r border-gray-200 flex flex-col h-full sticky top-0 self-start">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">인터뷰 요약</h3>
        <p className="text-xs text-gray-500">Interview Summary</p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* 세션 정보 */}
          {interview?.session_info?.[0] && (
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                세션 정보
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">인터뷰 날짜</p>
                  <p className="text-sm font-medium text-gray-900">
                    {interview.session_info[0].session_date 
                      ? format(new Date(interview.session_info[0].session_date), 'yyyy년 M월 d일', { locale: ko })
                      : '날짜 정보 없음'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">인터뷰 주제</p>
                  <p className="text-sm font-medium text-gray-900">
                    {interview.session_info[0].interview_topic || '주제 정보 없음'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 인터뷰 대상자 프로필 */}
          {interview?.interviewee_profile?.[0] && (
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                인터뷰 대상자 프로필
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">프로필 요약</p>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {interview.interviewee_profile[0].profile_summary}
                  </p>
                </div>
                
                {interview.interviewee_profile[0].demographics && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">연령대</span>
                      <span className="text-xs font-medium text-gray-900">
                        {interview.interviewee_profile[0].demographics.age_group}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">성별</span>
                      <span className="text-xs font-medium text-gray-900">
                        {interview.interviewee_profile[0].demographics.gender}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">직업/상황</p>
                      <p className="text-xs font-medium text-gray-900">
                        {interview.interviewee_profile[0].demographics.occupation_context}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 인터뷰 품질 평가 */}
          {interview?.interview_quality_assessment?.[0]?.overall_quality && (
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Star className="w-3.5 h-3.5" />
                인터뷰 품질 평가
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "w-3.5 h-3.5",
                          star <= (interview.interview_quality_assessment[0].overall_quality.score || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {interview.interview_quality_assessment[0].overall_quality.score}/5
                  </Badge>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-1">평가 내용</p>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {interview.interview_quality_assessment[0].overall_quality.assessment}
                  </p>
                </div>
              </div>
            </div>
          )}


          {/* 페르소나 정보 */}
          {interview?.persona && (
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">연결된 페르소나</h4>
              <Badge variant="secondary" className="text-xs">
                {interview.persona.persona_title || interview.persona.persona_type}
              </Badge>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}