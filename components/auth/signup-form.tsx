'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Eye, EyeOff, CheckCircle2, Building } from 'lucide-react'

const signupSchema = z.object({
  email: z.string().email('이메일 형식이 올바르지 않아요'),
  password: z.string().min(6, '비밀번호는 6자 이상 입력해주세요'),
  confirmPassword: z.string(),
  name: z.string().min(2, '이름은 2자 이상 입력해주세요'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않아요',
  path: ['confirmPassword'],
})

type SignupForm = z.infer<typeof signupSchema>

interface SignupFormProps {
  onClose: () => void
}

interface Company {
  id: string
  name: string
  domains: string[] | null
}

export default function SignupForm({ onClose }: SignupFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
    },
  })

  // 이메일 도메인 기반 회사 자동 매칭
  const matchedCompany = useMemo(() => {
    const email = form.watch('email')
    if (!email || !email.includes('@')) return null

    const emailDomain = email.split('@')[1]?.toLowerCase()
    if (!emailDomain) return null

    return companies.find(company => 
      company.domains?.some(domain => 
        domain.toLowerCase() === emailDomain
      )
    )
  }, [form.watch('email'), companies])


  // 회사 목록 로드
  const loadCompanies = async () => {
    setLoadingCompanies(true)
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, domains')
        .eq('is_active', true)
        .order('name')

      if (error) {
        setCompanies([])
        return
      }
      setCompanies(data || [])
    } catch (err) {
      setCompanies([])
    } finally {
      setLoadingCompanies(false)
    }
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  const onSubmit = async (data: SignupForm) => {
    setLoading(true)
    setError(null)

    try {
      // 매칭된 회사가 없으면 에러
      if (!matchedCompany) {
        const emailDomain = data.email.split('@')[1]?.toLowerCase()
        setError(`${emailDomain} 도메인은 등록되지 않았습니다. 관리자에게 문의해주세요.`)
        return
      }

      // 1단계: 이미 가입된 사용자인지 확인
      const checkResponse = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      })

      if (checkResponse.ok) {
        const { exists } = await checkResponse.json()
        if (exists) {
          setError('이미 가입된 이메일입니다. 로그인을 시도해보세요.')
          return
        }
      } else {
        // 확인 실패 시에도 회원가입은 계속 진행 (Supabase에서 다시 검증)
      }

      // 2단계: 새로운 사용자 회원가입 진행
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            company_id: matchedCompany.id,
          },
        },
      })

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          setError('이미 가입된 이메일입니다. 로그인을 시도해보세요.')
        } else if (authError.message.includes('Password should be at least')) {
          setError('비밀번호는 6자 이상이어야 합니다')
        } else if (authError.message.includes('Invalid email')) {
          setError('올바른 이메일 형식이 아닙니다')
        } else if (authError.message.includes('For security purposes')) {
          setError('보안상 이유로 가입이 제한되었습니다. 잠시 후 다시 시도해주세요.')
        } else {
          setError(`회원가입 실패: ${authError.message}`)
        }
        return
      }

      if (authData.user) {
        // 가입 성공
        setSuccess(true)
      } else {
        setError('회원가입 처리 중 오류가 발생했습니다.')
      }
    } catch (err) {
      setError('네트워크 오류가 발생했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-8">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          인증 메일이 전송되었습니다.
        </h1>
        <p className="text-gray-600 text-sm mb-6">
          이메일 인증을 완료하고 로그인해주세요
        </p>
        <Button 
          onClick={onClose}
          className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
        >
          로그인하기
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* 헤더 */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          회원가입
        </h1>
        <p className="text-gray-600 text-sm">
          회사 이메일로 가입해주세요
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm text-center whitespace-pre-line">
              {error}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* 이름 입력 */}
        <div className="space-y-1">
          <Input
            type="text"
            placeholder="이름"
            {...form.register('name')}
            className="w-full h-11 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {form.formState.errors.name && (
            <p className="text-xs text-red-600">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        {/* 이메일 입력 및 회사 자동 표시 */}
        <div className="space-y-1">
          <Input
            type="email"
            placeholder="회사 이메일"
            {...form.register('email')}
            className="w-full h-11 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {form.formState.errors.email && (
            <p className="text-xs text-red-600">
              {form.formState.errors.email.message}
            </p>
          )}
          {/* 자동 매칭된 회사 표시 */}
          {matchedCompany && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <Building className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">{matchedCompany.name}으로 가입됩니다</span>
            </div>
          )}
          {/* 등록되지 않은 도메인 */}
          {form.watch('email') && !matchedCompany && form.watch('email').includes('@') && (
            <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
              <span className="text-sm text-orange-700">등록되지 않은 회사 도메인입니다</span>
            </div>
          )}
        </div>

        {/* 비밀번호 입력 */}
        <div className="space-y-1">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="비밀번호 (6자 이상)"
              {...form.register('password')}
              className="w-full h-11 pr-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-red-600">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        {/* 비밀번호 확인 */}
        <div className="space-y-1">
          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="비밀번호 확인"
              {...form.register('confirmPassword')}
              className="w-full h-11 pr-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {form.formState.errors.confirmPassword && (
            <p className="text-xs text-red-600">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* 회원가입 버튼 */}
        <div className="pt-2">
          <Button 
            type="submit" 
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors" 
            disabled={loading || loadingCompanies || !matchedCompany}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                가입 중...
              </>
            ) : (
              '회원가입'
            )}
          </Button>
        </div>
      </form>
        
      {/* 하단 로그인 링크 */}
      <div className="mt-6 text-center">
        <button
          onClick={onClose}
          disabled={loading}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          이미 계정이 있으신가요? <span className="text-blue-600 hover:text-blue-700">로그인하기</span>
        </button>
      </div>
    </div>
  )
}