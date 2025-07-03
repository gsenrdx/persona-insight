'use client'

import { Interview } from '@/types/interview'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, User, Star, Info } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface InterviewSummaryProps {
  interview: Interview
}

export default function InterviewSummary({ interview }: InterviewSummaryProps) {
  const { session_info, interviewee_profile, interview_quality_assessment } = interview

  const sessionInfo = session_info?.[0]
  const profile = interviewee_profile?.[0]
  const qualityAssessment = interview_quality_assessment?.[0]

  return (
    <div className="p-6 space-y-6">
      {/* 세션 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-gray-600" />
            세션 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">인터뷰 날짜</p>
            <p className="text-base font-medium">
              {interview.interview_date ? 
                format(new Date(interview.interview_date), 'yyyy년 M월 d일', { locale: ko }) :
                '날짜 정보 없음'
              }
            </p>
          </div>
          {sessionInfo && (
            <div>
              <p className="text-sm text-gray-500">인터뷰 주제</p>
              <p className="text-base font-medium">{sessionInfo.interview_topic || '주제 정보 없음'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 인터뷰 대상자 프로필 */}
      {profile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-gray-600" />
              인터뷰 대상자 프로필
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">프로필 요약</p>
              <p className="text-base">{profile.profile_summary}</p>
            </div>
            
            {profile.demographics && (
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div>
                  <p className="text-sm text-gray-500">연령대</p>
                  <p className="text-sm font-medium">{profile.demographics.age_group}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">성별</p>
                  <p className="text-sm font-medium">{profile.demographics.gender}</p>
                </div>
                <div className="col-span-3">
                  <p className="text-sm text-gray-500">직업/상황</p>
                  <p className="text-sm font-medium">{profile.demographics.occupation_context}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 인터뷰 품질 평가 */}
      {qualityAssessment && qualityAssessment.overall_quality && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="w-5 h-5 text-yellow-600" />
              인터뷰 품질 평가
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "w-5 h-5",
                      star <= qualityAssessment.overall_quality.score
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    )}
                  />
                ))}
              </div>
              <Badge variant="secondary">
                {qualityAssessment.overall_quality.score}/5
              </Badge>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">평가 내용</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {qualityAssessment.overall_quality.assessment}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 데이터가 없는 경우 */}
      {!sessionInfo && !profile && !qualityAssessment && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Info className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">
                인터뷰 요약 정보가 없습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}