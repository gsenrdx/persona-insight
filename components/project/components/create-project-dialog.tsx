import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Globe, Lock, Loader2, Calendar, Users, Target, Sparkles } from "lucide-react"
import { CreateProjectData } from '@/hooks/use-projects'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto custom-scrollbar p-0">
        {/* 상단 헤더 영역 */}
        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 px-8 pt-8 pb-6">
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              새 프로젝트 만들기
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 mt-2">
              팀과 함께 고객 인사이트를 발견할 새로운 프로젝트를 시작하세요
            </DialogDescription>
          </DialogHeader>
          
          {/* 핀 캐릭터 */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <img 
              src="/assets/pin/pin-project-join.png" 
              alt="Pin character"
              className="w-32 h-32 object-contain"
            />
          </div>
        </div>
        
        <div className="space-y-6 px-8 py-6">
          {/* 기본 정보 섹션 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600">1</span>
              </div>
              기본 정보
            </h3>
            
            <div className="ml-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name" className="text-sm font-medium text-gray-700">
                  프로젝트 이름 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="project-name"
                  placeholder="예: 모바일 앱 UX 개선 프로젝트"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className={cn(
                    "h-11 transition-all",
                    newProjectName && "border-blue-300 ring-1 ring-blue-100"
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-description" className="text-sm font-medium text-gray-700">
                  프로젝트 설명
                </Label>
                <Textarea
                  id="project-description"
                  placeholder="프로젝트의 목표와 내용을 간단히 설명해주세요"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          {/* 상세 정보 섹션 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600">2</span>
              </div>
              상세 정보
            </h3>
            
            <div className="ml-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-purpose" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    프로젝트 목적
                  </Label>
                  <Textarea
                    id="project-purpose"
                    placeholder="달성하고자 하는 목적"
                    value={newProjectPurpose}
                    onChange={(e) => setNewProjectPurpose(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="project-target-audience" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    대상 사용자
                  </Label>
                  <Textarea
                    id="project-target-audience"
                    placeholder="연구 대상 사용자 그룹"
                    value={newProjectTargetAudience}
                    onChange={(e) => setNewProjectTargetAudience(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-research-method" className="text-sm font-medium text-gray-700">
                  연구 방법
                </Label>
                <Textarea
                  id="project-research-method"
                  placeholder="사용할 연구 방법론을 설명해주세요"
                  value={newProjectResearchMethod}
                  onChange={(e) => setNewProjectResearchMethod(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-start-date" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    시작일
                  </Label>
                  <Input
                    id="project-start-date"
                    type="date"
                    value={newProjectStartDate}
                    onChange={(e) => setNewProjectStartDate(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-end-date" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    종료일
                  </Label>
                  <Input
                    id="project-end-date"
                    type="date"
                    value={newProjectEndDate}
                    onChange={(e) => setNewProjectEndDate(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 공개 설정 섹션 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600">3</span>
              </div>
              공개 설정
            </h3>
            
            <RadioGroup
              value={newProjectVisibility}
              onValueChange={(value: 'public' | 'private') => {
                setNewProjectVisibility(value)
                if (value === 'public') {
                  setNewProjectJoinMethod('open')
                }
              }}
              className="ml-8 space-y-3"
            >
              <div className={cn(
                "flex items-start space-x-3 p-4 border-2 rounded-xl transition-all cursor-pointer",
                newProjectVisibility === 'public' 
                  ? "border-blue-400 bg-blue-50" 
                  : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
              )}>
                <RadioGroupItem value="public" id="public" className="mt-1" />
                <div className="flex items-start space-x-3 flex-1">
                  <Globe className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <Label htmlFor="public" className="text-sm font-medium cursor-pointer text-gray-900 block">공개 프로젝트</Label>
                    <p className="text-sm text-gray-600 mt-1">회사 내 모든 구성원이 프로젝트를 확인하고 참여할 수 있습니다</p>
                  </div>
                </div>
              </div>
              
              <div className={cn(
                "flex items-start space-x-3 p-4 border-2 rounded-xl transition-all cursor-pointer",
                newProjectVisibility === 'private' 
                  ? "border-orange-400 bg-orange-50" 
                  : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/30"
              )}>
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
              <div className="ml-8 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <Label className="text-sm font-medium text-gray-700 block">참여 방법</Label>
                <RadioGroup
                  value={newProjectJoinMethod}
                  onValueChange={(value: 'invite_only' | 'password') => setNewProjectJoinMethod(value)}
                  className="space-y-3"
                >
                  <div className={cn(
                    "flex items-center space-x-3 p-3 border rounded-lg transition-all cursor-pointer",
                    newProjectJoinMethod === 'invite_only'
                      ? "border-gray-400 bg-gray-50"
                      : "border-gray-200 hover:bg-gray-50"
                  )}>
                    <RadioGroupItem value="invite_only" id="invite_only" />
                    <Label htmlFor="invite_only" className="text-sm cursor-pointer text-gray-700">초대만 가능</Label>
                  </div>
                  <div className={cn(
                    "flex items-center space-x-3 p-3 border rounded-lg transition-all cursor-pointer",
                    newProjectJoinMethod === 'password'
                      ? "border-gray-400 bg-gray-50"
                      : "border-gray-200 hover:bg-gray-50"
                  )}>
                    <RadioGroupItem value="password" id="password" />
                    <Label htmlFor="password" className="text-sm cursor-pointer text-gray-700">비밀번호로 참여</Label>
                  </div>
                </RadioGroup>

                {newProjectJoinMethod === 'password' && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <Input
                      type="password"
                      placeholder="참여 비밀번호를 설정하세요"
                      value={newProjectPassword}
                      onChange={(e) => setNewProjectPassword(e.target.value)}
                      className="h-11"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center px-8 py-4 bg-gray-50 border-t">
          <p className="text-sm text-gray-500">
            <span className="text-red-500">*</span> 표시는 필수 입력 항목입니다
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="hover:bg-gray-100"
            >
              취소
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isCreating || !newProjectName.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  프로젝트 만들기
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}