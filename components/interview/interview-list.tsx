'use client'

import { Interview } from '@/types/interview'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { FileText, MoreVertical, Clock, Calendar, User, MessageSquare, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPersonaCombinationDisplayName } from '@/lib/utils/persona-combination'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'

interface InterviewListProps {
  interviews: Interview[]
  onView: (id: string) => void
  onDelete?: (id: string) => void
  loading?: boolean
}

export function InterviewList({ interviews, onView, onDelete, loading }: InterviewListProps) {
  if (loading && interviews.length === 0) {
    return (
      <div className="grid gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (interviews.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-3 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">아직 인터뷰가 없습니다</h3>
          <p className="text-sm text-muted-foreground">첫 번째 인터뷰를 추가해보세요</p>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            분석중
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            대기중
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            실패
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            완료
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="grid gap-4">
      {interviews.map((interview, index) => {
        const demographics = interview.interviewee_profile?.[0]?.demographics
        const hasNotes = interview.note_count && interview.note_count > 0
        
        return (
          <motion.div
            key={interview.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: index * 0.05,
              duration: 0.3,
              ease: "easeOut"
            }}
          >
            <Card 
              className="group overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/20 cursor-pointer"
              onClick={() => onView(interview.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg truncate">
                        {interview.title || '제목 없음'}
                      </CardTitle>
                      {getStatusBadge(interview.status)}
                    </div>
                    {interview.summary && (
                      <CardDescription className="line-clamp-2">
                        {interview.summary}
                      </CardDescription>
                    )}
                  </div>
                  
                  {onDelete && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">더보기</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onView(interview.id)
                          }}
                          className="cursor-pointer"
                        >
                          상세보기
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('이 인터뷰를 삭제하시겠습니까?')) {
                              onDelete(interview.id)
                            }
                          }}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{format(new Date(interview.created_at), 'yyyy년 M월 d일')}</span>
                  </div>
                  
                  {demographics && (
                    <>
                      {(demographics.age_group || demographics.gender) && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          <span>
                            {[demographics.age_group, demographics.gender]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  
                  {hasNotes && (
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>노트 {interview.note_count}개</span>
                    </div>
                  )}
                  
                  {interview.persona_combination && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {getPersonaCombinationDisplayName(interview.persona_combination)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 태그나 추가 메타데이터가 있다면 여기에 추가 */}
                {demographics && (demographics.occupation || demographics.location) && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {demographics.occupation && (
                      <Badge variant="secondary" className="text-xs">
                        {demographics.occupation}
                      </Badge>
                    )}
                    {demographics.location && (
                      <Badge variant="secondary" className="text-xs">
                        {demographics.location}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}