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
import { Loader2, Eye, EyeOff, CheckCircle2, X, ArrowRight, Sparkles, Mail, Lock, User, Building2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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

// Subtle elevations
const elevations = {
  low: '0 1px 3px rgba(0,0,0,0.06)',
  medium: '0 4px 12px rgba(0,0,0,0.08)',
  high: '0 8px 24px rgba(0,0,0,0.12)',
}

// Refined motion presets
const motionConfig = {
  subtle: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  smooth: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
}

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

  // 이미 로그인된 사용자라면 메인 페이지로 리다이렉트
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
        console.log('로그인 성공 - auth context 상태 업데이트 대기중...')
        
        // auth context의 상태 변경을 위해 적절한 지연 시간 제공
        // onAuthStateChange 리스너가 처리할 시간을 줌
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // 페이지 새로고침으로 최신 상태 보장
        router.refresh()
        router.push('/')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">인증 상태를 확인하고 있어요...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">메인 페이지로 이동 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 h-full">
        <div className="min-h-screen grid lg:grid-cols-2 gap-8 items-center">
          {/* 좌측 - Hero Section */}
          <div className="flex flex-col justify-center px-6 py-12">
            <div className="max-w-lg">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-100 mb-8">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">AI 기반 페르소나 분석</span>
              </div>

              {/* Hero Text */}
              <div className="mb-8">
                <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-slate-900 leading-tight">
                  고객을<br />
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    더 깊이 이해하는
                  </span><br />
                  새로운 방법
                </h1>
                
                <p className="text-lg text-slate-600 leading-relaxed">
                  AI 기반 페르소나 분석으로 고객의 니즈와 행동 패턴을 파악하고,
                  데이터 기반의 비즈니스 의사결정을 시작해보세요.
                </p>
              </div>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-3 mb-10">
                {['실시간 분석', '팀 협업', '데이터 기반 인사이트'].map((feature) => (
                  <div
                    key={feature}
                    className="px-4 py-2 bg-white/70 border border-slate-200 rounded-full text-sm font-medium text-slate-700"
                    style={{ boxShadow: elevations.low }}
                  >
                    {feature}
                  </div>
                ))}
              </div>

              {/* Hero Image */}
              <div className="relative max-w-md">
                <img 
                  src="/main-image.png" 
                  alt="Team Collaboration" 
                  className="w-full h-auto object-contain drop-shadow-lg"
                />
              </div>
            </div>
          </div>

          {/* 우측 - Login Card */}
          <div className="flex flex-col justify-center px-6 py-12">
            <div className="max-w-md mx-auto w-full">
              {/* Card */}
              <div 
                className="bg-white rounded-2xl p-8 border border-slate-200"
                style={{ boxShadow: elevations.medium }}
              >
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    로그인
                  </h2>
                  <p className="text-slate-600">
                    이메일과 비밀번호로 로그인해주세요
                  </p>
                </div>

                {/* Error Alert */}
                                 <AnimatePresence>
                   {error && (
                     <motion.div
                       initial={{ opacity: 0, y: -10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       transition={motionConfig.subtle}
                       className="mb-6"
                     >
                      <Alert variant="destructive" className="border-red-200 bg-red-50">
                        <AlertDescription className="text-red-700">
                          {error}
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Login Form */}
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Mail className="w-4 h-4 text-blue-600" />
                      이메일
                    </label>
                    <Input
                      type="email"
                      placeholder="your@company.com"
                      {...loginForm.register('email')}
                      className="h-11 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-red-600 flex items-center gap-2">
                        <X className="w-4 h-4" />
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Lock className="w-4 h-4 text-blue-600" />
                      비밀번호
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="비밀번호"
                        {...loginForm.register('password')}
                        className="h-11 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-600 flex items-center gap-2">
                        <X className="w-4 h-4" />
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Login Button */}
                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors font-semibold" 
                      disabled={formLoading}
                    >
                      {formLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          로그인 중...
                        </>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          로그인
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      )}
                    </Button>
                  </div>
                </form>

                {/* Signup Section */}
                <div className="mt-8 text-center">
                  <p className="text-slate-600 text-sm mb-4">
                    아직 계정이 없으신가요?
                  </p>
                  <Button 
                    onClick={handleOpenSignup}
                    variant="outline"
                    className="w-full h-10 rounded-lg border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    회원가입
                  </Button>
                </div>

                {/* Terms */}
                <div className="mt-6 text-center">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    계속 진행하면{' '}
                    <span className="text-blue-600 hover:underline cursor-pointer">서비스 약관</span> 및{' '}
                    <span className="text-blue-600 hover:underline cursor-pointer">개인정보 처리방침</span>에 동의하는 것으로 간주됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 회원가입 모달 */}
      <AnimatePresence>
        {signupModalOpen && (
          <Dialog open={signupModalOpen} onOpenChange={setSignupModalOpen}>
            <DialogContent className="sm:max-w-md rounded-2xl border-0 p-0 overflow-hidden">
                             <motion.div
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 transition={motionConfig.smooth}
                 style={{ boxShadow: elevations.high }}
                 className="bg-white"
               >
                <DialogHeader className="p-6 pb-4">
                  <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    회원가입
                  </DialogTitle>
                  <p className="text-slate-600 text-sm mt-1">
                    회사와 개인정보를 입력해주세요
                  </p>
                </DialogHeader>

                <div className="px-6 pb-6">
                  {signupSuccess ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        환영합니다!
                      </h3>
                      <p className="text-slate-600 mb-6">
                        이메일 인증을 완료하고 Persona Insight를 시작해보세요
                      </p>
                      <Button 
                        onClick={handleCloseSignup}
                        className="w-full h-11 rounded-lg bg-green-600 hover:bg-green-700"
                      >
                        확인
                      </Button>
                    </div>
                  ) : (
                    <>
                      <AnimatePresence>
                                                 {signupError && (
                           <motion.div
                             initial={{ opacity: 0, y: -10 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0, y: -10 }}
                             transition={motionConfig.subtle}
                             className="mb-4"
                           >
                            <Alert variant="destructive" className="border-red-200 bg-red-50">
                              <AlertDescription className="text-red-700 whitespace-pre-line">
                                {signupError}
                              </AlertDescription>
                            </Alert>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                        {/* Company */}
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            회사
                          </label>
                          <Select
                            onValueChange={(value) => signupForm.setValue('companyId', value)}
                            disabled={loadingCompanies}
                          >
                            <SelectTrigger className="h-11 rounded-lg border-slate-300">
                              <SelectValue placeholder={loadingCompanies ? "로딩 중..." : "회사를 선택해주세요"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                              {companies.map((company) => (
                                <SelectItem key={company.id} value={company.id}>
                                  {company.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {signupForm.formState.errors.companyId && (
                            <p className="text-sm text-red-600 flex items-center gap-2">
                              <X className="w-4 h-4" />
                              {signupForm.formState.errors.companyId.message}
                            </p>
                          )}
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <User className="w-4 h-4 text-blue-600" />
                            이름
                          </label>
                          <Input
                            type="text"
                            placeholder="홍길동"
                            {...signupForm.register('name')}
                            className="h-11 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                          />
                          {signupForm.formState.errors.name && (
                            <p className="text-sm text-red-600 flex items-center gap-2">
                              <X className="w-4 h-4" />
                              {signupForm.formState.errors.name.message}
                            </p>
                          )}
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <Mail className="w-4 h-4 text-blue-600" />
                            이메일
                          </label>
                          <Input
                            type="email"
                            placeholder="your@company.com"
                            {...signupForm.register('email')}
                            className="h-11 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                          />
                          {signupForm.formState.errors.email && (
                            <p className="text-sm text-red-600 flex items-center gap-2">
                              <X className="w-4 h-4" />
                              {signupForm.formState.errors.email.message}
                            </p>
                          )}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <Lock className="w-4 h-4 text-blue-600" />
                            비밀번호
                          </label>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="6자 이상"
                              {...signupForm.register('password')}
                              className="h-11 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {signupForm.formState.errors.password && (
                            <p className="text-sm text-red-600 flex items-center gap-2">
                              <X className="w-4 h-4" />
                              {signupForm.formState.errors.password.message}
                            </p>
                          )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <Lock className="w-4 h-4 text-blue-600" />
                            비밀번호 확인
                          </label>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="비밀번호 재입력"
                              {...signupForm.register('confirmPassword')}
                              className="h-11 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {signupForm.formState.errors.confirmPassword && (
                            <p className="text-sm text-red-600 flex items-center gap-2">
                              <X className="w-4 h-4" />
                              {signupForm.formState.errors.confirmPassword.message}
                            </p>
                          )}
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                          <Button 
                            type="submit" 
                            className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors font-semibold" 
                            disabled={formLoading || loadingCompanies}
                          >
                            {formLoading ? (
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
                    </>
                  )}
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  )
} 