'use client'

import { Interview } from '@/types/interview'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface InterviewInsightsProps {
  interview: Interview
}

export default function InterviewInsights({ interview }: InterviewInsightsProps) {
  const { key_takeaways } = interview

  return (
    <div className="h-full overflow-auto bg-white">
      <div className="w-full">
        
        {/* 인터뷰 정보 섹션 (품질 평가 + 프로필) */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white px-10 py-6"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">인터뷰 정보</h2>
          
          {/* 인터뷰 대상자 정보 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">인터뷰 대상자</h3>
            <p className="text-base text-gray-700 leading-relaxed mb-3">
              {interview.interviewee_profile?.[0]?.profile_summary || '프로필 정보가 없습니다'}
            </p>
            
            <div className="flex flex-wrap gap-3 text-sm">
              {interview.interviewee_profile?.[0]?.demographics?.age_group && (
                <div className="bg-gray-100 px-3 py-1.5 rounded-lg text-gray-700">
                  {interview.interviewee_profile[0].demographics.age_group}
                </div>
              )}
              
              {interview.interviewee_profile?.[0]?.demographics?.gender && (
                <div className="bg-gray-100 px-3 py-1.5 rounded-lg text-gray-700">
                  {interview.interviewee_profile[0].demographics.gender}
                </div>
              )}
              
              {interview.interviewee_profile?.[0]?.demographics?.occupation_context && (
                <div className="bg-gray-100 px-3 py-1.5 rounded-lg text-gray-700">
                  {interview.interviewee_profile[0].demographics.occupation_context}
                </div>
              )}
            </div>
          </div>
          
          {/* 날짜 및 품질 평가 */}
          <div className="space-y-3">
            {interview.interview_date && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">인터뷰 날짜</span>
                <span className="text-sm text-gray-700">
                  {new Date(interview.interview_date).toLocaleDateString('ko-KR')}
                </span>
              </div>
            )}
            
            {interview.interview_quality_assessment?.[0]?.overall_quality && (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-medium text-gray-600">인터뷰 품질</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={cn(
                          "w-4 h-4",
                          i < interview.interview_quality_assessment[0].overall_quality.score
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        )}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="ml-1 text-sm font-medium text-gray-700">
                      {interview.interview_quality_assessment[0].overall_quality.score}/5
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed pl-[88px]">
                  {interview.interview_quality_assessment[0].overall_quality.assessment}
                </p>
              </div>
            )}
          </div>
          
        </motion.section>
        
        {/* 페르소나 정보 섹션 */}
        {interview.ai_persona_definition && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white px-10 py-6"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">페르소나</h2>
            
            <div className="mb-4">
              <span className="inline-block bg-blue-100 text-blue-900 px-4 py-2 rounded-lg font-medium">
                {interview.ai_persona_definition.name_ko}
              </span>
            </div>
            
            {interview.ai_persona_explanation && (
              <p className="text-sm text-gray-700 leading-relaxed">
                {interview.ai_persona_explanation}
              </p>
            )}
          </motion.section>
        )}
        
        {/* 핵심 시사점 섹션 */}
        {key_takeaways && key_takeaways.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white px-10 py-6"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">핵심 시사점</h2>
            
            <ul className="space-y-3">
              {key_takeaways.map((takeaway, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="block w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                  <p className="text-base text-gray-700 leading-relaxed">
                    {takeaway}
                  </p>
                </li>
              ))}
            </ul>
          </motion.section>
        )}


        {/* 모든 데이터가 없는 경우 */}
        {(!key_takeaways || key_takeaways.length === 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white px-10 py-8 text-center"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">아직 분석된 인사이트가 없습니다</h3>
            <p className="text-sm text-gray-500">인터뷰 분석이 완료되면 인사이트가 표시됩니다</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}