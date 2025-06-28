'use client'

import { Interview } from '@/types/interview'
import { Button } from '@/components/ui/button'
import { Eye, MoreVertical, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface InterviewCardProps {
  interview: Interview
  onView: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export default function InterviewCard({ interview, onView, onEdit, onDelete }: InterviewCardProps) {
  // 인터뷰 대상자 프로필 정보
  const demographics = interview.interviewee_profile?.[0]?.demographics

  return (
    <div 
      className="group bg-white border-b border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer"
      onClick={() => onView(interview.id)}
    >
      <div className="px-8 py-4">
        <div className="flex items-center justify-between">
          {/* 왼쪽 정보 영역 */}
          <div className="flex-1 flex items-center gap-8">
            {/* 제목 */}
            <div className="min-w-[200px]">
              <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {interview.title || '제목 없음'}
              </h3>
            </div>

            {/* 인터뷰 대상자 정보 */}
            {demographics && (
              <div className="flex items-center gap-4 text-xs text-gray-600">
                {demographics.age_group && (
                  <span>{demographics.age_group}</span>
                )}
                {demographics.gender && (
                  <>
                    <span>•</span>
                    <span>{demographics.gender}</span>
                  </>
                )}
                {demographics.occupation_context && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[200px]">{demographics.occupation_context}</span>
                  </>
                )}
              </div>
            )}

            {/* 생성일 및 생성자 */}
            <div className="flex items-center gap-4 text-xs text-gray-500 ml-auto">
              {interview.created_at && (
                <span>{format(new Date(interview.created_at), 'yyyy.MM.dd')}</span>
              )}
              {interview.created_by_profile && (
                <>
                  <span>•</span>
                  <span>{interview.created_by_profile.name}</span>
                </>
              )}
              {interview.note_count && interview.note_count > 0 && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>{interview.note_count}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 오른쪽 액션 영역 */}
          <div className="flex items-center gap-3 ml-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  onView(interview.id)
                }}>
                  <Eye className="mr-2 h-4 w-4" />
                  상세보기
                </DropdownMenuItem>
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(interview.id)
                    }}
                    className="text-red-600"
                  >
                    삭제
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}