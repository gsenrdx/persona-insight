'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2, User, Database, Settings, BookOpen, AlertCircle, Check, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MisoKnowledgeStatusContent } from './settings-modal/miso-knowledge-content'
import { GlossaryContent } from './settings-modal/glossary-content'
import { PersonaDefinitionsContent } from './settings-modal/persona-definitions-content'
import { motion } from 'framer-motion'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'

const profileSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상 입력해주세요'),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
  newPassword: z.string().min(6, '새 비밀번호는 6자 이상 입력해주세요'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '새 비밀번호가 일치하지 않아요',
  path: ['confirmPassword'],
})

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type TabType = 'profile' | 'knowledge' | 'glossary' | 'definitions'

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { user, profile, refreshProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [passwordChangeEnabled, setPasswordChangeEnabled] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
    },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        name: profile.name,
      })
      setAvatarUrl(profile.avatar_url)
    }
  }, [profile, profileForm])

  const onProfileSubmit = async (data: ProfileForm) => {
    if (!profile) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: data.name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (updateError) {
        setError('프로필 업데이트에 실패했어요')
        return
      }

      setSuccess('프로필이 성공적으로 업데이트되었어요!')
      await refreshProfile()
      
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (err) {
      setError('네트워크 오류가 발생했어요')
    } finally {
      setLoading(false)
    }
  }


  const handleClose = () => {
    profileForm.reset()
    passwordForm.reset()
    setError(null)
    setSuccess(null)
    setPasswordChangeEnabled(false)
    setActiveTab('profile')
    setAvatarUrl(profile?.avatar_url || null)
    onOpenChange(false)
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('파일 크기는 5MB 이하여야 합니다')
      return
    }

    // 파일 타입 체크
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('JPG, PNG, WebP 형식의 이미지만 업로드 가능합니다')
      return
    }

    setIsUploadingAvatar(true)
    setError(null)

    try {
      // 세션 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('인증 정보가 없습니다')
      }

      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '업로드에 실패했습니다')
      }

      // 프로필 새로고침 및 즉시 UI 업데이트
      setAvatarUrl(data.avatar_url)
      await refreshProfile()
      toast.success('프로필 사진이 업데이트되었습니다')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '업로드에 실패했습니다')
    } finally {
      setIsUploadingAvatar(false)
      // 인풋 초기화
      event.target.value = ''
    }
  }

  const handleRemoveAvatar = async () => {
    if (!confirm('프로필 사진을 삭제하시겠습니까?')) return

    setIsUploadingAvatar(true)
    setError(null)

    try {
      // 세션 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('인증 정보가 없습니다')
      }

      const response = await fetch('/api/profile/avatar', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '삭제에 실패했습니다')
      }

      // 프로필 새로고침 및 즉시 UI 업데이트
      setAvatarUrl(null)
      await refreshProfile()
      toast.success('프로필 사진이 삭제되었습니다')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제에 실패했습니다')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  if (!profile) return null

  const tabs = [
    {
      id: 'profile' as const,
      label: '프로필 설정',
      icon: User,
    },
    {
      id: 'knowledge' as const,
      label: 'MISO Knowledge',
      icon: Database,
    },
    {
      id: 'glossary' as const,
      label: '용어 사전',
      icon: BookOpen,
    },
    {
      id: 'definitions' as const,
      label: '페르소나 정의',
      icon: Settings,
    },
  ]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 rounded-2xl shadow-2xl bg-white overflow-hidden">
        <DialogTitle className="sr-only">설정</DialogTitle>
        <div className="flex h-full overflow-hidden">
          {/* 좌측 탭 메뉴 */}
          <div className="w-64 bg-white border-r border-gray-100 flex flex-col">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900">설정</h2>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setError(null)
                      setSuccess(null)
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-150",
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5 transition-colors",
                      activeTab === tab.id 
                        ? "text-blue-600" 
                        : "text-gray-400"
                    )} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* 우측 콘텐츠 영역 */}
          <div className="flex-1 flex flex-col min-h-0">
            {activeTab === 'profile' ? (
              <div className="h-full flex flex-col">
                {/* 상단 헤더 - 고정 */}
                <div className="bg-white border-b border-gray-100 px-8 py-6 flex-shrink-0">
                  <h3 className="text-lg font-semibold text-gray-900">프로필 설정</h3>
                  <p className="text-sm text-gray-600 mt-1">계정 정보와 보안 설정을 관리합니다</p>
                </div>
                
                {/* 스크롤 가능한 콘텐츠 영역 */}
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="max-w-2xl mx-auto">
                    {/* 성공/에러 메시지 */}
                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-3 mb-6"
                      >
                        <Check className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">{success}</span>
                      </motion.div>
                    )}

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-3 mb-6"
                      >
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                      </motion.div>
                    )}

                    {/* 프로필 정보 폼 */}
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                      {/* 프로필 사진 섹션 */}
                      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <h4 className="text-sm font-medium text-gray-900 mb-4">프로필 사진</h4>
                        <div className="flex items-center gap-4">
                          <Avatar 
                            key={avatarUrl || 'no-avatar'} 
                            className="h-20 w-20 ring-2 ring-gray-100"
                          >
                            <AvatarImage 
                              src={avatarUrl || undefined} 
                            />
                            <AvatarFallback className="text-xl bg-blue-50 text-blue-700 font-medium">
                              {profile.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isUploadingAvatar}
                                className="relative overflow-hidden h-8 border-gray-200 hover:bg-gray-50"
                                asChild
                              >
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleAvatarUpload}
                                    disabled={isUploadingAvatar}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                  {isUploadingAvatar ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                      업로드 중...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                                      사진 변경
                                    </>
                                  )}
                                </label>
                              </Button>
                              
                              {avatarUrl && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleRemoveAvatar}
                                  disabled={isUploadingAvatar}
                                  className="h-8 text-gray-600 hover:text-red-600 hover:bg-red-50"
                                >
                                  삭제
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              JPG, PNG, WebP 형식 (최대 5MB)
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-4">
                        <h4 className="text-sm font-medium text-gray-900">기본 정보</h4>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-1.5 block">
                              이름
                            </Label>
                            <Input
                              id="name"
                              {...profileForm.register('name')}
                              className="h-10 px-3 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                              placeholder="홍길동"
                            />
                            {profileForm.formState.errors.name && (
                              <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {profileForm.formState.errors.name.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-1.5 block">
                              이메일
                            </Label>
                            <Input
                              id="email"
                              value={user?.email || ''}
                              disabled
                              className="h-10 px-3 rounded-lg bg-gray-50/50 border-gray-200 text-gray-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 mt-1.5">이메일은 변경할 수 없습니다</p>
                          </div>
                        </div>
                      </div>

                      {/* 비밀번호 변경 섹션 */}
                      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-medium text-gray-900">보안 설정</h4>
                          <Switch
                            id="password-change"
                            checked={passwordChangeEnabled}
                            onCheckedChange={setPasswordChangeEnabled}
                            className="data-[state=checked]:bg-blue-600"
                          />
                        </div>

                        {passwordChangeEnabled && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4"
                          >
                            <div>
                              <Label htmlFor="current-password" className="text-sm font-medium text-gray-700 mb-1.5 block">
                                현재 비밀번호
                              </Label>
                              <Input
                                id="current-password"
                                type="password"
                                {...passwordForm.register('currentPassword')}
                                className="h-10 px-3 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                placeholder="••••••••"
                              />
                              {passwordForm.formState.errors.currentPassword && (
                                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {passwordForm.formState.errors.currentPassword.message}
                                </p>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="new-password" className="text-sm font-medium text-gray-700 mb-1.5 block">
                                  새 비밀번호
                                </Label>
                                <Input
                                  id="new-password"
                                  type="password"
                                  {...passwordForm.register('newPassword')}
                                  className="h-10 px-3 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                  placeholder="••••••••"
                                />
                                {passwordForm.formState.errors.newPassword && (
                                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {passwordForm.formState.errors.newPassword.message}
                                  </p>
                                )}
                              </div>

                              <div>
                                <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700 mb-1.5 block">
                                  비밀번호 확인
                                </Label>
                                <Input
                                  id="confirm-password"
                                  type="password"
                                  {...passwordForm.register('confirmPassword')}
                                  className="h-10 px-3 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                  placeholder="••••••••"
                                />
                                {passwordForm.formState.errors.confirmPassword && (
                                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {passwordForm.formState.errors.confirmPassword.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                        
                        {!passwordChangeEnabled && (
                          <p className="text-sm text-gray-500">
                            비밀번호를 변경하려면 스위치를 켜주세요
                          </p>
                        )}
                      </div>
                    </form>
                  </div>
                </div>

                {/* 하단 버튼 영역 - 고정 */}
                <div className="bg-white border-t border-gray-100 px-8 py-6 flex-shrink-0">
                  <div className="max-w-2xl mx-auto flex justify-end gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleClose}
                      className="h-10 px-4 rounded-lg border-gray-200 hover:bg-gray-50"
                    >
                      취소
                    </Button>
                    <Button 
                      type="submit"
                      disabled={loading}
                      onClick={profileForm.handleSubmit(onProfileSubmit)}
                      className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          저장 중...
                        </>
                      ) : (
                        '변경사항 저장'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : activeTab === 'knowledge' ? (
              <div className="h-full flex flex-col">
                <MisoKnowledgeStatusContent 
                  companyId={profile.company_id || ''} 
                />
              </div>
            ) : activeTab === 'glossary' ? (
              <div className="h-full flex flex-col">
                <GlossaryContent 
                  companyId={profile.company_id || ''} 
                />
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <PersonaDefinitionsContent 
                  companyId={profile.company_id || ''} 
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}