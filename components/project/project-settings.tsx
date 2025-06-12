'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Settings, 
  Edit, 
  Trash2, 
  Users, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  Calendar,
  Target,
  FlaskConical,
  Shield,
  Crown,
  UserCheck,
  UserPlus,
  AlertCircle,
  BarChart3,
  FileText,
  UserCircle
} from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { supabase } from '@/lib/supabase'

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
  persona_count?: number
  purpose?: string
  target_audience?: string
  research_method?: string
  start_date?: string
  end_date?: string
}

interface ProjectMember {
  id: string
  user_id: string
  project_id: string
  role: string
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
  const { profile } = useAuth()
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({
    name: project.name,
    description: project.description,
    visibility: project.visibility,
    join_method: project.join_method,
    purpose: project.purpose || '',
    target_audience: project.target_audience || '',
    research_method: project.research_method || '',
    start_date: project.start_date || '',
    end_date: project.end_date || ''
  })
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  const canEdit = profile?.id === project.created_by
  const canDelete = profile?.id === project.created_by

  // 멤버 목록 가져오기
  useEffect(() => {
    fetchMembers()
  }, [project.id])

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true)
      // Supabase 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('No access token available')
        return
      }

      const response = await fetch(`/api/supabase/projects/${project.id}/members`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        setMembers(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/supabase/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editData,
          user_id: profile?.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '프로젝트 수정에 실패했습니다')
      }

      const result = await response.json()
      onProjectUpdate(result.data)
      setEditMode(false)
      toast.success('프로젝트가 수정되었습니다')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '프로젝트 수정에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/supabase/projects/${project.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: profile?.id })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '프로젝트 삭제에 실패했습니다')
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

  const handleCancel = () => {
    setEditData({
      name: project.name,
      description: project.description,
      visibility: project.visibility,
      join_method: project.join_method,
      purpose: project.purpose || '',
      target_audience: project.target_audience || '',
      research_method: project.research_method || '',
      start_date: project.start_date || '',
      end_date: project.end_date || ''
    })
    setEditMode(false)
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3" />
      case 'admin':
        return <Shield className="h-3 w-3" />
      default:
        return <UserCheck className="h-3 w-3" />
    }
  }

  const getRoleBadge = (role: string) => {
    const roleNames: Record<string, string> = {
      owner: '소유자',
      admin: '관리자',
      member: '멤버'
    }
    
    return (
      <Badge variant={role === 'owner' ? 'default' : 'secondary'} className="h-5 text-xs">
        {roleNames[role] || role}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">프로젝트 설정</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">프로젝트의 정보를 관리하고 멤버를 확인할 수 있습니다</p>
            </div>
            <div className="flex gap-2">
              {canEdit && (
                <>
                  {editMode ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        disabled={loading}
                        className="h-9"
                      >
                        <X className="w-4 h-4 mr-1.5" />
                        취소
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleSave} 
                        disabled={loading}
                        className="h-9"
                      >
                        <Save className="w-4 h-4 mr-1.5" />
                        저장
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditMode(true)}
                      className="h-9"
                    >
                      <Edit className="w-4 h-4 mr-1.5" />
                      수정
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2열 레이아웃 */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 왼쪽 열 - 기본 정보 및 설정 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 기본 정보 */}
            <Card className={cn(
              "border shadow-sm",
              isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-2 rounded-lg",
                    isDark ? "bg-zinc-800" : "bg-zinc-100"
                  )}>
                    <Settings className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">기본 정보</CardTitle>
                    <CardDescription className="text-sm">프로젝트의 기본 정보를 설정합니다</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-sm font-medium">프로젝트 이름</Label>
                  {editMode ? (
                    <Input
                      id="name"
                      value={editData.name}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="프로젝트 이름을 입력하세요"
                      className="h-9"
                    />
                  ) : (
                    <div className={cn(
                      "px-3 py-2 rounded-lg text-sm",
                      isDark ? "bg-zinc-800" : "bg-zinc-50"
                    )}>{project.name}</div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description" className="text-sm font-medium">설명</Label>
                  {editMode ? (
                    <Textarea
                      id="description"
                      value={editData.description}
                      onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="프로젝트 설명을 입력하세요"
                      rows={3}
                      className="resize-none"
                    />
                  ) : (
                    <div className={cn(
                      "px-3 py-2 rounded-lg text-sm min-h-[80px]",
                      isDark ? "bg-zinc-800" : "bg-zinc-50"
                    )}>
                      {project.description || '설명이 없습니다.'}
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="visibility" className="text-sm font-medium">공개 설정</Label>
                    {editMode ? (
                      <Select
                        value={editData.visibility}
                        onValueChange={(value: 'public' | 'private') => 
                          setEditData(prev => ({ ...prev, visibility: value }))
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              공개
                            </div>
                          </SelectItem>
                          <SelectItem value="private">
                            <div className="flex items-center gap-2">
                              <EyeOff className="w-4 h-4" />
                              비공개
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className={cn(
                        "px-3 py-2 rounded-lg text-sm flex items-center gap-2",
                        isDark ? "bg-zinc-800" : "bg-zinc-50"
                      )}>
                        {project.visibility === 'public' ? (
                          <>
                            <Eye className="w-4 h-4 text-zinc-500" />
                            공개
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4 text-zinc-500" />
                            비공개
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="join_method" className="text-sm font-medium">참여 방법</Label>
                    {editMode ? (
                      <Select
                        value={editData.join_method}
                        onValueChange={(value: 'open' | 'invite_only' | 'password') => 
                          setEditData(prev => ({ ...prev, join_method: value }))
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">자유 참여</SelectItem>
                          <SelectItem value="invite_only">초대만</SelectItem>
                          <SelectItem value="password">비밀번호</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className={cn(
                        "px-3 py-2 rounded-lg text-sm",
                        isDark ? "bg-zinc-800" : "bg-zinc-50"
                      )}>
                        {project.join_method === 'open' && '자유 참여'}
                        {project.join_method === 'invite_only' && '초대만'}
                        {project.join_method === 'password' && '비밀번호'}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 프로젝트 세부 정보 */}
            <Card className={cn(
              "border shadow-sm",
              isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-2 rounded-lg",
                    isDark ? "bg-zinc-800" : "bg-zinc-100"
                  )}>
                    <FileText className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">프로젝트 세부 정보</CardTitle>
                    <CardDescription className="text-sm">연구 목적과 방법을 설정합니다</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="purpose" className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4 text-zinc-500" />
                    프로젝트 목적
                  </Label>
                  {editMode ? (
                    <Textarea
                      id="purpose"
                      value={editData.purpose}
                      onChange={(e) => setEditData(prev => ({ ...prev, purpose: e.target.value }))}
                      placeholder="프로젝트의 목적을 입력하세요"
                      rows={2}
                      className="resize-none"
                    />
                  ) : (
                    <div className={cn(
                      "px-3 py-2 rounded-lg text-sm min-h-[60px]",
                      isDark ? "bg-zinc-800" : "bg-zinc-50"
                    )}>
                      {project.purpose || '프로젝트 목적이 설정되지 않았습니다.'}
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="target_audience" className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-zinc-500" />
                    대상 사용자
                  </Label>
                  {editMode ? (
                    <Textarea
                      id="target_audience"
                      value={editData.target_audience}
                      onChange={(e) => setEditData(prev => ({ ...prev, target_audience: e.target.value }))}
                      placeholder="연구 대상이 되는 사용자 그룹을 설명해주세요"
                      rows={2}
                      className="resize-none"
                    />
                  ) : (
                    <div className={cn(
                      "px-3 py-2 rounded-lg text-sm min-h-[60px]",
                      isDark ? "bg-zinc-800" : "bg-zinc-50"
                    )}>
                      {project.target_audience || '대상 사용자가 설정되지 않았습니다.'}
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="research_method" className="text-sm font-medium flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-zinc-500" />
                    연구 방법
                  </Label>
                  {editMode ? (
                    <Textarea
                      id="research_method"
                      value={editData.research_method}
                      onChange={(e) => setEditData(prev => ({ ...prev, research_method: e.target.value }))}
                      placeholder="사용할 연구 방법론을 설명해주세요"
                      rows={2}
                      className="resize-none"
                    />
                  ) : (
                    <div className={cn(
                      "px-3 py-2 rounded-lg text-sm min-h-[60px]",
                      isDark ? "bg-zinc-800" : "bg-zinc-50"
                    )}>
                      {project.research_method || '연구 방법이 설정되지 않았습니다.'}
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start_date" className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-500" />
                      시작일
                    </Label>
                    {editMode ? (
                      <Input
                        id="start_date"
                        type="date"
                        value={editData.start_date}
                        onChange={(e) => setEditData(prev => ({ ...prev, start_date: e.target.value }))}
                        className="h-9"
                      />
                    ) : (
                      <div className={cn(
                        "px-3 py-2 rounded-lg text-sm",
                        isDark ? "bg-zinc-800" : "bg-zinc-50"
                      )}>
                        {project.start_date ? new Date(project.start_date).toLocaleDateString('ko-KR') : '미설정'}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="end_date" className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-500" />
                      종료일
                    </Label>
                    {editMode ? (
                      <Input
                        id="end_date"
                        type="date"
                        value={editData.end_date}
                        onChange={(e) => setEditData(prev => ({ ...prev, end_date: e.target.value }))}
                        className="h-9"
                      />
                    ) : (
                      <div className={cn(
                        "px-3 py-2 rounded-lg text-sm",
                        isDark ? "bg-zinc-800" : "bg-zinc-50"
                      )}>
                        {project.end_date ? new Date(project.end_date).toLocaleDateString('ko-KR') : '미설정'}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 위험 구역 */}
            {canDelete && (
              <Card className={cn(
                "border shadow-sm",
                "border-red-200 dark:border-red-900/50"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-red-600 dark:text-red-400">위험 구역</CardTitle>
                      <CardDescription className="text-sm">되돌릴 수 없는 작업입니다</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="h-9">
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        프로젝트 삭제
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>프로젝트를 삭제하시겠습니까?</DialogTitle>
                        <DialogDescription className="space-y-2">
                          <p>프로젝트 "{project.name}"을(를) 삭제하면 다음 데이터가 모두 삭제됩니다:</p>
                          <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                            <li>모든 인터뷰 데이터</li>
                            <li>생성된 페르소나</li>
                            <li>프로젝트 멤버 정보</li>
                            <li>프로젝트 설정 및 통계</li>
                          </ul>
                          <p className="font-medium text-red-600 dark:text-red-400">이 작업은 되돌릴 수 없습니다.</p>
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => setDeleteDialogOpen(false)}
                          disabled={loading}
                        >
                          취소
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={handleDelete}
                          disabled={loading}
                        >
                          {loading ? '삭제 중...' : '삭제'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 오른쪽 열 - 통계 및 멤버 */}
          <div className="space-y-6">
            {/* 프로젝트 통계 */}
            <Card className={cn(
              "border shadow-sm",
              isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-2 rounded-lg",
                    isDark ? "bg-zinc-800" : "bg-zinc-100"
                  )}>
                    <BarChart3 className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">프로젝트 통계</CardTitle>
                    <CardDescription className="text-sm">현재 프로젝트 현황</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div className={cn(
                    "text-center p-3 rounded-lg",
                    isDark ? "bg-blue-500/10" : "bg-blue-50"
                  )}>
                    <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                      {project.member_count || 0}
                    </div>
                    <div className="text-xs text-blue-600/80 dark:text-blue-400/80">멤버</div>
                  </div>
                  <div className={cn(
                    "text-center p-3 rounded-lg",
                    isDark ? "bg-green-500/10" : "bg-green-50"
                  )}>
                    <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
                      {project.interview_count || 0}
                    </div>
                    <div className="text-xs text-green-600/80 dark:text-green-400/80">인터뷰</div>
                  </div>
                  <div className={cn(
                    "text-center p-3 rounded-lg",
                    isDark ? "bg-purple-500/10" : "bg-purple-50"
                  )}>
                    <div className="text-2xl font-semibold text-purple-600 dark:text-purple-400">
                      {project.persona_count || 0}
                    </div>
                    <div className="text-xs text-purple-600/80 dark:text-purple-400/80">페르소나</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 프로젝트 멤버 */}
            <Card className={cn(
              "border shadow-sm",
              isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-2 rounded-lg",
                      isDark ? "bg-zinc-800" : "bg-zinc-100"
                    )}>
                      <Users className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">프로젝트 멤버</CardTitle>
                      <CardDescription className="text-sm">{members.length}명의 멤버</CardDescription>
                    </div>
                  </div>
                  {canEdit && project.visibility === 'private' && (
                    <Button size="sm" variant="outline" className="h-8">
                      <UserPlus className="w-3.5 h-3.5 mr-1" />
                      초대
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loadingMembers ? (
                    <div className="text-center py-8 text-sm text-zinc-500">
                      멤버 목록을 불러오는 중...
                    </div>
                  ) : members.length > 0 ? (
                    members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={member.profile.avatar_url} />
                            <AvatarFallback className="text-xs">
                              <UserCircle className="h-5 w-5 text-zinc-400" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.profile.name}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{member.profile.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getRoleBadge(member.role)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-sm text-zinc-500">
                      아직 멤버가 없습니다
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}