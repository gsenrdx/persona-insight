'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, Lock, Globe } from "lucide-react"
import { ProjectWithMembership } from '@/types'
import { toast } from 'sonner'

interface JoinProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectWithMembership | null
  onJoin: (projectId: string) => Promise<void>
  isJoining?: boolean
}

export function JoinProjectDialog({
  open,
  onOpenChange,
  project,
  onJoin,
  isJoining = false
}: JoinProjectDialogProps) {
  const [loading, setLoading] = useState(false)

  if (!project) return null

  const handleJoin = async () => {
    setLoading(true)
    try {
      await onJoin(project.id)
      onOpenChange(false)
    } catch (error) {
      toast.error('프로젝트 참여에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>프로젝트 참여</DialogTitle>
          <DialogDescription>
            이 프로젝트에 참여하시겠습니까?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{project.name}</h3>
            {project.description && (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              {project.visibility === 'public' ? (
                <>
                  <Globe className="w-4 h-4 text-green-600" />
                  <span>공개 프로젝트</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-gray-600" />
                  <span>비공개 프로젝트</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{project.member_count || 0}명의 멤버</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{new Date(project.created_at).toLocaleDateString('ko-KR')} 생성됨</span>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">
              프로젝트에 참여하면 다음 권한을 얻게 됩니다:
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• 프로젝트 내용 조회</li>
              <li>• 인터뷰 데이터 열람</li>
              <li>• 페르소나와 대화</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || isJoining}>
            취소
          </Button>
          <Button onClick={handleJoin} disabled={loading || isJoining}>
            {loading || isJoining ? '참여 중...' : '프로젝트 참여'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}