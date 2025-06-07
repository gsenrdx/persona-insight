'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { motion } from 'framer-motion'
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
  disableAnimation?: boolean
}

export default function LoginForm({ onSwitchToSignup, onClose, disableAnimation = false }: LoginFormProps) {
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
        router.refresh()
        onClose()
      }
    } catch (err) {
      setError('네트워크 오류가 발생했어요')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div 
      className="w-full max-w-md mx-auto"
      initial={disableAnimation ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={disableAnimation ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
      transition={disableAnimation ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
    >
      <div className="px-6 pt-12 pb-8">
        {/* 헤더 */}
        <motion.div 
          className="mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <h1 className="text-[28px] font-bold text-gray-900 leading-[1.3] mb-3">
            안녕하세요!
          </h1>
          <p className="text-[16px] text-gray-600 leading-[1.5]">
            이메일과 비밀번호로 로그인해주세요
          </p>
        </motion.div>

        {/* 에러 메시지 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="mb-6"
          >
            <Alert variant="destructive" className="border-red-200 bg-red-50 rounded-2xl">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
        
        {/* 로그인 폼 */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            {/* 이메일 입력 */}
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="이메일"
                {...form.register('email')}
                disabled={loading}
                className="h-[56px] text-[16px] px-4 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-0 placeholder:text-gray-400 font-medium"
              />
              {form.formState.errors.email && (
                <motion.p 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[14px] text-red-500 ml-4 font-medium"
                >
                  {form.formState.errors.email.message}
                </motion.p>
              )}
            </div>

            {/* 비밀번호 입력 */}
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="비밀번호"
                  {...form.register('password')}
                  disabled={loading}
                  className="h-[56px] text-[16px] px-4 pr-14 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-0 placeholder:text-gray-400 font-medium"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
              {form.formState.errors.password && (
                <motion.p 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[14px] text-red-500 ml-4 font-medium"
                >
                  {form.formState.errors.password.message}
                </motion.p>
              )}
            </div>
          </motion.div>
          
          {/* 로그인 버튼 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="pt-4"
          >
            <Button 
              type="submit" 
              className="w-full h-[56px] text-[16px] font-bold rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 transition-all duration-200" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  로그인 중...
                </>
              ) : (
                '로그인'
              )}
            </Button>
          </motion.div>
        </form>
        
        {/* 회원가입 링크 */}
        <motion.div 
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <p className="text-[15px] text-gray-600 mb-4 font-medium">
            아직 계정이 없으신가요?
          </p>
          <Button 
            variant="outline"
            onClick={onSwitchToSignup}
            disabled={loading}
            className="w-full h-[48px] text-[15px] font-bold rounded-2xl border-gray-200 hover:bg-gray-50 transition-all duration-200"
          >
            회원가입하기
          </Button>
        </motion.div>
      </div>
    </motion.div>
  )
} 