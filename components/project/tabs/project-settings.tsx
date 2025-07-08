'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { InviteMemberDialog } from '../components/invite-member-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Settings, 
  Edit, 
  Trash2, 
  Users, 
  Save,
  UserPlus,
  Crown,
  Shield,
  Lock,
  Globe,
  Calendar,
  AlertTriangle,
  Target,
  FileSearch,
  Flag,
  CalendarDays,
  ToggleLeft,
  ToggleRight,
  Key
} from "lucide-react"
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { projectsApi } from '@/lib/api'

interface Project {
  id: string
  name: string
  description: string
  company_id: string
  created_by: string
  visibility: 'public' | 'private'
  join_method: 'open' | 'invite_only' | 'password'
  created_at: string
  member_count?: number
  interview_count?: number
  password?: string
  purpose?: string
  target_audience?: string
  research_method?: string
  start_date?: string
  end_date?: string
  is_active?: boolean
}

interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  profile: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
}

interface ProjectSettingsProps {
  project: Project
  onProjectUpdate: (project: Project) => void
}

export default function ProjectSettings({ project, onProjectUpdate }: ProjectSettingsProps) {
  const router = useRouter()
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [changingMemberRole, setChangingMemberRole] = useState<string | null>(null)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  
  const [editData, setEditData] = useState({
    name: project.name,
    description: project.description || '',
    visibility: project.visibility,
    join_method: project.join_method,
    password: project.password || '',
    purpose: project.purpose || '',
    target_audience: project.target_audience || '',
    research_method: project.research_method || '',
    start_date: project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '',
    end_date: project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : '',
    is_active: project.is_active ?? true
  })

  // 프로젝트 멤버 조회
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: queryKeys.projects.member(project.id),
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      const response = await projectsApi.getProjectMembers(session.access_token, project.id)
      return response.data as ProjectMember[]
    }
  })


  // 현재 사용자의 역할 확인
  const currentUserMember = members.find(m => m.user_id === profile?.id)
  const isProjectCreator = project.created_by === profile?.id
  const canEdit = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin' || isProjectCreator
  const canDelete = currentUserMember?.role === 'owner' || isProjectCreator

  const handleSave = async () => {
    if (!canEdit) return
    
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...editData,
          start_date: editData.start_date ? new Date(editData.start_date).toISOString() : null,
          end_date: editData.end_date ? new Date(editData.end_date).toISOString() : null
        })
      })

      if (!response.ok) {
        throw new Error('프로젝트 수정에 실패했습니다')
      }

      const { data } = await response.json()
      onProjectUpdate(data)
      setEditMode(false)
      toast.success('프로젝트가 수정되었습니다')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '프로젝트 수정에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'member') => {
    if (!canEdit) return
    
    setChangingMemberRole(memberId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      
      const response = await fetch(`/api/projects/${project.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) {
        throw new Error('역할 변경에 실패했습니다')
      }

      toast.success('멤버 역할이 변경되었습니다')
      // Refetch members
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.member(project.id) })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '역할 변경에 실패했습니다')
    } finally {
      setChangingMemberRole(null)
    }
  }

  const handleDelete = async () => {
    if (!canDelete) return
    
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('인증 토큰을 찾을 수 없습니다')
      
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        throw new Error('프로젝트 삭제에 실패했습니다')
      }

      toast.success('프로젝트가 삭제되었습니다')
      router.push('/projects')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '프로젝트 삭제에 실패했습니다')
    } finally {
      setLoading(false)
      setDeleteDialogOpen(false)
      setDeleteConfirmText('')
    }
  }

  const handleInviteMembers = async (userIds: string[]) => {
    if (!profile?.id || !project) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      toast.error('인증 토큰을 찾을 수 없습니다')
      throw new Error('Authentication required')
    }

    // Add members to project
    for (const userId of userIds) {
      const { error } = await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: userId,
          role: 'member',
          joined_at: new Date().toISOString()
        })

      if (error) {
        throw error
      }
    }

    // Refresh members list
    await queryClient.invalidateQueries({ queryKey: queryKeys.projects.member(project.id) })
  }

  const getRoleBadge = (role: string, userId?: string) => {
    const roleConfig = {
      owner: { label: '소유자', variant: 'default' as const, className: 'bg-amber-100 text-amber-700 border-amber-200' },
      admin: { label: '관리자', variant: 'secondary' as const, className: 'bg-blue-100 text-blue-700 border-blue-200' },
      member: { label: '멤버', variant: 'outline' as const, className: 'bg-gray-100 text-gray-700 border-gray-200' }
    }
    const config = roleConfig[role as keyof typeof roleConfig] || { label: role, variant: 'outline' as const, className: '' }
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 브랜드 스타일 헤더 */}
      <div className="mb-6">
        <div className="relative bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 rounded-2xl p-6 overflow-hidden">
          {/* 메인 콘텐츠 - 좌측 영역 */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-8">
              {/* 핀 캐릭터 - 좌측에 배치 */}
              <div className="w-24 h-24 flex-shrink-0">
                <img 
                  src="/assets/pin/pin-setting.png" 
                  alt="Pin character with settings"
                  className="w-full h-full object-contain drop-shadow-lg"
                  onError={(e) => {
                    // 이미지가 없으면 기본 핀 캐릭터 사용
                    const img = e.target as HTMLImageElement;
                    img.src = "/assets/pin/pin-interview-list.png";
                  }}
                />
              </div>
              
              {/* 텍스트 콘텐츠 */}
              <div>
                <div className="flex items-baseline gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    프로젝트 설정
                  </h1>
                </div>
                
                <p className="text-sm text-gray-600">
                  프로젝트 정보를 관리하고 팀원들과 협업해보세요
                </p>
              </div>
            </div>
            
            {/* 우측 액션 버튼 */}
            {canEdit && (
              <div className="flex items-center gap-3">
                {editMode ? (
                  <>
                    <Button 
                      variant="ghost" 
                      size="default"
                      onClick={() => setEditMode(false)} 
                      disabled={loading}
                      className="h-10 w-auto px-4 rounded-xl hover:bg-white/70 transition-all duration-200 border border-white/40 backdrop-blur-sm"
                    >
                      취소
                    </Button>
                    <Button 
                      onClick={handleSave} 
                      disabled={loading}
                      className="bg-white/90 hover:bg-white text-gray-800 hover:text-gray-900 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200/60 backdrop-blur-sm px-4 py-2.5 h-10 rounded-xl font-medium"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      저장
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="ghost" 
                    onClick={() => setEditMode(true)}
                    className="bg-white/90 hover:bg-white text-gray-800 hover:text-gray-900 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200/60 backdrop-blur-sm px-4 py-2.5 h-10 rounded-xl font-medium"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    편집
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* 장식용 배경 요소 - 브랜드 컬러로 통일 */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-200/25 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-200/25 rounded-full blur-2xl" />
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-8 pb-8">
        {/* 일반 설정 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="p-8 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">일반 설정</h2>
            <p className="text-sm text-gray-600 mt-2">프로젝트 기본 정보를 수정합니다</p>
          </div>
          <div className="p-8 space-y-8">
            <div>
              <Label className="text-sm font-semibold text-gray-700">프로젝트 이름</Label>
              {editMode ? (
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="프로젝트 이름"
                  className="mt-3 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              ) : (
                <p className="text-gray-900 mt-3 font-medium">{project.name}</p>
              )}
            </div>

            <div>
              <Label className="text-sm font-semibold text-gray-700">설명</Label>
              {editMode ? (
                <Textarea
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="프로젝트 설명"
                  className="mt-3 min-h-[120px] rounded-xl border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              ) : (
                <p className="text-gray-900 mt-3 leading-relaxed">{project.description || '설명이 없습니다'}</p>
              )}
            </div>

            <div>
              <Label className="text-sm font-semibold text-gray-700">공개 설정</Label>
              {editMode ? (
                <div className="mt-3 space-y-4">
                  <Select 
                    value={editData.visibility} 
                    onValueChange={(value) => setEditData(prev => ({ ...prev, visibility: value as 'public' | 'private' }))}
                  >
                    <SelectTrigger className="rounded-xl border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="public" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          <span>공개</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="private" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          <span>비공개</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-sm text-blue-700">
                      {editData.visibility === 'public' 
                        ? '회사의 모든 멤버가 이 프로젝트를 찾고 볼 수 있습니다' 
                        : '초대된 멤버만 이 프로젝트에 접근할 수 있습니다'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="flex items-center gap-3 mb-2">
                    {project.visibility === 'public' ? <Globe className="w-5 h-5 text-green-600" /> : <Lock className="w-5 h-5 text-gray-600" />}
                    <span className="text-gray-900 font-medium">{project.visibility === 'public' ? '공개' : '비공개'}</span>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <p className="text-sm text-gray-600">
                      {project.visibility === 'public' 
                        ? '회사의 모든 멤버가 이 프로젝트를 찾고 볼 수 있습니다' 
                        : '초대된 멤버만 이 프로젝트에 접근할 수 있습니다'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-semibold text-gray-700">참여 방식</Label>
              {editMode ? (
                <div className="mt-3 space-y-4">
                  <Select 
                    value={editData.join_method} 
                    onValueChange={(value) => setEditData(prev => ({ ...prev, join_method: value as 'open' | 'invite_only' | 'password' }))}
                  >
                    <SelectTrigger className="rounded-xl border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="open" className="rounded-lg">자유 참여</SelectItem>
                      <SelectItem value="invite_only" className="rounded-lg">초대 전용</SelectItem>
                      <SelectItem value="password" className="rounded-lg">비밀번호 필요</SelectItem>
                    </SelectContent>
                  </Select>
                  {editData.join_method === 'password' && (
                    <Input
                      type="password"
                      value={editData.password}
                      onChange={(e) => setEditData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="참여 비밀번호 입력"
                      className="rounded-xl border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  )}
                </div>
              ) : (
                <div className="mt-3">
                  <div className="flex items-center gap-3">
                    {project.join_method === 'password' && <Key className="w-5 h-5 text-gray-600" />}
                    <span className="text-gray-900 font-medium">
                      {project.join_method === 'open' ? '자유 참여' : 
                       project.join_method === 'invite_only' ? '초대 전용' : '비밀번호 필요'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-semibold text-gray-700">프로젝트 상태</Label>
              {editMode ? (
                <div className="mt-3 flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditData(prev => ({ ...prev, is_active: !prev.is_active }))}
                    className={cn(
                      "gap-2 rounded-xl border-gray-200 hover:border-gray-300",
                      editData.is_active ? "text-green-600 border-green-200 bg-green-50" : "text-gray-500"
                    )}
                  >
                    {editData.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    {editData.is_active ? '활성화' : '비활성화'}
                  </Button>
                  <span className="text-sm text-gray-600">
                    {editData.is_active ? '프로젝트가 활성 상태입니다' : '프로젝트가 비활성 상태입니다'}
                  </span>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-3">
                  {project.is_active ? 
                    <span className="flex items-center gap-2 text-green-600">
                      <ToggleRight className="w-5 h-5" />
                      <span className="font-medium">활성화</span>
                    </span> : 
                    <span className="flex items-center gap-2 text-gray-500">
                      <ToggleLeft className="w-5 h-5" />
                      <span className="font-medium">비활성화</span>
                    </span>
                  }
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-semibold text-gray-700">생성일</Label>
              <div className="flex items-center gap-3 mt-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900 font-medium">
                  {new Date(project.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 프로젝트 상세 정보 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="p-8 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">프로젝트 상세 정보</h2>
            <p className="text-sm text-gray-600 mt-2">프로젝트의 목적과 대상, 리서치 방법을 설정합니다</p>
          </div>
          <div className="p-8 space-y-8">
            <div>
              <Label className="text-sm font-semibold text-gray-700">프로젝트 목적</Label>
              {editMode ? (
                <Textarea
                  value={editData.purpose}
                  onChange={(e) => setEditData(prev => ({ ...prev, purpose: e.target.value }))}
                  placeholder="프로젝트의 목적을 입력하세요"
                  className="mt-3 min-h-[100px] rounded-xl border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              ) : (
                <p className="text-gray-900 mt-3 leading-relaxed">
                  {project.purpose || '설정되지 않음'}
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm font-semibold text-gray-700">타겟 고객</Label>
              {editMode ? (
                <Input
                  value={editData.target_audience}
                  onChange={(e) => setEditData(prev => ({ ...prev, target_audience: e.target.value }))}
                  placeholder="예: 20-30대 직장인"
                  className="mt-3 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              ) : (
                <p className="text-gray-900 mt-3 font-medium">
                  {project.target_audience || '설정되지 않음'}
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm font-semibold text-gray-700">리서치 방법</Label>
              {editMode ? (
                <Input
                  value={editData.research_method}
                  onChange={(e) => setEditData(prev => ({ ...prev, research_method: e.target.value }))}
                  placeholder="예: 인터뷰, 설문조사, 관찰 등"
                  className="mt-3 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              ) : (
                <p className="text-gray-900 mt-3 font-medium">
                  {project.research_method || '설정되지 않음'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-semibold text-gray-700">시작일</Label>
                {editMode ? (
                  <Input
                    type="date"
                    value={editData.start_date}
                    onChange={(e) => setEditData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="mt-3 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                ) : (
                  <div className="flex items-center gap-3 mt-3">
                    <CalendarDays className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900 font-medium">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString('ko-KR') : '설정되지 않음'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700">종료일</Label>
                {editMode ? (
                  <Input
                    type="date"
                    value={editData.end_date}
                    onChange={(e) => setEditData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="mt-3 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                ) : (
                  <div className="flex items-center gap-3 mt-3">
                    <CalendarDays className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900 font-medium">
                      {project.end_date ? new Date(project.end_date).toLocaleDateString('ko-KR') : '설정되지 않음'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 멤버 관리 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">프로젝트 멤버</h2>
                <p className="text-sm text-gray-600 mt-2">
                  {loadingMembers ? '멤버를 로딩 중...' : `${members.length}명이 참여 중`}
                </p>
              </div>
              {canEdit && (
                <Button 
                  size="sm"
                  onClick={() => setShowInviteDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 font-medium shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  멤버 초대
                </Button>
              )}
            </div>
          </div>
          <div className="p-8">
            {loadingMembers ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">멤버를 로딩 중...</p>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-700 mb-2">아직 멤버가 없습니다</p>
                  <p className="text-sm text-gray-500">
                    {project.visibility === 'public' 
                      ? '공개 프로젝트에 참여한 멤버가 없습니다' 
                      : '이 프로젝트에 협업할 멤버를 초대해보세요'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {members.map((member) => (
                  <div key={member.id} className="bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm">
                          <AvatarImage src={member.profile.avatar_url} />
                          <AvatarFallback className="text-sm bg-blue-100 text-blue-700 font-semibold">
                            {member.profile.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 truncate">{member.profile.name}</p>
                            {member.role === 'owner' && <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-gray-600 truncate">{member.profile.email}</p>
                        </div>
                      </div>
                      {canEdit && member.role !== 'owner' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-white/70" disabled={changingMemberRole === member.id}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuLabel>역할 변경</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={member.role} onValueChange={(value) => handleRoleChange(member.id, value as 'admin' | 'member')}>
                              <DropdownMenuRadioItem value="admin" className="rounded-lg">
                                <Shield className="w-4 h-4 mr-2" />
                                관리자
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="member" className="rounded-lg">
                                <Users className="w-4 h-4 mr-2" />
                                멤버
                              </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      {getRoleBadge(member.role, member.user_id)}
                      <p className="text-xs text-gray-500 font-medium">
                        {new Date(member.joined_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 위험 구역 */}
        {canDelete && (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="p-8 border-b border-red-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">위험 구역</h2>
                  <p className="text-sm text-red-600 mt-1 font-medium">되돌릴 수 없는 작업들</p>
                </div>
              </div>
            </div>
            <div className="p-8">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <h3 className="text-base font-bold text-gray-900 mb-3">프로젝트 삭제</h3>
                <p className="text-sm text-gray-700 mb-5 leading-relaxed">
                  프로젝트를 삭제하면 모든 데이터가 영구적으로 삭제됩니다.
                </p>
                <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
                  setDeleteDialogOpen(open)
                  if (!open) setDeleteConfirmText('')
                }}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="rounded-xl px-4 py-2 font-medium shadow-md hover:shadow-lg transition-all duration-200">
                      <Trash2 className="w-4 h-4 mr-2" />
                      프로젝트 삭제
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">프로젝트를 삭제하시겠습니까?</DialogTitle>
                      <DialogDescription className="text-gray-600 leading-relaxed">
                        프로젝트와 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                        <div className="text-sm text-red-800 font-semibold mb-2">⚠️ 경고</div>
                        <div className="text-sm text-red-700 leading-relaxed">
                          삭제되는 항목: 모든 인터뷰, 페르소나, 인사이트, 멤버 정보
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="delete-confirm" className="text-sm font-semibold text-gray-700">
                          확인을 위해 프로젝트 이름 <span className="font-mono bg-gray-100 px-2 py-1 rounded-lg text-gray-800">{project.name}</span>을 입력하세요:
                        </Label>
                        <Input
                          id="delete-confirm"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="프로젝트 이름 입력"
                          className="font-mono rounded-xl border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-3">
                      <Button variant="outline" onClick={() => {
                        setDeleteDialogOpen(false)
                        setDeleteConfirmText('')
                      }} className="rounded-xl px-6 font-medium">
                        취소
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleDelete} 
                        disabled={loading || deleteConfirmText !== project.name}
                        className="rounded-xl px-6 font-medium"
                      >
                        {loading ? '삭제 중...' : '프로젝트 영구 삭제'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        projectId={project.id}
        currentMembers={members.map(m => m.user_id)}
        onInvite={handleInviteMembers}
      />
    </div>
  )
}