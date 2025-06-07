'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Camera, User, Building2, Mail, Key, Eye, EyeOff } from 'lucide-react'

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

const ROLE_LABELS = {
  super_admin: '시스템 관리자',
  company_admin: '회사 관리자', 
  company_user: '일반 사용자',
} as const

interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { user, profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

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

  // 프로필 데이터로 폼 초기화
  useEffect(() => {
    if (profile) {
      profileForm.reset({
        name: profile.name,
      })
    }
  }, [profile, profileForm])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive'
      case 'company_admin':
        return 'default'
      default:
        return 'secondary'
    }
  }

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

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
      
      // 성공 메시지 표시 후 초기화
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (err) {
      setError('네트워크 오류가 발생했어요')
    } finally {
      setLoading(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordForm) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: authError } = await supabase.auth.updateUser({
        password: data.newPassword
      })

      if (authError) {
        setError('비밀번호 변경에 실패했어요. 현재 비밀번호를 확인해주세요.')
        return
      }

      setSuccess('비밀번호가 성공적으로 변경되었어요!')
      passwordForm.reset()
      
      // 성공 메시지 표시 후 초기화
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
    setShowPasswords({
      current: false,
      new: false,
      confirm: false,
    })
    onOpenChange(false)
  }

  if (!profile) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            프로필 관리
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 프로필 정보 */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url || ''} alt={profile.name} />
                <AvatarFallback className="bg-primary/10 text-lg">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                variant="outline"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full p-0"
                disabled={loading}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-center space-y-2">
              <div className="flex items-center gap-2 justify-center">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{user?.email}</span>
              </div>
              
              <div className="flex flex-wrap gap-1 justify-center">
                <Badge variant={getRoleBadgeVariant(profile.role)} className="text-xs">
                  {ROLE_LABELS[profile.role]}
                </Badge>
                {profile.company && (
                  <Badge variant="outline" className="text-xs">
                    <Building2 className="mr-1 h-3 w-3" />
                    {profile.company.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* 성공 메시지 */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-700">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* 에러 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* 프로필 정보 수정 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">기본 정보</h3>
            </div>
            
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <Input
                  type="text"
                  placeholder="홍길동"
                  {...profileForm.register('name')}
                  className="w-full"
                  disabled={loading}
                />
                {profileForm.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {profileForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  '기본 정보 저장'
                )}
              </Button>
            </form>
          </div>

          <Separator />

          {/* 비밀번호 변경 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">비밀번호 변경</h3>
            </div>
            
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              {/* 현재 비밀번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  현재 비밀번호
                </label>
                <div className="relative">
                  <Input
                    type={showPasswords.current ? 'text' : 'password'}
                    placeholder="현재 비밀번호"
                    {...passwordForm.register('currentPassword')}
                    className="w-full pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-sm text-red-600 mt-1">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              {/* 새 비밀번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호
                </label>
                <div className="relative">
                  <Input
                    type={showPasswords.new ? 'text' : 'password'}
                    placeholder="새 비밀번호 (6자 이상)"
                    {...passwordForm.register('newPassword')}
                    className="w-full pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-red-600 mt-1">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              {/* 새 비밀번호 확인 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호 확인
                </label>
                <div className="relative">
                  <Input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    placeholder="새 비밀번호 확인"
                    {...passwordForm.register('confirmPassword')}
                    className="w-full pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-600 mt-1">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    변경 중...
                  </>
                ) : (
                  '비밀번호 변경'
                )}
              </Button>
            </form>
          </div>

          {/* 닫기 버튼 */}
          <div className="pt-4">
            <Button 
              variant="outline"
              onClick={handleClose}
              className="w-full"
            >
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 