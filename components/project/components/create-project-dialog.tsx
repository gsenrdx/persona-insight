import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Globe, Lock, Loader2 } from "lucide-react"
import { CreateProjectData } from '@/hooks/use-projects'
import { toast } from 'sonner'

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateProject: (data: CreateProjectData) => Promise<void>
  isCreating: boolean
  companyId: string
  userId: string
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreateProject,
  isCreating,
  companyId,
  userId
}: CreateProjectDialogProps) {
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [newProjectVisibility, setNewProjectVisibility] = useState<'public' | 'private'>('public')
  const [newProjectJoinMethod, setNewProjectJoinMethod] = useState<'open' | 'invite_only' | 'password'>('open')
  const [newProjectPassword, setNewProjectPassword] = useState('')
  const [newProjectPurpose, setNewProjectPurpose] = useState('')
  const [newProjectTargetAudience, setNewProjectTargetAudience] = useState('')
  const [newProjectResearchMethod, setNewProjectResearchMethod] = useState('')
  const [newProjectStartDate, setNewProjectStartDate] = useState('')
  const [newProjectEndDate, setNewProjectEndDate] = useState('')

  const handleSubmit = async () => {
    if (!newProjectName.trim()) {
      toast.error('프로젝트 이름을 입력해주세요.')
      return
    }

    const projectData: CreateProjectData = {
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || undefined,
      company_id: companyId,
      created_by: userId,
      visibility: newProjectVisibility,
      join_method: newProjectVisibility === 'public' ? 'open' : newProjectJoinMethod,
      password: newProjectJoinMethod === 'password' ? newProjectPassword : undefined,
      purpose: newProjectPurpose.trim() || undefined,
      target_audience: newProjectTargetAudience.trim() || undefined,
      research_method: newProjectResearchMethod.trim() || undefined,
      start_date: newProjectStartDate || undefined,
      end_date: newProjectEndDate || undefined
    }

    await onCreateProject(projectData)
    
    // 폼 초기화
    setNewProjectName('')
    setNewProjectDescription('')
    setNewProjectVisibility('public')
    setNewProjectJoinMethod('open')
    setNewProjectPassword('')
    setNewProjectPurpose('')
    setNewProjectTargetAudience('')
    setNewProjectResearchMethod('')
    setNewProjectStartDate('')
    setNewProjectEndDate('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">새 프로젝트 만들기</DialogTitle>
          <DialogDescription>
            팀과 함께 고객 인사이트를 발견할 새로운 프로젝트를 시작하세요
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name" className="text-sm font-medium">프로젝트 이름</Label>
            <Input
              id="project-name"
              placeholder="예: 모바일 앱 UX 개선 프로젝트"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description" className="text-sm font-medium">프로젝트 설명 (선택)</Label>
            <Textarea
              id="project-description"
              placeholder="프로젝트의 목표와 내용을 간단히 설명해주세요"
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-purpose" className="text-sm font-medium">프로젝트 목적 (선택)</Label>
            <Textarea
              id="project-purpose"
              placeholder="이 프로젝트를 통해 달성하고자 하는 목적을 설명해주세요"
              value={newProjectPurpose}
              onChange={(e) => setNewProjectPurpose(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-target-audience" className="text-sm font-medium">대상 사용자 (선택)</Label>
            <Textarea
              id="project-target-audience"
              placeholder="연구 대상이 되는 사용자 그룹을 설명해주세요"
              value={newProjectTargetAudience}
              onChange={(e) => setNewProjectTargetAudience(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-research-method" className="text-sm font-medium">연구 방법 (선택)</Label>
            <Textarea
              id="project-research-method"
              placeholder="사용할 연구 방법론을 설명해주세요"
              value={newProjectResearchMethod}
              onChange={(e) => setNewProjectResearchMethod(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project-start-date" className="text-sm font-medium">시작일 (선택)</Label>
              <Input
                id="project-start-date"
                type="date"
                value={newProjectStartDate}
                onChange={(e) => setNewProjectStartDate(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-end-date" className="text-sm font-medium">종료일 (선택)</Label>
              <Input
                id="project-end-date"
                type="date"
                value={newProjectEndDate}
                onChange={(e) => setNewProjectEndDate(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-medium">프로젝트 공개 설정</Label>
            <RadioGroup
              value={newProjectVisibility}
              onValueChange={(value: 'public' | 'private') => {
                setNewProjectVisibility(value)
                if (value === 'public') {
                  setNewProjectJoinMethod('open')
                }
              }}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
                <RadioGroupItem value="public" id="public" className="mt-1" />
                <div className="flex items-start space-x-3 flex-1">
                  <Globe className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <Label htmlFor="public" className="text-sm font-medium cursor-pointer text-gray-900 block">공개 프로젝트</Label>
                    <p className="text-sm text-gray-600 mt-1">회사 내 모든 구성원이 프로젝트를 확인하고 참여할 수 있습니다</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-xl hover:border-orange-300 hover:bg-orange-50/50 transition-colors">
                <RadioGroupItem value="private" id="private" className="mt-1" />
                <div className="flex items-start space-x-3 flex-1">
                  <Lock className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <Label htmlFor="private" className="text-sm font-medium cursor-pointer text-gray-900 block">비공개 프로젝트</Label>
                    <p className="text-sm text-gray-600 mt-1">초대받은 멤버만 프로젝트에 접근할 수 있습니다</p>
                  </div>
                </div>
              </div>
            </RadioGroup>

            {newProjectVisibility === 'private' && (
              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-900 block">참여 방법</Label>
                <RadioGroup
                  value={newProjectJoinMethod}
                  onValueChange={(value: 'invite_only' | 'password') => setNewProjectJoinMethod(value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="invite_only" id="invite_only" />
                    <Label htmlFor="invite_only" className="text-sm cursor-pointer text-gray-900">초대만 가능</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="password" id="password" />
                    <Label htmlFor="password" className="text-sm cursor-pointer text-gray-900">비밀번호로 참여</Label>
                  </div>
                </RadioGroup>

                {newProjectJoinMethod === 'password' && (
                  <Input
                    type="password"
                    placeholder="참여 비밀번호를 설정하세요"
                    value={newProjectPassword}
                    onChange={(e) => setNewProjectPassword(e.target.value)}
                    className="h-11"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isCreating || !newProjectName.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            프로젝트 만들기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}