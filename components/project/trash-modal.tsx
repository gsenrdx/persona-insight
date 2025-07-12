'use client'

import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { History, RotateCcw, Loader2, AlertCircle, FileText } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useDeletedInterviews, useRestoreInterview } from '@/hooks/use-interviews'
import { toast } from 'sonner'


interface HistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onRestore?: () => void
}

export default function HistoryModal({ open, onOpenChange, projectId, onRestore }: HistoryModalProps) {
  const { interviews, isLoading, error } = useDeletedInterviews(projectId)
  const { restoreInterviewAsync, isRestoring } = useRestoreInterview(projectId)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const handleRestore = useCallback(async (interviewId: string) => {
    try {
      setRestoringId(interviewId)
      await restoreInterviewAsync(interviewId)
      toast.success('인터뷰가 복원되었습니다')
      onRestore?.()
    } catch (error) {
      toast.error('복원 중 오류가 발생했습니다')
    } finally {
      setRestoringId(null)
    }
  }, [restoreInterviewAsync, onRestore])

  const formatDate = (date: string | null) => {
    if (!date) return '알 수 없음'
    try {
      return formatDistanceToNow(new Date(date), { 
        addSuffix: true, 
        locale: ko 
      })
    } catch {
      return '알 수 없음'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 h-[90vh] flex flex-col overflow-hidden">
        <DialogTitle className="sr-only">인터뷰 기록</DialogTitle>
        
        {/* 인터뷰 추가 모달과 동일한 헤더 스타일 */}
        <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 px-8 pt-8 pb-6">
          <DialogHeader className="relative z-10">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <History className="w-6 h-6 text-blue-600" />
              인터뷰 기록
            </h2>
            <DialogDescription className="text-base text-gray-600 mt-2">
              삭제된 인터뷰를 확인하고 복원할 수 있습니다. 중요한 데이터를 실수로 삭제했나요?
            </DialogDescription>
          </DialogHeader>
          
          {/* 핀 캐릭터 */}
          <div className="absolute right-12 top-1/2 -translate-y-[45%]">
            <img 
              src="/assets/pin/pin-restore.png" 
              alt="Pin character"
              className="w-36 h-36 object-contain"
            />
          </div>
        </div>

        {/* 본문 영역 */}
        <div className="flex-1 overflow-auto">
          <div className="px-8 py-6">
            {isLoading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                    <Skeleton className="w-20 h-8 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  삭제된 인터뷰를 불러오는 중 오류가 발생했습니다.
                </AlertDescription>
              </Alert>
            ) : interviews.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-50 flex items-center justify-center">
                  <History className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">아직 기록이 없습니다</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  삭제된 인터뷰가 없습니다. 인터뷰를 삭제하면 이곳에서 확인하고 복원할 수 있어요.
                </p>
                
              </div>
            ) : (
              <div>

                {/* 인터뷰 목록 */}
                <div className="space-y-1">
                  {interviews.map((interview) => (
                    <div
                      key={interview.id}
                      className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 truncate">
                            {interview.title || '제목 없음'}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-gray-500 ml-4">
                            <span>
                              생성: {interview.created_at ? 
                                format(new Date(interview.created_at), 'M월 d일', { locale: ko }) : 
                                '알 수 없음'
                              }
                            </span>
                            <span>•</span>
                            <span>생성자: {(interview as any).created_by_profile?.name || '알 수 없음'}</span>
                            <span>•</span>
                            <span>
                              삭제: {formatDate((interview as any).deleted_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 복원 버튼 */}
                      <Button
                        size="sm"
                        onClick={() => handleRestore(interview.id)}
                        disabled={isRestoring || restoringId === interview.id}
                        className="ml-4 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {restoringId === interview.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            복원 중
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4 mr-1" />
                            복원하기
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 푸터 - 인터뷰 추가 모달과 동일한 스타일 */}
        <div className="flex justify-between items-center px-8 py-4 bg-gray-50 border-t">
          <p className="text-sm text-gray-500">
            {interviews.length > 0 ? (
              `총 ${interviews.length}개의 삭제된 인터뷰`
            ) : (
              '삭제된 인터뷰가 없습니다'
            )}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="hover:bg-gray-100"
            >
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}