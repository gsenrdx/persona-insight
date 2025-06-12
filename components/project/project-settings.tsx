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
  Crown,
  UserPlus,
  AlertCircle,
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
      console.log('🔄 Saving project with data:', editData)
      console.log('🔑 User ID:', profile?.id)
      console.log('📁 Project ID:', project.id)

      // Supabase 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession()
      console.log('🎫 Session token available:', !!session?.access_token)
      
      if (!session?.access_token) {
        console.error('❌ No access token available')
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.')
      }

      // 빈 문자열을 null로 변환하여 timestamp 오류 방지
      const cleanedData = {
        ...editData,
        start_date: editData.start_date || null,
        end_date: editData.end_date || null,
        user_id: profile?.id
      }

      console.log('🧹 Cleaned data:', cleanedData)

      const response = await fetch(`/api/supabase/projects/${project.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(cleanedData)
      })

      console.log('📡 Save response status:', response.status)
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()))

      const responseText = await response.text()
      console.log('📄 Raw response:', responseText)

      if (!response.ok) {
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch {
          errorData = { error: responseText }
        }
        console.error('❌ Save error:', errorData)
        throw new Error(errorData.error || '프로젝트 수정에 실패했습니다')
      }

      const result = JSON.parse(responseText)
      console.log('✅ Save result:', result)
      onProjectUpdate(result.data)
      setEditMode(false)
      toast.success('프로젝트가 수정되었습니다')
    } catch (error) {
      console.error('💥 Save error:', error)
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* GitHub 스타일 헤더 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">설정</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">이 프로젝트를 관리합니다</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {canEdit && (
                <>
                  {editMode ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        disabled={loading}
                      >
                        취소
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleSave} 
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                            저장 중...
                          </>
                        ) : (
                          '변경사항 저장'
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditMode(true)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      편집
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* GitHub 스타일 컨텐츠 */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* General */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">일반</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                프로젝트 기본 정보를 수정합니다
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Project Name */}
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-3">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    프로젝트 이름
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    프로젝트의 고유한 이름입니다
                  </p>
                </div>
                <div className="col-span-9">
                  {editMode ? (
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="프로젝트 이름을 입력하세요"
                      className="max-w-md"
                    />
                  ) : (
                    <div className="py-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {project.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6"></div>

              {/* Description */}
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-3">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    설명
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    프로젝트에 대한 간단한 설명입니다
                  </p>
                </div>
                <div className="col-span-9">
                  {editMode ? (
                    <Textarea
                      value={editData.description}
                      onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="프로젝트를 설명해주세요"
                      rows={3}
                      className="max-w-md resize-none"
                    />
                  ) : (
                    <div className="py-2">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {project.description || '설명이 없습니다'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6"></div>

              {/* Visibility */}
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-3">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    공개 설정
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    이 프로젝트에 액세스할 수 있는 사용자를 선택합니다
                  </p>
                </div>
                <div className="col-span-9">
                  {editMode ? (
                    <Select
                      value={editData.visibility}
                      onValueChange={(value: 'public' | 'private') => 
                        setEditData(prev => ({ ...prev, visibility: value }))
                      }
                    >
                      <SelectTrigger className="max-w-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            공개
                          </div>
                        </SelectItem>
                        <SelectItem value="private">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            비공개
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 py-2">
                      {project.visibility === 'public' ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">공개</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">• 조직의 모든 구성원이 접근 가능</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">비공개</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">• 초대된 멤버만 접근 가능</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Research Information */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">연구 정보</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                연구 목표와 방법론을 설정합니다
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Project Purpose */}
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-3">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    프로젝트 목적
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    이 연구의 주요 목표를 설명해주세요
                  </p>
                </div>
                <div className="col-span-9">
                  {editMode ? (
                    <Textarea
                      value={editData.purpose}
                      onChange={(e) => setEditData(prev => ({ ...prev, purpose: e.target.value }))}
                      placeholder="이 프로젝트를 통해 달성하고자 하는 목표를 설명해주세요"
                      rows={3}
                      className="resize-none"
                    />
                  ) : (
                    <div className="py-2">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {project.purpose || '목적이 설정되지 않았습니다'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6"></div>

              {/* Target Audience */}
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-3">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    대상 사용자
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    연구 대상이 되는 사용자 그룹을 정의합니다
                  </p>
                </div>
                <div className="col-span-9">
                  {editMode ? (
                    <Textarea
                      value={editData.target_audience}
                      onChange={(e) => setEditData(prev => ({ ...prev, target_audience: e.target.value }))}
                      placeholder="연구 대상이 되는 사용자 그룹의 특성을 구체적으로 설명해주세요"
                      rows={3}
                      className="resize-none"
                    />
                  ) : (
                    <div className="py-2">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {project.target_audience || '대상 사용자가 설정되지 않았습니다'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6"></div>

              {/* Research Method */}
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-3">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    연구 방법
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    사용되는 방법론과 접근 방식입니다
                  </p>
                </div>
                <div className="col-span-9">
                  {editMode ? (
                    <Textarea
                      value={editData.research_method}
                      onChange={(e) => setEditData(prev => ({ ...prev, research_method: e.target.value }))}
                      placeholder="사용할 연구 방법론과 접근 방식을 설명해주세요"
                      rows={3}
                      className="resize-none"
                    />
                  ) : (
                    <div className="py-2">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {project.research_method || '연구 방법이 설정되지 않았습니다'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6"></div>

              {/* Project Timeline */}
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-3">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    프로젝트 일정
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    연구의 시작일과 종료일입니다
                  </p>
                </div>
                <div className="col-span-9">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                        시작일
                      </Label>
                      {editMode ? (
                        <Input
                          type="date"
                          value={editData.start_date}
                          onChange={(e) => setEditData(prev => ({ ...prev, start_date: e.target.value }))}
                          className="h-9"
                        />
                      ) : (
                        <div className="py-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {project.start_date ? new Date(project.start_date).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : '미설정'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                        종료일
                      </Label>
                      {editMode ? (
                        <Input
                          type="date"
                          value={editData.end_date}
                          onChange={(e) => setEditData(prev => ({ ...prev, end_date: e.target.value }))}
                          className="h-9"
                        />
                      ) : (
                        <div className="py-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {project.end_date ? new Date(project.end_date).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : '미설정'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Project Members */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">액세스 관리</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {loadingMembers ? '멤버를 로딩 중...' : `${members.length}명의 멤버${members.length > 0 ? '가 이 프로젝트에 액세스할 수 있습니다' : ''}`}
                  </p>
                </div>
                {canEdit && project.visibility === 'private' && (
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    <UserPlus className="w-3 h-3 mr-1" />
                    초대
                  </Button>
                )}
              </div>
            </div>
            
            <div className="p-6">
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">멤버를 로딩 중...</p>
                  </div>
                </div>
              ) : members.length > 0 ? (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profile.avatar_url} />
                          <AvatarFallback className="text-xs font-medium bg-gray-100 dark:bg-gray-700">
                            {member.profile.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.profile.name}</p>
                            {member.role === 'owner' && (
                              <Crown className="w-3 h-3 text-amber-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{member.profile.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getRoleBadge(member.role)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserCircle className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">아직 멤버가 없습니다</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">이 프로젝트에 협업할 멤버를 초대해보세요</p>
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          {canDelete && (
            <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="px-6 py-4 border-b border-red-200 dark:border-red-800">
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">위험 구역</h2>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  되돌릴 수 없는 위험한 작업들
                </p>
              </div>
              
              <div className="p-6">
                <div className="border border-red-200 dark:border-red-700 rounded-lg p-4 bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 mr-4">
                      <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                        이 프로젝트 삭제
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                        프로젝트를 삭제하면 되돌릴 수 없습니다. 다음 항목이 영구적으로 삭제됩니다:
                      </p>
                      <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 mb-4 ml-4">
                        <li>• 모든 인터뷰 데이터와 녹음 파일</li>
                        <li>• 생성된 페르소나와 인사이트</li>
                        <li>• 프로젝트 멤버 정보</li>
                        <li>• 모든 분석 결과와 보고서</li>
                      </ul>
                    </div>
                    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="h-8 text-xs">
                          <Trash2 className="w-3 h-3 mr-1" />
                          프로젝트 삭제
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="text-red-600 dark:text-red-400">프로젝트 "{project.name}"을(를) 삭제하시겠습니까?</DialogTitle>
                          <DialogDescription className="space-y-3">
                            <p>프로젝트와 모든 데이터가 영구적으로 삭제됩니다.</p>
                            <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
                              <p className="font-medium text-red-800 dark:text-red-300 text-sm">⚠️ 이 작업은 되돌릴 수 없습니다</p>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={loading}
                            size="sm"
                          >
                            취소
                          </Button>
                          <Button 
                            variant="destructive" 
                            onClick={handleDelete}
                            disabled={loading}
                            size="sm"
                          >
                            {loading ? '삭제 중...' : '프로젝트 삭제'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}