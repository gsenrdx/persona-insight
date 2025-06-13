'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('이메일 형식이 올바르지 않아요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

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

type LoginForm = z.infer<typeof loginSchema>
type SignupForm = z.infer<typeof signupSchema>

export default function LoginPageContent() {
  const { user, loading } = useAuth()
  const [signupModalOpen, setSignupModalOpen] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupError, setSignupError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [companies, setCompanies] = useState<Array<{id: string, name: string, domains: string[]}>>([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const router = useRouter()

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', name: '', companyId: '' },
  })

  // 로그인된 사용자 체크
  useEffect(() => {
    if (user && !loading) {
      router.push('/')
    }
  }, [user, loading, router])

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

  const handleOpenSignup = () => {
    setSignupModalOpen(true)
    setSignupError(null)
    setSignupSuccess(false)
    signupForm.reset()
    loadCompanies()
  }

  const handleCloseSignup = () => {
    setSignupModalOpen(false)
    setSignupError(null)
    setSignupSuccess(false)
    signupForm.reset()
  }

  const onLoginSubmit = async (data: LoginForm) => {
    setFormLoading(true)
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
        // AuthProvider의 onAuthStateChange가 상태를 업데이트하면
        // useEffect에서 자동으로 리다이렉트됨
      }
    } catch (err) {
      setError('네트워크 오류가 발생했어요')
    } finally {
      setFormLoading(false)
    }
  }

  const onSignupSubmit = async (data: SignupForm) => {
    setFormLoading(true)
    setSignupError(null)

    try {
      const selectedCompany = companies.find(c => c.id === data.companyId)
      if (!selectedCompany) {
        setSignupError('선택된 회사 정보를 찾을 수 없어요')
        return
      }

      const emailDomain = data.email.split('@')[1]?.toLowerCase()
      const isValidDomain = selectedCompany.domains.some(domain => 
        domain.toLowerCase() === emailDomain
      )

      if (!isValidDomain) {
        setSignupError(`${selectedCompany.name}에서 허용하는 이메일이 아니에요\n허용 도메인: ${selectedCompany.domains.join(', ')}`)
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
          setSignupError('이미 가입된 이메일이에요')
        } else {
          setSignupError('회원가입에 실패했어요. 다시 시도해주세요')
        }
        return
      }

      if (authData.user) {
        setSignupSuccess(true)
      }
    } catch (err) {
      setSignupError('네트워크 오류가 발생했어요')
    } finally {
      setFormLoading(false)
    }
  }

  // 이미 로그인된 경우 빈 화면만 보여주고 리다이렉트는 useEffect에서 처리
  if (!loading && user) {
    return <div className="min-h-screen bg-background" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 relative overflow-hidden">
      {/* 신경망 같은 배경 패턴 */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(99 102 241) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>
      
      {/* 데이터 플로우 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/60 to-white/90"></div>
      
      {/* 부드러운 인사이트 오브들 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 상단 영역 */}
        <div className="insight-orb insight-orb-azure w-72 h-72 animate-giant-float-1" style={{ top: '5vh', left: '-10vw' }}></div>
        <div className="insight-orb insight-orb-blue w-48 h-48 animate-gentle-float-2" style={{ top: '15vh', left: '70vw' }}></div>
        <div className="insight-orb insight-orb-sky w-32 h-32 animate-gentle-float-3" style={{ top: '8vh', left: '40vw' }}></div>
        <div className="insight-orb insight-orb-teal w-24 h-24 animate-gentle-float-1" style={{ top: '20vh', left: '20vw' }}></div>
        
        {/* 중간 영역 */}
        <div className="insight-orb insight-orb-indigo w-64 h-64 animate-gentle-float-4" style={{ top: '35vh', left: '85vw' }}></div>
        <div className="insight-orb insight-orb-cyan w-40 h-40 animate-gentle-float-5" style={{ top: '45vh', left: '10vw' }}></div>
        <div className="insight-orb insight-orb-violet w-28 h-28 animate-gentle-float-6" style={{ top: '50vh', left: '55vw' }}></div>
        <div className="insight-orb insight-orb-slate w-36 h-36 animate-gentle-float-7" style={{ top: '30vh', left: '30vw' }}></div>
        
        {/* 하단 영역 */}
        <div className="insight-orb insight-orb-blue w-56 h-56 animate-gentle-float-8" style={{ top: '70vh', left: '75vw' }}></div>
        <div className="insight-orb insight-orb-azure w-44 h-44 animate-giant-float-2" style={{ top: '80vh', left: '15vw' }}></div>
        <div className="insight-orb insight-orb-sky w-20 h-20 animate-gentle-float-2" style={{ top: '85vh', left: '60vw' }}></div>
        <div className="insight-orb insight-orb-teal w-52 h-52 animate-gentle-float-4" style={{ top: '75vh', left: '45vw' }}></div>
        <div className="insight-orb insight-orb-cyan w-16 h-16 animate-gentle-float-6" style={{ top: '90vh', left: '85vw' }}></div>
        
        {/* 추가 액센트 오브들 */}
        <div className="insight-orb insight-orb-indigo w-60 h-60 animate-gentle-float-3" style={{ top: '60vh', left: '5vw' }}></div>
        <div className="insight-orb insight-orb-violet w-18 h-18 animate-gentle-float-5" style={{ top: '25vh', left: '90vw' }}></div>
      </div>
      
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 z-10">
        <div className="w-full max-w-md">
          {/* 로고 및 브랜딩 */}
          <div className="text-center mb-10">
            {/* Persona Insight Logo */}
            <img 
              src="/logo.svg" 
              alt="Persona Insight Logo" 
              className="w-20 h-20 mx-auto mb-6 drop-shadow-lg"
            />
            
            <div className="mb-3">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Persona Insight <span className="text-xs text-gray-400 font-medium ml-2">by MISO</span>
              </h1>
            </div>
            
            <p className="text-gray-500 text-sm leading-relaxed">
              고객을 더 깊이 이해하는 AI 페르소나 분석 플랫폼
            </p>
          </div>

          {/* 로그인 카드 */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-8 shadow-lg">
            {/* 로그인 제목 */}
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                로그인
              </h2>
              <p className="text-gray-500 text-sm">
                이메일과 비밀번호를 입력해주세요
              </p>
            </div>

            {/* 에러 알림 */}
            {error && (
              <div className="mb-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-700 text-sm text-center">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* 로그인 폼 */}
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
              {/* 이메일 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  이메일
                </label>
                <Input
                  type="email"
                  placeholder="your@company.com"
                  {...loginForm.register('email')}
                  className="h-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 bg-gray-50 focus:bg-white transition-colors"
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-red-600">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* 비밀번호 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  비밀번호
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 입력해주세요"
                    {...loginForm.register('password')}
                    className="h-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 bg-gray-50 focus:bg-white transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-red-600">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* 로그인 버튼 */}
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 shadow-sm hover:shadow-md" 
                disabled={formLoading}
              >
                {formLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    로그인 중...
                  </>
                ) : (
                  '로그인'
                )}
              </Button>
            </form>

            {/* 회원가입 링크 */}
            <div className="mt-8 text-center">
              <p className="text-gray-500 text-sm mb-4">
                아직 계정이 없으신가요?
              </p>
              <Button 
                onClick={handleOpenSignup}
                variant="outline"
                className="w-full h-11 rounded-xl border-gray-300 hover:bg-gray-50 transition-colors text-gray-700"
                disabled={formLoading}
              >
                회원가입하기
              </Button>
            </div>
          </div>

          {/* 하단 텍스트 */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400 leading-relaxed">
              계속 진행하면{' '}
              <span className="text-blue-600 hover:underline cursor-pointer">서비스 약관</span> 및{' '}
              <span className="text-blue-600 hover:underline cursor-pointer">개인정보 처리방침</span>에 동의하는 것으로 간주됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 회원가입 모달 */}
      {signupModalOpen && (
        <Dialog open={signupModalOpen} onOpenChange={setSignupModalOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-0 p-0">
            <div className="bg-white">
              <DialogHeader className="p-8 pb-6">
                <div className="text-center mb-4">
                  <DialogTitle className="text-xl font-semibold text-gray-900 mb-2">
                    회원가입
                  </DialogTitle>
                </div>
              </DialogHeader>

              <div className="px-8 pb-8">
                {signupSuccess ? (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="h-10 w-10 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      환영합니다!
                    </h3>
                    <p className="text-gray-500 mb-8 text-sm leading-relaxed max-w-sm mx-auto">
                      이메일 인증을 완료하고 Persona Insight를 시작해보세요
                    </p>
                    <Button 
                      onClick={handleCloseSignup}
                      className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold"
                    >
                      확인
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* 에러 알림 */}
                    {signupError && (
                      <div className="mb-6">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                          <p className="text-red-700 text-sm whitespace-pre-line text-center">
                            {signupError}
                          </p>
                        </div>
                      </div>
                    )}

                    <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                      {/* Company */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          회사
                        </label>
                        <Select
                          onValueChange={(value) => signupForm.setValue('companyId', value)}
                          disabled={loadingCompanies}
                        >
                          <SelectTrigger className="h-12 rounded-xl border-gray-300 bg-gray-50 focus:bg-white transition-colors">
                            <SelectValue placeholder={loadingCompanies ? "로딩 중..." : "회사를 선택해주세요"} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {companies.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {signupForm.formState.errors.companyId && (
                          <p className="text-xs text-red-600 mt-1">
                            {signupForm.formState.errors.companyId.message}
                          </p>
                        )}
                      </div>

                      {/* Name and Email in same row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Name */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            이름
                          </label>
                          <Input
                            type="text"
                            placeholder="홍길동"
                            {...signupForm.register('name')}
                            className="h-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 bg-gray-50 focus:bg-white transition-colors"
                          />
                          {signupForm.formState.errors.name && (
                            <p className="text-xs text-red-600 mt-1">
                              {signupForm.formState.errors.name.message}
                            </p>
                          )}
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            이메일
                          </label>
                          <Input
                            type="email"
                            placeholder="your@company.com"
                            {...signupForm.register('email')}
                            className="h-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 bg-gray-50 focus:bg-white transition-colors"
                          />
                          {signupForm.formState.errors.email && (
                            <p className="text-xs text-red-600 mt-1">
                              {signupForm.formState.errors.email.message}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Password fields in same row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Password */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            비밀번호
                          </label>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="6자 이상"
                              {...signupForm.register('password')}
                              className="h-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 bg-gray-50 focus:bg-white transition-colors pr-12"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {signupForm.formState.errors.password && (
                            <p className="text-xs text-red-600 mt-1">
                              {signupForm.formState.errors.password.message}
                            </p>
                          )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            비밀번호 확인
                          </label>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="비밀번호 재입력"
                              {...signupForm.register('confirmPassword')}
                              className="h-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 bg-gray-50 focus:bg-white transition-colors pr-12"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {signupForm.formState.errors.confirmPassword && (
                            <p className="text-xs text-red-600 mt-1">
                              {signupForm.formState.errors.confirmPassword.message}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Submit Button */}
                      <div className="pt-4">
                        <Button 
                          type="submit" 
                          className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 shadow-sm hover:shadow-md" 
                          disabled={formLoading || loadingCompanies}
                        >
                          {formLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              가입 중...
                            </>
                          ) : (
                            '회원가입하기'
                          )}
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}