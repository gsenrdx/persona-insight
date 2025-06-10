'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Edit, Trash2, Users, Eye, EyeOff, Save, X } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

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

interface ProjectSettingsProps {
  project: Project
  onProjectUpdate: (project: Project) => void
}

export default function ProjectSettings({ project, onProjectUpdate }: ProjectSettingsProps) {
  const { profile } = useAuth()
  const router = useRouter()
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

  const canEdit = profile?.id === project.created_by
  const canDelete = profile?.id === project.created_by

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">프로젝트 설정</h1>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              variant={editMode ? "outline" : "default"}
              onClick={() => editMode ? handleCancel() : setEditMode(true)}
              disabled={loading}
            >
              {editMode ? <X className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
              {editMode ? '취소' : '수정'}
            </Button>
          )}
          {editMode && (
            <Button onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              저장
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              기본 정보
            </CardTitle>
            <CardDescription>
              프로젝트의 기본 정보를 확인하고 수정할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">프로젝트 이름</Label>
              {editMode ? (
                <Input
                  id="name"
                  value={editData.name}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="프로젝트 이름을 입력하세요"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md">{project.name}</div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">설명</Label>
              {editMode ? (
                <Textarea
                  id="description"
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="프로젝트 설명을 입력하세요"
                  rows={3}
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md min-h-[80px]">
                  {project.description || '설명이 없습니다.'}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="visibility">공개 설정</Label>
              {editMode ? (
                <Select
                  value={editData.visibility}
                  onValueChange={(value: 'public' | 'private') => 
                    setEditData(prev => ({ ...prev, visibility: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        공개 프로젝트
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <EyeOff className="w-4 h-4" />
                        비공개 프로젝트
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 bg-gray-50 rounded-md flex items-center gap-2">
                  {project.visibility === 'public' ? (
                    <>
                      <Eye className="w-4 h-4" />
                      공개 프로젝트
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4" />
                      비공개 프로젝트
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="join_method">참여 방법</Label>
              {editMode ? (
                <Select
                  value={editData.join_method}
                  onValueChange={(value: 'open' | 'invite_only' | 'password') => 
                    setEditData(prev => ({ ...prev, join_method: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">자유 참여</SelectItem>
                    <SelectItem value="invite_only">초대만</SelectItem>
                    <SelectItem value="password">비밀번호</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 bg-gray-50 rounded-md">
                  {project.join_method === 'open' && '자유 참여'}
                  {project.join_method === 'invite_only' && '초대만'}
                  {project.join_method === 'password' && '비밀번호'}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="purpose">프로젝트 목적</Label>
              {editMode ? (
                <Textarea
                  id="purpose"
                  value={editData.purpose}
                  onChange={(e) => setEditData(prev => ({ ...prev, purpose: e.target.value }))}
                  placeholder="프로젝트의 목적을 입력하세요"
                  rows={2}
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md min-h-[60px]">
                  {project.purpose || '프로젝트 목적이 설정되지 않았습니다.'}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="target_audience">대상 사용자</Label>
              {editMode ? (
                <Textarea
                  id="target_audience"
                  value={editData.target_audience}
                  onChange={(e) => setEditData(prev => ({ ...prev, target_audience: e.target.value }))}
                  placeholder="연구 대상이 되는 사용자 그룹을 설명해주세요"
                  rows={2}
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md min-h-[60px]">
                  {project.target_audience || '대상 사용자가 설정되지 않았습니다.'}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="research_method">연구 방법</Label>
              {editMode ? (
                <Textarea
                  id="research_method"
                  value={editData.research_method}
                  onChange={(e) => setEditData(prev => ({ ...prev, research_method: e.target.value }))}
                  placeholder="사용할 연구 방법론을 설명해주세요"
                  rows={2}
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md min-h-[60px]">
                  {project.research_method || '연구 방법이 설정되지 않았습니다.'}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">시작일</Label>
                {editMode ? (
                  <Input
                    id="start_date"
                    type="date"
                    value={editData.start_date}
                    onChange={(e) => setEditData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="h-11"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-md">
                    {project.start_date || '시작일이 설정되지 않았습니다.'}
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="end_date">종료일</Label>
                {editMode ? (
                  <Input
                    id="end_date"
                    type="date"
                    value={editData.end_date}
                    onChange={(e) => setEditData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="h-11"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-md">
                    {project.end_date || '종료일이 설정되지 않았습니다.'}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 프로젝트 통계 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              프로젝트 통계
            </CardTitle>
            <CardDescription>
              프로젝트의 현재 상태를 확인할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {project.member_count || 0}
                </div>
                <div className="text-sm text-blue-600">멤버</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {project.interview_count || 0}
                </div>
                <div className="text-sm text-green-600">인터뷰</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {project.persona_count || 0}
                </div>
                <div className="text-sm text-purple-600">페르소나</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 위험 구역 */}
        {canDelete && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                위험 구역
              </CardTitle>
              <CardDescription>
                이 작업들은 되돌릴 수 없습니다. 신중하게 진행해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    프로젝트 삭제
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>프로젝트 삭제 확인</DialogTitle>
                    <DialogDescription>
                      프로젝트 "{project.name}"을(를) 정말로 삭제하시겠습니까?
                      <br />
                      이 작업은 되돌릴 수 없으며, 모든 인터뷰와 데이터가 함께 삭제됩니다.
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
    </div>
  )
} 