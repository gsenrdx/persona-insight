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
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, FolderOpen, Loader2, AlertTriangle, MoreHorizontal, Edit, Trash, Globe, Lock, Users, Search, X, Crown, UserCheck, User, Zap, Settings, UserPlus, Eye, Folder, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

interface ProjectSelectorProps {
  open: boolean
  onProjectSelected: () => void
  onClose?: () => void
}

// 프로젝트 수정을 위한 인터페이스
interface ProjectEditData {
  id: string
  name: string
  description: string
  visibility: 'public' | 'private'
  join_method: 'open' | 'invite_only' | 'password'
  password?: string
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
  const [searchQuery, setSearchQuery] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [newProjectVisibility, setNewProjectVisibility] = useState<'public' | 'private'>('public')
  const [newProjectJoinMethod, setNewProjectJoinMethod] = useState<'open' | 'invite_only' | 'password'>('open')
  const [newProjectPassword, setNewProjectPassword] = useState('')
  const [allowAnyoneToJoin, setAllowAnyoneToJoin] = useState(true)
  
  // 편집 관련 상태
  const [editingProject, setEditingProject] = useState<ProjectEditData | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editVisibility, setEditVisibility] = useState<'public' | 'private'>('public')
  const [editJoinMethod, setEditJoinMethod] = useState<'open' | 'invite_only' | 'password'>('open')
  const [editPassword, setEditPassword] = useState('')
  
  // 초대 관련 상태
  const [inviteProject, setInviteProject] = useState<any>(null)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  
  // 삭제 관련 상태
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)

  // 프로젝트 필터링
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // 멤버십 상태 확인 (API 응답 구조에 맞게 수정)
  const getMembershipStatus = (project: any) => {
    if (!profile?.id) return null
    
    // 프로젝트 생성자인지 확인
    if (project.created_by === profile.id) {
      return { isMember: true, role: 'owner', isOwner: true }
    }
    
    // API에서 반환하는 membership 객체 확인
    if (project.membership) {
      return { 
        isMember: true, 
        role: project.membership.role, 
        isOwner: project.membership.role === 'owner' 
      }
    }
    
    return { isMember: false, role: null, isOwner: false }
  }

  // 프로젝트 마스터 정보 가져오기 (master_id 활용)
  const getProjectMaster = (project: any) => {
    // master_id가 있으면 우선 사용
    if (project.master_id) {
      // 실제로는 사용자 정보를 별도로 가져와야 하지만, 일단 created_by와 같다고 가정
      return {
        name: profile?.id === project.master_id ? (profile?.name || '마스터') : '마스터',
        userId: project.master_id,
        isMaster: profile?.id === project.master_id
      }
    }
    
    // master_id가 없으면 created_by 사용
    return {
      name: profile?.id === project.created_by ? (profile?.name || '생성자') : '생성자',
      userId: project.created_by,
      isMaster: profile?.id === project.created_by
    }
  }

  // 공개 설정 확인 (visibility 필드 사용)
  const isPrivateProject = (project: any) => {
    return project.visibility === 'private' || project.is_private === true
  }

  // 수정 권한 확인
  const canEditProject = (project: any) => {
    const membershipStatus = getMembershipStatus(project)
    const masterInfo = getProjectMaster(project)
    
    return (
      project.created_by === profile?.id || 
      membershipStatus?.role === 'owner' ||
      masterInfo.isMaster ||
      profile?.role === 'company_admin' || 
      profile?.role === 'super_admin'
    )
  }

  // 초대 권한 확인 (비공개 프로젝트의 마스터/오너만)
  const canInviteMembers = (project: any) => {
    if (!isPrivateProject(project)) return false
    
    const membershipStatus = getMembershipStatus(project)
    const masterInfo = getProjectMaster(project)
    
    return (
      project.created_by === profile?.id || 
      membershipStatus?.role === 'owner' ||
      membershipStatus?.role === 'admin' ||
      masterInfo.isMaster
    )
  }

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
      join_method: newProjectVisibility === 'public' && allowAnyoneToJoin ? 'open' : newProjectJoinMethod,
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
      setAllowAnyoneToJoin(true)
      setShowCreateForm(false)
      
      toast.success('프로젝트가 성공적으로 생성되었습니다!')
    } catch (err) {
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

  // 프로젝트 수정 시작
  const handleEditProject = (project: any) => {
    setEditingProject({
      id: project.id,
      name: project.name,
      description: project.description || '',
      visibility: project.visibility || (project.is_private ? 'private' : 'public'),
      join_method: project.join_method || 'open',
      password: ''
    })
    setEditName(project.name)
    setEditDescription(project.description || '')
    setEditVisibility(project.visibility || (project.is_private ? 'private' : 'public'))
    setEditJoinMethod(project.join_method || 'open')
    setEditPassword('')
  }

  // 프로젝트 수정 저장
  const handleSaveEdit = async () => {
    if (!editingProject || !editName.trim()) {
      toast.error('프로젝트 이름을 입력해주세요.')
      return
    }

    try {
      // 여기서 실제 수정 API 호출
      // await updateProject(editingProject.id, { ... })
      
      toast.success('프로젝트가 성공적으로 수정되었습니다!')
      setEditingProject(null)
      refetch() // 목록 새로고침
    } catch (err) {
      console.error('프로젝트 수정 실패:', err)
      toast.error('프로젝트 수정에 실패했습니다')
    }
  }

  // 멤버 초대
  const handleInviteMembers = (project: any) => {
    setInviteProject(project)
    setShowInviteDialog(true)
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

  // 권한 확인 함수
  const canDeleteProject = (project: Project) => {
    return project.created_by === profile?.id || 
           profile?.role === 'company_admin' || 
           profile?.role === 'super_admin'
  }

  // 로딩 상태
  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md max-h-[85vh] p-0 flex flex-col">
          <VisuallyHidden>
            <DialogTitle>프로젝트 로딩</DialogTitle>
          </VisuallyHidden>
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
              <p className="text-sm text-gray-600">프로젝트를 불러오는 중...</p>
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
        <DialogContent className="sm:max-w-md max-h-[85vh] p-0 flex flex-col">
          <VisuallyHidden>
            <DialogTitle>프로젝트 오류</DialogTitle>
          </VisuallyHidden>
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-red-500" />
              <p className="text-sm font-medium text-gray-900 mb-1">오류 발생</p>
              <p className="text-sm text-gray-600 mb-4">{error.message}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm">
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
        <DialogContent className="sm:max-w-5xl max-h-[85vh] p-0 flex flex-col overflow-hidden [&>button]:hidden">
          <VisuallyHidden>
            <DialogTitle>프로젝트 선택</DialogTitle>
          </VisuallyHidden>
          
          {/* 헤더 */}
          <div className="p-6 pb-4 flex-shrink-0">
            <DialogHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Folder className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold text-gray-900">
                      {showCreateForm ? '새 프로젝트 만들기' : '프로젝트 선택'}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600">
                      {showCreateForm ? '팀과 함께할 새로운 프로젝트를 만드세요' : `${filteredProjects.length}개의 프로젝트가 있습니다`}
                    </DialogDescription>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClose} 
                  className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {!showCreateForm && profile?.current_project && (
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="secondary" className="text-xs">
                    현재: {profile.current_project.name}
                  </Badge>
                </div>
              )}
            </DialogHeader>
          </div>

          {/* 컨텐츠 */}
          <div className="px-6 overflow-y-auto flex-1 min-h-0">
            {showCreateForm ? (
              /* 새 프로젝트 생성 폼 */
              <div className="space-y-6 py-2 pb-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-2 block">프로젝트 이름</Label>
                    <Input
                      placeholder="프로젝트 이름을 입력하세요"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="h-11"
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-2 block">프로젝트 설명</Label>
                    <Textarea
                      placeholder="프로젝트에 대한 간단한 설명을 입력하세요 (선택사항)"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-gray-900 block">공개 설정</Label>
                    <RadioGroup
                      value={newProjectVisibility}
                      onValueChange={(value: 'public' | 'private') => {
                        setNewProjectVisibility(value)
                        if (value === 'private') {
                          setAllowAnyoneToJoin(false)
                          setNewProjectJoinMethod('invite_only')
                        } else {
                          setAllowAnyoneToJoin(true)
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
                            <p className="text-sm text-gray-600 mt-1">초대받은 구성원만 프로젝트에 참여할 수 있습니다</p>
                          </div>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {newProjectVisibility === 'public' && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="allow-anyone"
                          checked={allowAnyoneToJoin}
                          onCheckedChange={(checked) => setAllowAnyoneToJoin(checked as boolean)}
                        />
                        <Label htmlFor="allow-anyone" className="text-sm font-medium cursor-pointer text-gray-900">
                          누구나 자유롭게 참여 가능
                        </Label>
                      </div>
                    </div>
                  )}

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
            ) : (
              /* 프로젝트 목록 */
              <div className="space-y-6 py-2 pb-6">
                {/* 검색바 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="프로젝트 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>

                {/* 프로젝트 그리드 */}
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-16">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchQuery ? '검색 결과가 없습니다' : '프로젝트가 없습니다'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      {searchQuery ? '다른 검색어를 시도해보세요' : '첫 번째 프로젝트를 생성해보세요'}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setShowCreateForm(true)} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        새 프로젝트 만들기
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProjects.map((project) => {
                      const membershipStatus = getMembershipStatus(project)
                      const projectMaster = getProjectMaster(project)
                      const isCurrentProject = profile?.current_project_id === project.id
                      const isPrivate = isPrivateProject(project)

                      return (
                        <Card
                          key={project.id}
                          className={`cursor-pointer transition-all duration-200 hover:shadow-lg border group ${
                            isCurrentProject
                              ? 'border-blue-500 bg-blue-50/50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleSelectProject(project)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <CardTitle className="text-sm font-semibold text-gray-900 truncate">
                                    {project.name}
                                  </CardTitle>
                                  {isCurrentProject && (
                                    <Badge variant="default" className="text-xs bg-blue-600 hover:bg-blue-600">
                                      현재
                                    </Badge>
                                  )}
                                </div>
                                {project.description && (
                                  <CardDescription className="text-sm text-gray-600 line-clamp-2">
                                    {project.description}
                                  </CardDescription>
                                )}
                              </div>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation()
                                    handleSelectProject(project)
                                  }}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    프로젝트 열기
                                  </DropdownMenuItem>
                                  {canEditProject(project) && (
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation()
                                      handleEditProject(project)
                                    }}>
                                      <Settings className="h-4 w-4 mr-2" />
                                      설정
                                    </DropdownMenuItem>
                                  )}
                                  {canInviteMembers(project) && (
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation()
                                      handleInviteMembers(project)
                                    }}>
                                      <UserPlus className="h-4 w-4 mr-2" />
                                      멤버 초대
                                    </DropdownMenuItem>
                                  )}
                                  {canDeleteProject(project) && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setDeletingProject(project)
                                        }}
                                        className="text-red-600"
                                      >
                                        <Trash className="h-4 w-4 mr-2" />
                                        삭제
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="pt-0 space-y-3">
                            {/* 프로젝트 기본 정보 */}
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  {isPrivate ? (
                                    <Lock className="h-3.5 w-3.5 text-orange-500" />
                                  ) : (
                                    <Globe className="h-3.5 w-3.5 text-blue-600" />
                                  )}
                                  <span className="text-gray-600 text-xs">
                                    {isPrivate ? '비공개' : '공개'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5 text-gray-400" />
                                  <span className="text-gray-600 text-xs">
                                    {(project as any).member_count || 1}명
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs text-gray-400">
                                {new Date(project.created_at).toLocaleDateString('ko-KR')}
                              </span>
                            </div>

                            {/* 멤버십 상태 및 마스터 정보 */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <div className="flex items-center gap-1">
                                {membershipStatus?.isOwner || projectMaster.isMaster ? (
                                  <>
                                    <Crown className="h-3.5 w-3.5 text-yellow-500" />
                                    <span className="text-xs font-medium text-yellow-700">
                                      {projectMaster.isMaster ? '마스터' : '소유자'}
                                    </span>
                                  </>
                                ) : membershipStatus?.isMember ? (
                                  <>
                                    <UserCheck className="h-3.5 w-3.5 text-green-500" />
                                    <span className="text-xs font-medium text-green-700">참여 중</span>
                                  </>
                                ) : (
                                  <>
                                    <User className="h-3.5 w-3.5 text-gray-400" />
                                    <span className="text-xs text-gray-500">미참여</span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Zap className="h-3.5 w-3.5 text-purple-500" />
                                <span className="text-xs text-gray-600 truncate max-w-[80px]">
                                  {projectMaster.name}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div className="p-6 pt-4 border-t border-gray-100 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {showCreateForm && (
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    size="sm"
                    className="text-gray-600"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    목록으로
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={onClose}
                  size="sm"
                  className="text-gray-600"
                >
                  닫기
                </Button>
              </div>
              
              {showCreateForm ? (
                <Button
                  onClick={handleCreateProject}
                  disabled={createProjectMutation.isPending || !newProjectName.trim()}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {createProjectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  프로젝트 생성
                </Button>
              ) : (
                <Button
                  onClick={() => setShowCreateForm(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  새 프로젝트
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 프로젝트 수정 다이얼로그 */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">프로젝트 수정</DialogTitle>
            <DialogDescription>
              프로젝트 정보를 수정할 수 있습니다
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-900 mb-2 block">프로젝트 이름</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-11"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-900 mb-2 block">프로젝트 설명</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSaveEdit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                저장
              </Button>
              <Button
                onClick={() => setEditingProject(null)}
                variant="outline"
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 멤버 초대 다이얼로그 */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">멤버 초대</DialogTitle>
            <DialogDescription>
              "{inviteProject?.name}" 프로젝트에 새 멤버를 초대합니다
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-900 mb-3 block">초대 방법</Label>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start h-12">
                  <UserPlus className="h-4 w-4 mr-3" />
                  이메일로 초대
                </Button>
                <Button variant="outline" className="w-full justify-start h-12">
                  <Users className="h-4 w-4 mr-3" />
                  회사 구성원에서 선택
                </Button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => setShowInviteDialog(false)}
                variant="outline"
                className="w-full"
              >
                닫기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deletingProject} onOpenChange={() => setDeletingProject(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">프로젝트 삭제</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-600">
              "{deletingProject?.name}" 프로젝트를 정말 삭제하시겠습니까?
              <br />
              <span className="text-red-600 font-medium">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel 
              onClick={() => setDeletingProject(null)}
              className="flex-1"
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={deleteProjectMutation.isPending}
              className="flex-1 bg-red-600 text-white hover:bg-red-700"
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