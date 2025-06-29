'use client'

import { Interview } from '@/types/interview'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { FileText, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InterviewListProps {
  interviews: Interview[]
  onView: (id: string) => void
  onDelete?: (id: string) => void
  loading?: boolean
}

export function InterviewList({ interviews, onView, onDelete, loading }: InterviewListProps) {
  if (loading && interviews.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6 animate-pulse border border-gray-100">
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="flex gap-2">
                <div className="h-6 bg-gray-100 rounded-full w-20" />
                <div className="h-6 bg-gray-100 rounded-full w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (interviews.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-12 text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">아직 인터뷰가 없습니다</p>
        <p className="text-sm text-gray-500 mt-1">첫 번째 인터뷰를 추가해보세요</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {interviews.map((interview, index) => {
        const demographics = interview.interviewee_profile?.[0]?.demographics
        const isProcessing = interview.status === 'processing'
        const isPending = interview.status === 'pending'
        const isFailed = interview.status === 'failed'
        
        return (
          <motion.div
            key={interview.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group"
          >
            <div 
              className="bg-white rounded-lg border border-gray-200 transition-all cursor-pointer hover:border-gray-300 hover:shadow-sm"
              onClick={() => onView(interview.id)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* 제목 및 상태 */}
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {interview.title || '제목 없음'}
                      </h3>
                      {isProcessing && (
                        <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full font-medium">분석중</span>
                      )}
                      {isPending && (
                        <span className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-full font-medium">대기중</span>
                      )}
                      {isFailed && (
                        <span className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-full font-medium">실패</span>
                      )}
                    </div>

                    {/* 요약 */}
                    {interview.summary && (
                      <p className="text-muted-foreground mb-3 line-clamp-2">
                        {interview.summary}
                      </p>
                    )}

                    {/* 메타 정보 */}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground/80">
                        {format(new Date(interview.created_at), 'yyyy년 M월 d일')}
                      </span>
                      
                      {demographics && (
                        <div className="flex items-center gap-2">
                          {demographics.age_group && (
                            <span className="px-2.5 py-0.5 bg-muted/50 text-muted-foreground rounded-full text-xs font-medium">
                              {demographics.age_group}
                            </span>
                          )}
                          {demographics.gender && (
                            <span className="px-2.5 py-0.5 bg-muted/50 text-muted-foreground rounded-full text-xs font-medium">
                              {demographics.gender}
                            </span>
                          )}
                        </div>
                      )}

                      {interview.note_count && interview.note_count > 0 && (
                        <span className="text-muted-foreground/80">
                          노트 {interview.note_count}개
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('이 인터뷰를 삭제하시겠습니까?')) {
                          onDelete(interview.id)
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-muted/50 rounded-lg"
                      title="삭제"
                    >
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>

              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}