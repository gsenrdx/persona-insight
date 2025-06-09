'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useProjects, useCreateProject, useDeleteProject, useProjectMembers, Project, CreateProjectData } from '@/hooks/use-projects'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Plus, FolderOpen, Loader2, AlertTriangle, MoreHorizontal, Edit, Trash, Globe, Lock, Users } from 'lucide-react'
import { toast } from 'sonner'

interface ProjectSelectorProps {
  open: boolean
  onProjectSelected: () => void
  onClose?: () => void
}

export default function ProjectSelector({ open, onProjectSelected, onClose }: ProjectSelectorProps) {
  const { profile, switchProject } = useAuth()
  
  // React Query 훅들
  const { data: projects = [], isLoading: loading, error, refetch } = useProjects(
    profile?.company_id || undefined, 
    profile?.id || undefined
  )
  const createProjectMutation = useCreateProject()
  const deleteProjectMutation = useDeleteProject()
  
  // 컴포넌트 상태
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [newProjectVisibility, setNewProjectVisibility] = useState<'public' | 'private'>('public')
  const [newProjectJoinMethod, setNewProjectJoinMethod] = useState<'open' | 'invite_only' | 'password'>('open')
  const [newProjectPassword, setNewProjectPassword] = useState('')
  
  // 편집 관련 상태
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  
  // 삭제 관련 상태
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)

  // 새 프로젝트 생성
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('프로젝트 이름을 입력해주세요.')
      return
    }

    if (!profile?.company_id || !profile?.id) {
      toast.error('사용자 인증 정보가 없습니다. 다시 로그인해주세요.')
      return
    }

    const projectData: CreateProjectData = {
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || undefined,
      company_id: profile.company_id,
      created_by: profile.id,
      visibility: newProjectVisibility,
      join_method: newProjectJoinMethod,
      password: newProjectJoinMethod === 'password' ? newProjectPassword : undefined
    }

    try {
      await createProjectMutation.mutateAsync(projectData)
      
      // 폼 초기화
      setNewProjectName('')
      setNewProjectDescription('')
      setNewProjectVisibility('public')
      setNewProjectJoinMethod('open')
      setNewProjectPassword('')
      setShowCreateForm(false)
      
      toast.success('프로젝트가 성공적으로 생성되었습니다')
    } catch (err) {
      // 에러는 React Query mutation에서 자동으로 처리됨
      console.error('프로젝트 생성 실패:', err)
    }
  }

  // 프로젝트 선택
  const handleSelectProject = async (project: Project) => {
    try {
      await switchProject(project.id)
      toast.success(`${project.name} 프로젝트로 전환되었습니다`)
      onProjectSelected()
    } catch (err) {
      console.error('프로젝트 전환 실패:', err)
      toast.error('프로젝트 전환에 실패했습니다')
    }
  }

  // 프로젝트 삭제
  const handleDeleteProject = async () => {
    if (!deletingProject || !profile?.id) return

    try {
      await deleteProjectMutation.mutateAsync({
        projectId: deletingProject.id,
        userId: profile.id
      })
      
      setDeletingProject(null)
      toast.success('프로젝트가 성공적으로 삭제되었습니다')
    } catch (err) {
      console.error('프로젝트 삭제 실패:', err)
    }
  }

  // 권한 확인 함수 (임시 - 실제 프로젝트 구조에 맞게 조정 필요)
  const canDeleteProject = (project: Project) => {
    return project.created_by === profile?.id || 
           profile?.role === 'company_admin' || 
           profile?.role === 'super_admin'
  }

  // 로딩 상태
  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>프로젝트 로딩 중</DialogTitle>
            <DialogDescription>
              프로젝트 목록을 불러오고 있습니다
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">프로젝트 목록을 불러오는 중...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>프로젝트 로드 오류</DialogTitle>
            <DialogDescription>
              프로젝트 목록을 불러오는 중 오류가 발생했습니다
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-destructive" />
              <p className="text-destructive font-medium mb-2">오류가 발생했습니다</p>
              <p className="text-muted-foreground mb-4">{error.message}</p>
              <Button onClick={() => refetch()} variant="outline">
                다시 시도
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              프로젝트 선택
            </DialogTitle>
            <DialogDescription>
              작업할 프로젝트를 선택하거나 새 프로젝트를 생성하세요
              {profile?.current_project && (
                <span className="block mt-1 text-primary font-medium">
                  현재 선택: {profile.current_project.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* 새 프로젝트 생성 버튼 */}
            {!showCreateForm && (
              <Button
                onClick={() => setShowCreateForm(true)}
                variant="outline"
                className="w-full border-dashed border-2 h-16 text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-5 w-5 mr-2" />
                새 프로젝트 생성
              </Button>
            )}

            {/* 새 프로젝트 생성 폼 */}
            {showCreateForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">새 프로젝트 생성</CardTitle>
                  <CardDescription>
                    새로운 프로젝트의 정보를 입력하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="project-name">프로젝트 이름 *</Label>
                    <Input
                      id="project-name"
                      placeholder="예: 모바일 앱 사용성 개선"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="project-description">프로젝트 설명</Label>
                    <Textarea
                      id="project-description"
                      placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  {/* 프로젝트 공개 설정 */}
                  <div className="space-y-3">
                    <Label>프로젝트 공개 설정</Label>
                    <RadioGroup
                      value={newProjectVisibility}
                      onValueChange={(value: 'public' | 'private') => {
                        setNewProjectVisibility(value)
                        if (value === 'private') {
                          setNewProjectJoinMethod('invite_only')
                        } else {
                          setNewProjectJoinMethod('open')
                        }
                      }}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent/50 cursor-pointer">
                        <RadioGroupItem value="public" id="public" />
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-green-600" />
                          <div>
                            <Label htmlFor="public" className="font-medium cursor-pointer">공개</Label>
                            <p className="text-xs text-muted-foreground">회사 내 모든 구성원이 볼 수 있습니다</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent/50 cursor-pointer">
                        <RadioGroupItem value="private" id="private" />
                        <div className="flex items-center space-x-2">
                          <Lock className="h-4 w-4 text-orange-600" />
                          <div>
                            <Label htmlFor="private" className="font-medium cursor-pointer">비공개</Label>
                            <p className="text-xs text-muted-foreground">초대된 구성원만 볼 수 있습니다</p>
                          </div>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* 참여 방식 (공개 프로젝트만) */}
                  {newProjectVisibility === 'public' && (
                    <div className="space-y-3">
                      <Label>참여 방식</Label>
                      <RadioGroup
                        value={newProjectJoinMethod}
                        onValueChange={(value: 'open' | 'invite_only' | 'password') => setNewProjectJoinMethod(value)}
                        className="space-y-2"
                      >
                                                 <div className="flex items-center space-x-2">
                           <RadioGroupItem value="open" id="open" />
                           <Label htmlFor="open" className="cursor-pointer">자유 참여</Label>
                         </div>
                      </RadioGroup>
                    </div>
                  )}

                  {/* 비공개 프로젝트 참여 방식 */}
                  {newProjectVisibility === 'private' && (
                    <div className="space-y-3">
                      <Label>참여 방식</Label>
                      <RadioGroup
                        value={newProjectJoinMethod}
                        onValueChange={(value: 'invite_only' | 'password') => setNewProjectJoinMethod(value)}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="invite_only" id="invite_only" />
                          <Label htmlFor="invite_only" className="cursor-pointer">초대만 가능</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="password" id="password" />
                          <Label htmlFor="password" className="cursor-pointer">비밀번호로 참여</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {/* 비밀번호 입력 */}
                  {newProjectJoinMethod === 'password' && (
                    <div>
                      <Label htmlFor="project-password">프로젝트 비밀번호</Label>
                      <Input
                        id="project-password"
                        type="password"
                        placeholder="프로젝트 참여 비밀번호를 입력하세요"
                        value={newProjectPassword}
                        onChange={(e) => setNewProjectPassword(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleCreateProject}
                      disabled={createProjectMutation.isPending}
                      className="flex-1"
                    >
                      {createProjectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      프로젝트 생성
                    </Button>
                    <Button
                      onClick={() => setShowCreateForm(false)}
                      variant="outline"
                      disabled={createProjectMutation.isPending}
                    >
                      취소
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 프로젝트 목록 */}
            {projects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">프로젝트가 없습니다</h3>
                <p className="text-muted-foreground mb-4">
                  첫 번째 프로젝트를 생성해보세요
                </p>
                {!showCreateForm && (
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    새 프로젝트 생성
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      profile?.current_project_id === project.id
                        ? 'ring-2 ring-primary shadow-md'
                        : ''
                    }`}
                    onClick={() => handleSelectProject(project)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-1">
                            {project.name}
                          </CardTitle>
                          {project.description && (
                            <CardDescription className="line-clamp-2">
                              {project.description}
                            </CardDescription>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {profile?.current_project_id === project.id && (
                            <Badge variant="default" className="text-xs">현재</Badge>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                // 편집 로직 - 필요시 구현
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                수정
                              </DropdownMenuItem>
                              {canDeleteProject(project) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDeletingProject(project)
                                    }}
                                    className="text-destructive"
                                  >
                                    <Trash className="h-4 w-4 mr-2" />
                                    삭제
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            {project.is_private ? (
                              <Lock className="h-3 w-3" />
                            ) : (
                              <Globe className="h-3 w-3" />
                            )}
                            <span>{project.is_private ? '비공개' : '공개'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{project.project_members?.length || 1}명</span>
                          </div>
                        </div>
                        <span>{new Date(project.created_at).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deletingProject} onOpenChange={() => setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프로젝트 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingProject?.name}" 프로젝트를 정말 삭제하시겠습니까?
              <br />
              <span className="text-destructive font-medium">
                이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingProject(null)}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={deleteProjectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProjectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 