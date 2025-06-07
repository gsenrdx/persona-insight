'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff, CheckCircle2, ChevronLeft, Search, Building2, User, Check } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

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
  disableAnimation?: boolean
}

export default function SignupForm({ onSwitchToLogin, onClose, disableAnimation = false }: SignupFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [companies, setCompanies] = useState<Array<{id: string, name: string, domains: string[]}>>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [step, setStep] = useState(1) // 1: 회사선택, 2: 정보입력, 3: 완료
  const [searchQuery, setSearchQuery] = useState('')
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
        setStep(3) // 완료 단계로 이동
      }
    } catch (err) {
      setError('네트워크 오류가 발생했어요')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step === 1 && !form.getValues('companyId')) {
      form.setError('companyId', { message: '회사를 선택해주세요' })
      return
    }
    setStep(step + 1)
    setError(null)
  }

  const prevStep = () => {
    setStep(step - 1)
    setError(null)
  }

  const getSelectedCompany = () => {
    const companyId = form.watch('companyId')
    return companies.find(c => c.id === companyId)
  }

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 완료 화면
  if (step === 3) {
    return (
      <motion.div 
        className="w-full h-[700px] px-12 pt-20 pb-12 flex flex-col items-center justify-center text-center bg-gradient-to-b from-gray-50 to-white"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 150, damping: 15 }}
            className="mb-8"
          >
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </motion.div>
          <h1 className="text-[36px] font-semibold text-gray-900 leading-[1.2] mb-4 tracking-tight">
            환영합니다!
          </h1>
          <p className="text-[17px] text-gray-600 leading-[1.4] font-normal">
            이메일 인증을 완료하고 시작해보세요
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mb-10 w-full max-w-sm"
        >
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <p className="text-blue-800 text-[15px] font-medium leading-[1.4]">
              이메일 인증 링크를 보내드렸어요.<br />
              메일함을 확인해주세요.
            </p>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <Button 
            onClick={onSwitchToLogin} 
            className="w-full h-12 text-[16px] font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 border-0 shadow-sm transition-all duration-200 active:scale-[0.98]"
          >
            로그인하러 가기
          </Button>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className="w-full h-[700px] flex flex-col bg-white"
      initial={disableAnimation ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={disableAnimation ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
      transition={disableAnimation ? { duration: 0 } : { duration: 0.4, ease: "easeOut" }}
    >
      {/* 헤더 */}
      <motion.div 
        className="px-12 pt-8 pb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        {/* 상단 네비게이션 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            {step > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={prevStep}
                className="mr-4 h-10 w-10 p-0 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </Button>
            )}
            <div className="text-[13px] text-gray-500 font-medium tracking-wide uppercase">
              {step}/2 단계
            </div>
          </div>
          <div className="flex space-x-2">
            {[1, 2].map((i) => (
              <motion.div
                key={i}
                className={`h-1 w-12 rounded-full transition-colors duration-300 ${
                  i <= step ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
              />
            ))}
          </div>
        </div>

        {/* 타이틀 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {step === 1 ? (
              <div>
                <h1 className="text-[32px] font-semibold text-gray-900 leading-[1.2] mb-3 tracking-tight">
                  회사를 선택해주세요
                </h1>
                <p className="text-[17px] text-gray-600 leading-[1.4] font-normal">
                  소속된 회사를 검색하고 선택해주세요
                </p>
              </div>
            ) : (
              <div>
                <h1 className="text-[32px] font-semibold text-gray-900 leading-[1.2] mb-3 tracking-tight">
                  계정을 만들어보세요
                </h1>
                <p className="text-[17px] text-gray-600 leading-[1.4] font-normal">
                  개인정보와 비밀번호를 입력해주세요
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 px-12">
        <AnimatePresence mode="wait">
          {/* Step 1: 회사 선택 */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col h-full"
            >
              {/* 에러 메시지 */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="mb-6"
                  >
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                      <p className="text-red-800 text-[15px] font-medium whitespace-pre-line">
                        {error}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 검색창 */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="회사 이름을 검색하세요"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-14 text-[16px] border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* 선택된 회사 정보 */}
              <AnimatePresence>
                {getSelectedCompany() && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="mb-6"
                  >
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                      <div className="flex items-center mb-2">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                        <p className="text-[16px] text-blue-900 font-semibold">
                          {getSelectedCompany()?.name}
                        </p>
                      </div>
                      <p className="text-[14px] text-blue-700 font-medium ml-9">
                        허용 도메인: {getSelectedCompany()?.domains.join(', ')}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 회사 리스트 */}
              <div className="flex-1 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-[17px] font-semibold text-gray-900 mb-1">
                    회사 목록
                  </h3>
                  <p className="text-[14px] text-gray-500">
                    {filteredCompanies.length}개의 회사가 있어요
                  </p>
                </div>
                
                <div className="flex-1 -mr-3 pr-3">
                  <ScrollArea className="h-full">
                    {loadingCompanies ? (
                      <div className="flex items-center justify-center h-48">
                        <div className="flex items-center">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-3" />
                          <span className="text-[15px] text-gray-600 font-medium">불러오는 중...</span>
                        </div>
                      </div>
                    ) : filteredCompanies.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48">
                        <Building2 className="h-12 w-12 text-gray-300 mb-4" />
                        <span className="text-[15px] text-gray-500 font-medium">검색 결과가 없어요</span>
                        <span className="text-[13px] text-gray-400 mt-1">다른 키워드로 검색해보세요</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredCompanies.map((company, index) => (
                          <motion.button
                            key={company.id}
                            onClick={() => form.setValue('companyId', company.id)}
                            className={`w-full text-left p-4 rounded-2xl transition-all duration-200 ${
                              form.watch('companyId') === company.id
                                ? 'bg-blue-50 border-2 border-blue-200 shadow-sm'
                                : 'hover:bg-gray-50 border-2 border-gray-100 hover:border-gray-200'
                            }`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.3 }}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[16px] font-semibold text-gray-900">
                                {company.name}
                              </span>
                              {form.watch('companyId') === company.id && (
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </div>
                            <p className="text-[13px] text-gray-500 font-medium">
                              {company.domains.join(', ')}
                            </p>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 mt-6">
                <Button 
                  onClick={nextStep}
                  className="w-full h-12 text-[16px] font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 border-0 shadow-sm transition-all duration-200 active:scale-[0.98]"
                  disabled={!form.watch('companyId') || loadingCompanies}
                >
                  다음 단계
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: 개인정보 및 비밀번호 */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col h-full"
            >
              {/* 에러 메시지 */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="mb-6"
                  >
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                      <p className="text-red-800 text-[15px] font-medium whitespace-pre-line">
                        {error}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col max-w-sm mx-auto w-full">
                <div className="space-y-6 mb-8">
                  {/* 이름 */}
                  <div className="space-y-2">
                    <label className="text-[15px] font-semibold text-gray-900 block">이름</label>
                    <Input
                      type="text"
                      placeholder="홍길동"
                      {...form.register('name')}
                      className="h-12 text-[16px] px-4 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-gray-50 focus:bg-white"
                    />
                    {form.formState.errors.name && (
                      <motion.p 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[14px] text-red-600 font-medium"
                      >
                        {form.formState.errors.name.message}
                      </motion.p>
                    )}
                  </div>

                  {/* 이메일 */}
                  <div className="space-y-2">
                    <label className="text-[15px] font-semibold text-gray-900 block">회사 이메일</label>
                    <Input
                      type="email"
                      placeholder="your@company.com"
                      {...form.register('email')}
                      className="h-12 text-[16px] px-4 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-gray-50 focus:bg-white"
                    />
                    {form.formState.errors.email && (
                      <motion.p 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[14px] text-red-600 font-medium"
                      >
                        {form.formState.errors.email.message}
                      </motion.p>
                    )}
                  </div>

                  {/* 비밀번호 */}
                  <div className="space-y-2">
                    <label className="text-[15px] font-semibold text-gray-900 block">비밀번호</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="6자 이상 입력"
                        {...form.register('password')}
                        className="h-12 text-[16px] px-4 pr-12 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-gray-50 focus:bg-white"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-200 text-gray-500 hover:text-gray-700 rounded-lg transition-colors duration-200"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {form.formState.errors.password && (
                      <motion.p 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[14px] text-red-600 font-medium"
                      >
                        {form.formState.errors.password.message}
                      </motion.p>
                    )}
                  </div>

                  {/* 비밀번호 확인 */}
                  <div className="space-y-2">
                    <label className="text-[15px] font-semibold text-gray-900 block">비밀번호 확인</label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="비밀번호를 다시 입력"
                        {...form.register('confirmPassword')}
                        className="h-12 text-[16px] px-4 pr-12 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-gray-50 focus:bg-white"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-200 text-gray-500 hover:text-gray-700 rounded-lg transition-colors duration-200"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {form.formState.errors.confirmPassword && (
                      <motion.p 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[14px] text-red-600 font-medium"
                      >
                        {form.formState.errors.confirmPassword.message}
                      </motion.p>
                    )}
                  </div>
                </div>
                
                <div className="flex-1" />
                
                <div className="pt-6 border-t border-gray-100">
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-[16px] font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 border-0 shadow-sm transition-all duration-200 active:scale-[0.98]" 
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
        
      {/* 하단 로그인 링크 */}
      <motion.div 
        className="px-12 py-6 text-center border-t border-gray-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <p className="text-[15px] text-gray-600 mb-4 font-medium">
          이미 계정이 있으신가요?
        </p>
        <Button 
          variant="outline"
          onClick={onSwitchToLogin}
          disabled={loading}
          className="w-full max-w-xs mx-auto h-11 text-[15px] font-medium rounded-xl border-gray-200 hover:bg-gray-50 transition-all duration-200 active:scale-[0.98]"
        >
          로그인하기
        </Button>
      </motion.div>
    </motion.div>
  )
} 