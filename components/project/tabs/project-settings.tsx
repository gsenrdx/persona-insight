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
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
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
  Calendar
} from "lucide-react"
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
  const [changingMemberRole, setChangingMemberRole] = useState<string | null>(null)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  
  const [editData, setEditData] = useState({
    name: project.name,
    description: project.description || '',
    visibility: project.visibility,
    join_method: project.join_method,
    password: ''
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
  const canEdit = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin'
  const canDelete = currentUserMember?.role === 'owner'

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
        body: JSON.stringify(editData)
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
        console.error('Failed to add member:', error)
        throw error
      }
    }

    // Refresh members list
    await queryClient.invalidateQueries({ queryKey: queryKeys.projects.member(project.id) })
  }

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      owner: { label: '소유자', variant: 'default' as const },
      admin: { label: '관리자', variant: 'secondary' as const },
      member: { label: '멤버', variant: 'outline' as const }
    }
    const config = roleConfig[role as keyof typeof roleConfig] || { label: role, variant: 'outline' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">프로젝트 설정</h1>
            <p className="text-sm text-muted-foreground">프로젝트 정보를 관리하고 멤버를 초대하세요</p>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <Button variant="outline" onClick={() => setEditMode(false)} disabled={loading}>
                    취소
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    저장
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  편집
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="h-px bg-gray-200 mt-6" />
      </div>

      <div className="space-y-6">
        {/* 일반 설정 */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">일반 설정</h2>
            <p className="text-sm text-muted-foreground mt-1">프로젝트 기본 정보를 수정합니다</p>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-3">
                <Label className="text-sm font-medium text-gray-700">프로젝트 이름</Label>
                <p className="text-xs text-muted-foreground mt-1">프로젝트의 고유한 이름입니다</p>
              </div>
              <div className="col-span-9">
                {editMode ? (
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="프로젝트 이름"
                    className="max-w-md"
                  />
                ) : (
                  <p className="text-sm text-gray-900 py-2">{project.name}</p>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-3">
                <Label className="text-sm font-medium text-gray-700">설명</Label>
                <p className="text-xs text-muted-foreground mt-1">프로젝트에 대한 간단한 설명</p>
              </div>
              <div className="col-span-9">
                {editMode ? (
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="프로젝트 설명"
                    className="max-w-md min-h-[100px]"
                  />
                ) : (
                  <p className="text-sm text-gray-900 py-2">{project.description || '설명이 없습니다'}</p>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-3">
                <Label className="text-sm font-medium text-gray-700">공개 설정</Label>
                <p className="text-xs text-muted-foreground mt-1">프로젝트 공개 범위</p>
              </div>
              <div className="col-span-9">
                {editMode ? (
                  <div className="space-y-3 max-w-md">
                    <Select 
                      value={editData.visibility} 
                      onValueChange={(value) => setEditData(prev => ({ ...prev, visibility: value as 'public' | 'private' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            <span>공개</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="private">
                          <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            <span>비공개</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">
                      {editData.visibility === 'public' 
                        ? '회사의 모든 멤버가 이 프로젝트를 찾고 볼 수 있습니다' 
                        : '초대된 멤버만 이 프로젝트에 접근할 수 있습니다'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {project.visibility === 'public' ? <Globe className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-gray-600" />}
                      <span className="text-sm font-medium text-gray-900">{project.visibility === 'public' ? '공개' : '비공개'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {project.visibility === 'public' 
                        ? '회사의 모든 멤버가 이 프로젝트를 찾고 볼 수 있습니다' 
                        : '초대된 멤버만 이 프로젝트에 접근할 수 있습니다'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-3">
                <Label className="text-sm font-medium text-gray-700">생성일</Label>
              </div>
              <div className="col-span-9">
                <div className="flex items-center gap-2 py-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-gray-900">
                    {new Date(project.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 멤버 관리 */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">액세스 관리</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {loadingMembers ? '멤버를 로딩 중...' : `${members.length}명의 멤버`}
                </p>
              </div>
              {canEdit && (
                <Button variant="outline" onClick={() => setShowInviteDialog(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  멤버 초대
                </Button>
              )}
            </div>
          </div>
          <div className="p-6">
            {loadingMembers ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">멤버를 로딩 중...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 관리자 및 소유자 표시 */}
                {members.filter(m => m.role === 'owner' || m.role === 'admin').map((member) => (
                  <div key={member.id} className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profile.avatar_url} />
                        <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                          {member.profile.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{member.profile.name}</p>
                          {member.role === 'owner' && <Crown className="w-3 h-3 text-amber-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{member.profile.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(member.role)}
                      {canEdit && member.role !== 'owner' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={changingMemberRole === member.id}>
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuRadioGroup value={member.role} onValueChange={(value) => handleRoleChange(member.id, value as 'admin' | 'member')}>
                              <DropdownMenuRadioItem value="admin">
                                <Shield className="w-4 h-4 mr-2" />
                                관리자
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="member">
                                <Users className="w-4 h-4 mr-2" />
                                멤버
                              </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* 일반 멤버가 있는 경우 표시 */}
                {members.filter(m => m.role === 'member').length > 0 && (
                  <>
                    <div className="py-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase">개별 멤버</p>
                    </div>
                    {members.filter(m => m.role === 'member').map((member) => (
                      <div key={member.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.profile.avatar_url} />
                            <AvatarFallback className="text-xs font-medium bg-gray-100 text-gray-600">
                              {member.profile.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{member.profile.name}</p>
                            <p className="text-xs text-muted-foreground">{member.profile.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getRoleBadge(member.role)}
                          {canEdit && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={changingMemberRole === member.id}>
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuRadioGroup value={member.role} onValueChange={(value) => handleRoleChange(member.id, value as 'admin' | 'member')}>
                                  <DropdownMenuRadioItem value="admin">
                                    <Shield className="w-4 h-4 mr-2" />
                                    관리자
                                  </DropdownMenuRadioItem>
                                  <DropdownMenuRadioItem value="member">
                                    <Users className="w-4 h-4 mr-2" />
                                    멤버
                                  </DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
                
                {members.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground mb-1">아직 멤버가 없습니다</p>
                    <p className="text-xs text-muted-foreground/80">
                      {project.visibility === 'public' 
                        ? '공개 프로젝트에 참여한 멤버가 없습니다' 
                        : '이 프로젝트에 협업할 멤버를 초대해보세요'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 위험 구역 */}
        {canDelete && (
          <div className="bg-white rounded-lg border border-red-200">
            <div className="p-6 border-b border-red-200">
              <h2 className="text-lg font-semibold text-destructive">위험 구역</h2>
              <p className="text-sm text-destructive/80 mt-1">되돌릴 수 없는 작업들</p>
            </div>
            <div className="p-6">
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">프로젝트 삭제</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  프로젝트를 삭제하면 모든 데이터가 영구적으로 삭제됩니다.
                </p>
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      프로젝트 삭제
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>프로젝트를 삭제하시겠습니까?</DialogTitle>
                      <DialogDescription>
                        프로젝트와 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                        취소
                      </Button>
                      <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading ? '삭제 중...' : '프로젝트 삭제'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        )}
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