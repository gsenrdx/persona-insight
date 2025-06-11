'use client'

import { useState } from 'react'
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, Users, Plus, FolderOpen, Loader2, MoreHorizontal, Edit, Trash, Globe, Lock, Search, Crown, UserCheck, User, Zap, Settings, UserPlus, Eye, PieChart } from "lucide-react"
import { useProjects, useCreateProject, useDeleteProject, Project, CreateProjectData } from '@/hooks/use-projects'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import UserMenu from "@/components/auth/user-menu"
import CompanyBranding from "@/components/auth/company-branding"
import { Navigation } from "@/components/shared"
import { PersonaCriteriaModal } from './persona-criteria-modal'

// 프로젝트 수정을 위한 인터페이스
interface ProjectEditData {
  id: string
  name: string
  description: string
  visibility: 'public' | 'private'
  join_method: 'open' | 'invite_only' | 'password'
  password?: string
}

const ProjectCard = ({ project, onEdit, onInvite, onDelete, onSelect }: { 
  project: any, 
  onEdit: (project: any) => void,
  onInvite: (project: any) => void,
  onDelete: (project: any) => void,
  onSelect: (project: any) => void
}) => {
  const { profile } = useAuth()
  
  // 멤버십 상태 확인
  const getMembershipStatus = (project: any) => {
    if (!profile?.id) return null
    
    if (project.created_by === profile.id) {
      return { isMember: true, role: 'owner', isOwner: true }
    }
    
    if (project.membership) {
      return { 
        isMember: true, 
        role: project.membership.role, 
        isOwner: project.membership.role === 'owner' 
      }
    }
    
    return { isMember: false, role: null, isOwner: false }
  }

  // 프로젝트 마스터 정보
  const getProjectMaster = (project: any) => {
    if (project.master_id) {
      return {
        name: profile?.id === project.master_id ? (profile?.name || '마스터') : '마스터',
        userId: project.master_id,
        isMaster: profile?.id === project.master_id
      }
    }
    
    return {
      name: profile?.id === project.created_by ? (profile?.name || '생성자') : '생성자',
      userId: project.created_by,
      isMaster: profile?.id === project.created_by
    }
  }

  // 공개 설정 확인
  const isPrivateProject = (project: any) => {
    return project.visibility === 'private' || project.is_private === true
  }

  // 권한 확인 함수들
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

  const canDeleteProject = (project: any) => {
    return (
      project.created_by === profile?.id || 
      profile?.role === 'company_admin' || 
      profile?.role === 'super_admin'
    )
  }

  const membershipStatus = getMembershipStatus(project)
  const projectMaster = getProjectMaster(project)
  
  const isPrivate = isPrivateProject(project)

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-lg border group border-gray-200 hover:border-gray-300"
      onClick={() => onSelect(project)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-sm font-semibold text-gray-900 truncate">
                {project.name}
              </CardTitle>
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
                onSelect(project)
              }}>
                <Eye className="h-4 w-4 mr-2" />
                프로젝트 열기
              </DropdownMenuItem>
              {canEditProject(project) && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  onEdit(project)
                }}>
                  <Settings className="h-4 w-4 mr-2" />
                  설정
                </DropdownMenuItem>
              )}
              {canInviteMembers(project) && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  onInvite(project)
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
                      onDelete(project)
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
        {/* 프로젝트 통계 */}
        <div className="flex items-center space-x-4 text-sm text-slate-500 mb-4">
          <span className="flex items-center">
            <FileText className="w-4 h-4 mr-1.5" />
            {project.interview_count || 0}개 인터뷰
          </span>
          <span className="flex items-center">
            <Users className="w-4 h-4 mr-1.5" />
            {project.persona_count || 0}개 페르소나
          </span>
        </div>

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
                {project.member_count || 1}명
              </span>
            </div>
          </div>
          <span className="text-xs text-gray-400">
            {new Date(project.created_at).toLocaleDateString('ko-KR')}
          </span>
        </div>

        {/* 멤버십 상태 */}
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
            <span className="text-xs text-purple-600">활성</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProjectPageContent() {
  const { profile } = useAuth()
  const { data: projects = [], isLoading: loading, error, refetch } = useProjects(
    profile?.company_id || undefined, 
    profile?.id || undefined
  )
  const createProjectMutation = useCreateProject()
  const deleteProjectMutation = useDeleteProject()
  
  // 상태 관리
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showPersonaCriteriaModal, setShowPersonaCriteriaModal] = useState(false)
  
  // 새 프로젝트 생성 관련
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [newProjectVisibility, setNewProjectVisibility] = useState<'public' | 'private'>('public')
  const [newProjectJoinMethod, setNewProjectJoinMethod] = useState<'open' | 'invite_only' | 'password'>('open')
  const [newProjectPassword, setNewProjectPassword] = useState('')
  const [allowAnyoneToJoin, setAllowAnyoneToJoin] = useState(true)
  const [newProjectPurpose, setNewProjectPurpose] = useState('')
  const [newProjectTargetAudience, setNewProjectTargetAudience] = useState('')
  const [newProjectResearchMethod, setNewProjectResearchMethod] = useState('')
  const [newProjectStartDate, setNewProjectStartDate] = useState('')
  const [newProjectEndDate, setNewProjectEndDate] = useState('')
  
  // 편집 관련
  const [editingProject, setEditingProject] = useState<ProjectEditData | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  
  // 삭제 관련
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  
  // 초대 관련 (추후 구현)
  const [inviteProject, setInviteProject] = useState<any>(null)

  // 프로젝트 필터링
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

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
      password: newProjectJoinMethod === 'password' ? newProjectPassword : undefined,
      purpose: newProjectPurpose.trim() || undefined,
      target_audience: newProjectTargetAudience.trim() || undefined,
      research_method: newProjectResearchMethod.trim() || undefined,
      start_date: newProjectStartDate || undefined,
      end_date: newProjectEndDate || undefined
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
      setNewProjectPurpose('')
      setNewProjectTargetAudience('')
      setNewProjectResearchMethod('')
      setNewProjectStartDate('')
      setNewProjectEndDate('')
      setShowCreateForm(false)
      
      toast.success('프로젝트가 성공적으로 생성되었습니다!')
    } catch (err) {
      console.error('프로젝트 생성 실패:', err)
    }
  }

  // 프로젝트 선택 (프로젝트 상세 페이지로 이동)
  const handleSelectProject = async (project: Project) => {
    window.location.href = `/projects/${project.id}`
  }

  // 프로젝트 편집
  const handleEditProject = (project: any) => {
    setEditingProject({
      id: project.id,
      name: project.name,
      description: project.description || '',
      visibility: project.visibility || 'public',
      join_method: project.join_method || 'open',
      password: project.password || ''
    })
    setEditName(project.name)
    setEditDescription(project.description || '')
  }

  // 프로젝트 삭제
  const handleDeleteProject = async () => {
    if (!deletingProject || !profile?.id) return

    try {
      await deleteProjectMutation.mutateAsync({
        projectId: deletingProject.id,
        userId: profile.id
      })
      toast.success('프로젝트가 삭제되었습니다')
      setDeletingProject(null)
    } catch (error) {
      console.error('프로젝트 삭제 실패:', error)
      toast.error('프로젝트 삭제에 실패했습니다')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 rounded mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 relative z-10 text-center">
        <p className="text-red-500 mb-4">프로젝트를 불러오는 중 오류가 발생했습니다.</p>
        <Button variant="outline" onClick={() => refetch()}>다시 시도</Button>
      </div>
    )
  }

  return (
    <>
      {/* 헤더 */}
      <header className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-baseline">
                <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Persona Insight</h2>
                <CompanyBranding />
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Navigation />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* 헤더 섹션 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              프로젝트 목록 ({filteredProjects.length})
            </h1>
            <p className="text-slate-600">팀과 함께 고객 인사이트를 발견하고 공유하세요</p>
          </div>
          <div className="flex gap-3">
            <Button 
              className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm font-medium text-sm px-4 py-2 h-9"
              onClick={() => setShowPersonaCriteriaModal(true)}
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              페르소나 분류 기준
            </Button>
            <Button onClick={() => setShowCreateForm(true)} className="bg-blue-500 hover:bg-blue-600 text-white shadow-sm font-medium text-sm px-4 py-2 h-9">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              새 프로젝트
            </Button>
          </div>
        </div>

        {/* 검색 바 */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="프로젝트 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 max-w-md"
          />
        </div>

        {/* 프로젝트 그리드 */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? '검색 결과가 없습니다' : '프로젝트가 없습니다'}
            </h3>
            <p className="text-gray-500 mb-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleEditProject}
                onInvite={setInviteProject}
                onDelete={setDeletingProject}
                onSelect={handleSelectProject}
              />
            ))}
          </div>
        )}
      </main>

      {/* 프로젝트 생성 다이얼로그 */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
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
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              취소
            </Button>
            <Button 
              onClick={handleCreateProject}
              disabled={createProjectMutation.isPending || !newProjectName.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createProjectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              프로젝트 만들기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deletingProject} onOpenChange={() => setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프로젝트 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingProject?.name}" 프로젝트를 삭제하시겠습니까? 
              이 작업은 되돌릴 수 없으며, 프로젝트의 모든 데이터가 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProject}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PersonaCriteriaModal 
        open={showPersonaCriteriaModal}
        onOpenChange={setShowPersonaCriteriaModal}
      />
    </>
  )
} 