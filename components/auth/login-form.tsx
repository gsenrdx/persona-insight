'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('이메일 형식이 올바르지 않아요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

type LoginForm = z.infer<typeof loginSchema>

interface LoginFormProps {
  onSwitchToSignup: () => void
  onClose: () => void
}

export default function LoginForm({ onSwitchToSignup, onClose }: LoginFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('이메일 또는 비밀번호가 올바르지 않아요')
        } else {
          setError('로그인에 실패했어요. 다시 시도해주세요')
        }
        return
      }

      if (authData.user) {
        console.log('로그인 성공 - auth context 상태 업데이트 대기중...')
        
        // 모달을 닫아서 사용자에게 로그인이 진행중임을 알림
        onClose()
        
        // auth context의 상태 변경을 위해 적절한 지연 시간 제공
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // 페이지 새로고침으로 최신 상태 보장
        router.refresh()
      }
    } catch (err) {
      setError('네트워크 오류가 발생했어요')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* 헤더 */}
      <div className="mb-8 text-center">
        {/* Persona Insight Logo */}
        <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <div className="w-8 h-8 bg-white rounded-xl"></div>
        </div>
        
        <div className="mb-2">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">
            Persona Insight <span className="text-xs text-gray-400 font-medium ml-2">by MISO</span>
          </h1>
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          로그인
        </h2>
        <p className="text-gray-600">
          이메일과 비밀번호로 로그인해주세요
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6">
          <Alert variant="destructive">
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {/* 로그인 폼 */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* 이메일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            이메일
          </label>
          <Input
            type="email"
            placeholder="your@company.com"
            {...form.register('email')}
            className="w-full"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        {/* 비밀번호 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="비밀번호"
              {...form.register('password')}
              className="w-full pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        {/* 로그인 버튼 */}
        <div className="pt-4">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                로그인 중...
              </>
            ) : (
              '로그인'
            )}
          </Button>
        </div>
      </form>
      
      {/* 회원가입 링크 */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 mb-3">
          아직 계정이 없으신가요?
        </p>
        <Button 
          variant="outline"
          onClick={onSwitchToSignup}
          disabled={loading}
          className="w-full"
        >
          회원가입하기
        </Button>
      </div>
    </div>
  )
} 