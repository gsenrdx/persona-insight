'use client'

import { useState } from 'react'
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, Users, Plus, FolderOpen, Loader2, MoreHorizontal, Edit, Globe, Lock, Search, Crown, UserCheck, User, Zap, Settings, UserPlus, Eye, PieChart } from "lucide-react"
import { useProjects, useCreateProject, CreateProjectData } from '@/hooks/use-projects'
import { ProjectWithMembership } from '@/types'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import UserMenu from "@/components/auth/user-menu"
import CompanyBranding from "@/components/auth/company-branding"
import { Navigation } from "@/components/shared"
import { PersonaCriteriaModal } from '@/components/modal'

// 프로젝트 수정을 위한 인터페이스
interface ProjectEditData {
  id: string
  name: string
  description: string
  visibility: 'public' | 'private'
  join_method: 'open' | 'invite_only' | 'password'
  password?: string
}

const ProjectCard = ({ project, onEdit, onInvite, onSelect }: { 
  project: ProjectWithMembership, 
  onEdit: (project: ProjectWithMembership) => void,
  onInvite: (project: ProjectWithMembership) => void,
  onSelect: (project: ProjectWithMembership) => void
}) => {
  const { profile } = useAuth()
  
  // 멤버십 상태 확인
  const getMembershipStatus = (project: ProjectWithMembership) => {
    if (!profile?.id) return null
    
    if (project.created_by === profile.id) {
      return { isMember: true, role: 'owner', isOwner: true }
    }
    
    if (project.membership && project.membership.is_member) {
      return { 
        isMember: true, 
        role: project.membership.role, 
        isOwner: project.membership.role === 'owner' 
      }
    }
    
    return { isMember: false, role: null, isOwner: false }
  }

  // 프로젝트 마스터 정보
  const getProjectMaster = (project: ProjectWithMembership) => {
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
  const isPrivateProject = (project: ProjectWithMembership) => {
    return project.visibility === 'private' || project.is_private === true
  }

  // 권한 확인 함수들
  const canEditProject = (project: ProjectWithMembership) => {
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

  const canInviteMembers = (project: ProjectWithMembership) => {
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


  const membershipStatus = getMembershipStatus(project)
  const projectMaster = getProjectMaster(project)
  
  const isPrivate = isPrivateProject(project)

  // 팀 멤버 타입 정의
  interface TeamMember {
    name: string
    initial: string
    role: string
    avatar_url: string | null
  }

  // 팀 멤버 정보 가져오기 (실제 데이터 사용)
  const getTeamMembers = (): TeamMember[] => {
    const members: TeamMember[] = []
    
    // top_members 데이터가 있으면 사용
    if (project.top_members && Array.isArray(project.top_members)) {
      return project.top_members.slice(0, 4).map((member: any) => ({
        name: member.name || 'Unknown User',
        initial: (member.name?.[0] || 'U').toUpperCase(),
        role: member.role || 'member',
        avatar_url: member.avatar_url || null
      }))
    }
    
    // fallback: 기존 로직 (현재 사용자만 표시)
    if (projectMaster.isMaster) {
      members.push({ 
        name: profile?.name || '마스터', 
        initial: (profile?.name?.[0] || 'M').toUpperCase(),
        role: 'owner',
        avatar_url: profile?.avatar_url || null
      })
    }
    
    // 추가 멤버들 (가상 데이터로 채우기)
    const additionalMembers = Math.max(0, (project.member_count || 1) - 1)
    for (let i = 0; i < Math.min(additionalMembers, 3); i++) {
      members.push({ 
        name: `멤버${i + 1}`, 
        initial: `${i + 1}`,
        role: 'member',
        avatar_url: null
      })
    }
    
    return members
  }

  const teamMembers = getTeamMembers()

  return (
    <Card
      className="bg-white hover:shadow-lg transition-shadow duration-300 h-full flex flex-col cursor-pointer group"
      onClick={() => onSelect(project)}
    >
      <CardContent className="p-4 flex-grow">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-slate-800 line-clamp-1">{project.name}</h3>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {project.description && (
          <p className="text-slate-600 mb-3 text-xs line-clamp-2">{project.description}</p>
        )}
        
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
          <span className="flex items-center">
            <FileText className="w-3.5 h-3.5 mr-1" />
            {project.interview_count || 0}개 인터뷰
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {teamMembers.slice(0, 4).map((member, index) => (
              <Avatar key={index} className="w-7 h-7 border-2 border-white">
                {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.name} />}
                <AvatarFallback className={`text-white text-xs ${
                  member.role === 'owner' ? 'bg-yellow-500' :
                  member.role === 'admin' ? 'bg-blue-500' : 
                  'bg-indigo-500'
                }`}>
                  {member.initial}
                </AvatarFallback>
              </Avatar>
            ))}
            {(project.member_count || 1) > 4 && (
              <Avatar className="w-7 h-7 border-2 border-white">
                <AvatarFallback className="bg-gray-400 text-white text-xs">
                  +{(project.member_count || 1) - 4}
                </AvatarFallback>
              </Avatar>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isPrivate && (
              <Lock className="h-3.5 w-3.5 text-orange-500" />
            )}
            {membershipStatus?.isOwner || projectMaster.isMaster ? (
              <Crown className="h-3.5 w-3.5 text-yellow-500" />
            ) : membershipStatus?.isMember ? (
              <UserCheck className="h-3.5 w-3.5 text-green-500" />
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProjectPageContent() {
  const router = useRouter()
  const { profile } = useAuth()
  const { data: projects = [], isLoading: loading, error, refetch } = useProjects(
    profile?.company_id || undefined, 
    profile?.id || undefined
  )
  const createProjectMutation = useCreateProject()
  
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
  
  
  // 초대 관련 (추후 구현)
  const [inviteProject, setInviteProject] = useState<ProjectWithMembership | null>(null)

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
      // 프로젝트 생성 실패 처리
    }
  }

  // 프로젝트 선택 (프로젝트 상세 페이지로 이동)
  const handleSelectProject = async (project: ProjectWithMembership) => {
    router.push(`/projects/${project.id}`)
  }

  // 프로젝트 편집
  const handleEditProject = (project: ProjectWithMembership) => {
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


  if (loading) {
    return (
      <>
        {/* 헤더 스켈레톤 */}
        <header className="container mx-auto px-4 py-8 relative z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-9 w-9 bg-gray-200 rounded-full animate-pulse" />
            </div>
          </div>
        </header>

        {/* 메인 컨텐츠 스켈레톤 */}
        <main className="container mx-auto px-4 py-8 relative z-10">
          {/* 헤더 섹션 스켈레톤 */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="h-9 w-48 bg-gray-200 rounded mb-2 animate-pulse" />
              <div className="h-5 w-64 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex gap-4">
              <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-36 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>

          {/* 검색바 스켈레톤 */}
          <div className="mb-6">
            <div className="h-10 w-full max-w-md bg-gray-200 rounded-lg animate-pulse" />
          </div>

          {/* 프로젝트 카드 스켈레톤 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                <div className="flex items-start justify-between mb-2">
                  {/* 프로젝트 이름 */}
                  <div className="h-6 w-3/4 bg-gray-200 rounded" />
                  {/* 더보기 버튼 */}
                  <div className="h-6 w-6 bg-gray-200 rounded" />
                </div>
                
                {/* 설명 */}
                <div className="space-y-2 mb-3">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-2/3 bg-gray-200 rounded" />
                </div>
                
                {/* 인터뷰 수 */}
                <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
                
                {/* 하단 멤버 아바타와 아이콘 */}
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {Array.from({ length: 3 }, (_, j) => (
                      <div key={j} className="w-7 h-7 bg-gray-200 rounded-full border-2 border-white" />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <div className="h-4 w-4 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </>
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleEditProject}
                onInvite={setInviteProject}
                onSelect={handleSelectProject}
              />
            ))}
          </div>
        )}
      </main>

      {/* 프로젝트 생성 다이얼로그 */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
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


      <PersonaCriteriaModal 
        open={showPersonaCriteriaModal}
        onOpenChange={setShowPersonaCriteriaModal}
      />
    </>
  )
} 