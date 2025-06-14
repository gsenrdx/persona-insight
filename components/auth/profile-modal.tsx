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
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { ProfileModalProps } from '@/types/components'

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

export default function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { user, profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [passwordChangeEnabled, setPasswordChangeEnabled] = useState(false)

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
      setPasswordChangeEnabled(false)
      
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
    setPasswordChangeEnabled(false)
    onOpenChange(false)
  }

  if (!profile) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md p-6 rounded-lg">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg font-medium">
            사용자 정보
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* 성공/에러 메시지 */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 프로필 정보 폼 */}
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">
                  이름<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...profileForm.register('name')}
                  className="mt-1"
                />
                {profileForm.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {profileForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  이메일
                </Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="mt-1 bg-gray-50"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="password-change" className="text-sm font-medium">
                    비밀번호 설정
                  </Label>
                  <Switch
                    id="password-change"
                    checked={passwordChangeEnabled}
                    onCheckedChange={setPasswordChangeEnabled}
                  />
                </div>
              </div>
            </div>

            {passwordChangeEnabled && (
              <div className="space-y-3 pt-1">
                <Label htmlFor="current-password" className="text-sm font-medium">
                  현재 비밀번호<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="current-password"
                  type="password"
                  {...passwordForm.register('currentPassword')}
                  className="mt-1"
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-sm text-red-600 mt-1">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}

                <Label htmlFor="new-password" className="text-sm font-medium">
                  새 비밀번호<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  {...passwordForm.register('newPassword')}
                  className="mt-1"
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-red-600 mt-1">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}

                <Label htmlFor="confirm-password" className="text-sm font-medium">
                  새 비밀번호 확인<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  {...passwordForm.register('confirmPassword')}
                  className="mt-1"
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-600 mt-1">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
              >
                닫기
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  '저장'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
} 