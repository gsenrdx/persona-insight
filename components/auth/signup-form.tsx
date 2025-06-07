'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const signupSchema = z.object({
  email: z.string().email('이메일 형식이 올바르지 않아요'),
  password: z.string().min(6, '비밀번호는 6자 이상 입력해주세요'),
  confirmPassword: z.string(),
  name: z.string().min(2, '이름은 2자 이상 입력해주세요'),
  companyId: z.string().min(1, '회사를 선택해주세요').refine(val => val !== 'none', {
    message: '회사를 선택해주세요'
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않아요',
  path: ['confirmPassword'],
})

type SignupForm = z.infer<typeof signupSchema>

interface SignupFormProps {
  onSwitchToLogin: () => void
  onClose: () => void
}

export default function SignupForm({ onSwitchToLogin, onClose }: SignupFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [companies, setCompanies] = useState<Array<{id: string, name: string, domains: string[]}>>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const router = useRouter()

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      companyId: '',
    },
  })

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
        console.error('회사 목록 로드 실패:', error)
        setCompanies([])
        return
      }
      setCompanies(data || [])
    } catch (err) {
      console.error('회사 목록 로드 중 예외 발생:', err)
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
      const selectedCompany = companies.find(c => c.id === data.companyId)
      if (!selectedCompany) {
        setError('선택된 회사 정보를 찾을 수 없어요')
        return
      }

      const emailDomain = data.email.split('@')[1]?.toLowerCase()
      const isValidDomain = selectedCompany.domains.some(domain => 
        domain.toLowerCase() === emailDomain
      )

      if (!isValidDomain) {
        setError(`${selectedCompany.name}에서 허용하는 이메일이 아니에요\n허용 도메인: ${selectedCompany.domains.join(', ')}`)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            company_id: data.companyId,
          },
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('이미 가입된 이메일이에요')
        } else {
          setError('회원가입에 실패했어요. 다시 시도해주세요')
        }
        return
      }

      if (authData.user) {
        setSuccess(true)
      }
    } catch (err) {
      setError('네트워크 오류가 발생했어요')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            환영합니다!
          </h1>
          <p className="text-gray-600">
            이메일 인증을 완료하고 시작해보세요
          </p>
        </div>
        <Button 
          onClick={onSwitchToLogin}
          className="w-full"
        >
          로그인하기
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          회원가입
        </h1>
        <p className="text-gray-600">
          회사와 개인정보를 입력해주세요
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6">
          <Alert variant="destructive">
            <AlertDescription className="whitespace-pre-line">
              {error}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* 회사 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            회사
          </label>
          <Select
            onValueChange={(value) => form.setValue('companyId', value)}
            disabled={loadingCompanies}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loadingCompanies ? "로딩 중..." : "회사를 선택해주세요"} />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.companyId && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.companyId.message}
            </p>
          )}
        </div>

        {/* 이름 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            이름
          </label>
          <Input
            type="text"
            placeholder="홍길동"
            {...form.register('name')}
            className="w-full"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        {/* 이메일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            회사 이메일
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
              placeholder="비밀번호 (6자 이상)"
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

        {/* 비밀번호 확인 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호 확인
          </label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="비밀번호 확인"
              {...form.register('confirmPassword')}
              className="w-full pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {form.formState.errors.confirmPassword && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* 회원가입 버튼 */}
        <div className="pt-4">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                가입 중...
              </>
            ) : (
              '회원가입 완료'
            )}
          </Button>
        </div>
      </form>
        
      {/* 하단 로그인 링크 */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 mb-3">
          이미 계정이 있으신가요?
        </p>
        <Button 
          variant="outline"
          onClick={onSwitchToLogin}
          disabled={loading}
          className="w-full"
        >
          로그인하기
        </Button>
      </div>
    </div>
  )
} 