'use client'

import { Interview } from '@/types/interview'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageSquare, Target, Users, Calendar, Eye, MoreVertical } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
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
  const { metadata } = interview
  const painpointCount = metadata?.categories_count?.painpoint || 0
  const needsCount = metadata?.categories_count?.needs || 0
  
  // 대화 미리보기 생성 (처음 3개)
  const previewDialogs = interview.cleaned_script?.slice(0, 3).map(item => ({
    speaker: item.speaker,
    text: item.cleaned_sentence.length > 50 
      ? item.cleaned_sentence.substring(0, 50) + '...' 
      : item.cleaned_sentence,
    category: item.category
  })) || []

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-base line-clamp-2 group-hover:text-blue-600 transition-colors">
              {interview.title || '제목 없음'}
            </h3>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>
                {interview.interview_date ? formatDistanceToNow(new Date(interview.interview_date), {
                  addSuffix: true,
                  locale: ko
                }) : '날짜 없음'}
              </span>
              {interview.created_by_profile && (
                <>
                  <span>•</span>
                  <span>{interview.created_by_profile.name}</span>
                </>
              )}
            </div>
          </div>
          
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
              <DropdownMenuItem onClick={() => onView(interview.id)}>
                <Eye className="mr-2 h-4 w-4" />
                상세보기
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(interview.id)}>
                  편집
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(interview.id)}
                  className="text-red-600"
                >
                  삭제
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pb-3" onClick={() => onView(interview.id)}>
        {/* 통계 정보 */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5 text-sm">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{metadata?.total_sentences || 0}</span>
          </div>
          {painpointCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Badge variant="destructive" className="text-xs">
                <Target className="w-3 h-3 mr-1" />
                Pain {painpointCount}
              </Badge>
            </div>
          )}
          {needsCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Badge variant="default" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                Needs {needsCount}
              </Badge>
            </div>
          )}
        </div>

        {/* 대화 미리보기 */}
        {previewDialogs.length > 0 && (
          <div className="space-y-1.5 p-3 bg-gray-50 rounded-lg">
            {previewDialogs.map((dialog, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span className={`font-medium ${
                  dialog.speaker === 'question' ? 'text-blue-600' : 'text-green-600'
                }`}>
                  {dialog.speaker === 'question' ? 'Q:' : 'A:'}
                </span>
                <span className="text-gray-700 flex-1 line-clamp-1">
                  {dialog.text}
                </span>
                {dialog.category && (
                  <Badge 
                    variant={dialog.category === 'painpoint' ? 'destructive' : 'default'}
                    className="text-xs scale-75"
                  >
                    {dialog.category}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 요약 */}
        {interview.summary && (
          <p className="text-sm text-gray-600 line-clamp-2 mt-3">
            {interview.summary}
          </p>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {interview.persona && (
              <Badge variant="secondary" className="text-xs">
                {interview.persona.persona_title || interview.persona.persona_type}
              </Badge>
            )}
            <Badge 
              variant={interview.status === 'completed' ? 'success' : 'outline'}
              className="text-xs"
            >
              {interview.status === 'completed' ? '완료' : 
               interview.status === 'processing' ? '처리중' : 
               interview.status === 'failed' ? '실패' : '대기중'}
            </Badge>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}