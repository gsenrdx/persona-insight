'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import OscilloscopeLogo from './oscilloscope-logo'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import SignupForm from './signup-form'

const loginSchema = z.object({
  email: z.string().email('이메일 형식이 올바르지 않아요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPageContent() {
  const { user, loading } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // 로고 조합 상태 관리
  const [logoCompletion, setLogoCompletion] = useState({
    rectangle: false,    // 파란 직사각형
    crescent: false,     // 주황 초승달형
    triangle: false,     // 노랑 삼각형
    wave: false,         // 청록 웨이브
    circle: false,       // 주황 원형
    lshape: false        // 노랑 L자형
  })

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })


  // URL 파라미터에서 로그인 정보 확인 및 정리
  useEffect(() => {
    const email = searchParams.get('email')
    const password = searchParams.get('password')
    
    // URL에 민감한 정보가 있으면 즉시 정리하고 폼에 설정
    if (email || password) {
      // URL 정리 (보안상 중요)
      router.replace('/login', { scroll: false })
      
      // 폼에 값 설정 (디코딩 필요)
      if (email) {
        loginForm.setValue('email', decodeURIComponent(email))
      }
      if (password) {
        loginForm.setValue('password', decodeURIComponent(password))
      }
    }
  }, [searchParams, router, loginForm])

  // 로그인된 사용자 체크
  useEffect(() => {
    if (user && !loading) {
      router.replace('/')
    }
  }, [user, loading, router])

  // 도형 클릭 핸들러
  const handleShapeClick = (shapeType: keyof typeof logoCompletion) => {
    if (!logoCompletion[shapeType] && !isLogoComplete) {
      setLogoCompletion(prev => ({
        ...prev,
        [shapeType]: true
      }))
    }
  }

  // 로고 완성 체크
  const isLogoComplete = Object.values(logoCompletion).every(Boolean)
  const completedCount = Object.values(logoCompletion).filter(Boolean).length

  const handleOpenSignup = () => {
    setAuthModalOpen(true)
  }

  const handleCloseSignup = () => {
    setAuthModalOpen(false)
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


  // 이미 로그인된 경우 빈 화면만 보여주고 리다이렉트는 useEffect에서 처리
  if (!loading && user) {
    return <div className="min-h-screen bg-background" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 relative overflow-hidden">
      {/* 신경망 같은 배경 패턴 */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(99 102 241) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>
      
      {/* 데이터 플로우 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/60 to-white/90 pointer-events-none"></div>
      
      {/* 부드러운 인사이트 오브들 - 클릭 가능 */}
      <div className="absolute inset-0 overflow-hidden z-20">
        {/* 상단 영역 */}
        <div className={`insight-orb insight-orb-azure w-72 h-72 animate-giant-float-1 transition-transform duration-300 ${isLogoComplete ? 'pointer-events-none cursor-default' : 'pointer-events-auto cursor-pointer hover:scale-110'}`}
             style={{ top: '5vh', left: '-10vw' }} 
             onClick={() => {
               // Wave 클릭됨
               handleShapeClick('wave');
             }}></div>
        <div className={`insight-orb insight-orb-blue w-48 h-48 animate-gentle-float-2 transition-transform duration-300 ${logoCompletion.rectangle ? 'opacity-30' : ''} ${isLogoComplete ? 'pointer-events-none cursor-default' : 'pointer-events-auto cursor-pointer hover:scale-110'}`}
             style={{ top: '15vh', left: '70vw' }} 
             onClick={() => handleShapeClick('rectangle')}></div>
        <div className={`insight-orb insight-orb-sky w-32 h-32 animate-gentle-float-3 transition-transform duration-300 ${logoCompletion.triangle ? 'opacity-30' : ''} ${isLogoComplete ? 'pointer-events-none cursor-default' : 'pointer-events-auto cursor-pointer hover:scale-110'}`}
             style={{ top: '8vh', left: '40vw' }} 
             onClick={() => handleShapeClick('triangle')}></div>
        <div className={`insight-orb insight-orb-teal w-24 h-24 animate-gentle-float-1 transition-transform duration-300 ${isLogoComplete ? 'pointer-events-none cursor-default' : 'pointer-events-auto cursor-pointer hover:scale-110'}`}
             style={{ top: '20vh', left: '20vw' }} 
             onClick={() => handleShapeClick('rectangle')}></div>
        
        {/* 중간 영역 */}
        <div className={`insight-orb insight-orb-indigo w-64 h-64 animate-gentle-float-4 transition-transform duration-300 ${logoCompletion.circle ? 'opacity-30' : ''} ${isLogoComplete ? 'pointer-events-none cursor-default' : 'pointer-events-auto cursor-pointer hover:scale-110'}`}
             style={{ top: '35vh', left: '85vw' }} 
             onClick={() => handleShapeClick('circle')}></div>
        <div className={`insight-orb insight-orb-cyan w-40 h-40 animate-gentle-float-5 transition-transform duration-300 ${logoCompletion.wave ? 'opacity-30' : ''} ${isLogoComplete ? 'pointer-events-none cursor-default' : 'pointer-events-auto cursor-pointer hover:scale-110'}`}
             style={{ top: '45vh', left: '10vw' }} 
             onClick={() => handleShapeClick('wave')}></div>
        <div className={`insight-orb insight-orb-slate w-36 h-36 animate-gentle-float-7 transition-transform duration-300 ${logoCompletion.lshape ? 'opacity-30' : ''} ${isLogoComplete ? 'pointer-events-none cursor-default' : 'pointer-events-auto cursor-pointer hover:scale-110'}`}
             style={{ top: '30vh', left: '30vw' }} 
             onClick={() => handleShapeClick('lshape')}></div>
        
        {/* 하단 영역 */}
        <div className={`insight-orb insight-orb-blue w-56 h-56 animate-gentle-float-8 transition-transform duration-300 ${isLogoComplete ? 'pointer-events-none cursor-default' : 'pointer-events-auto cursor-pointer hover:scale-110'}`}
             style={{ top: '70vh', left: '75vw' }} 
             onClick={() => handleShapeClick('rectangle')}></div>
        <div className={`insight-orb insight-orb-azure w-44 h-44 animate-giant-float-2 transition-transform duration-300 ${isLogoComplete ? 'pointer-events-none cursor-default' : 'pointer-events-auto cursor-pointer hover:scale-110'}`}
             style={{ top: '80vh', left: '15vw' }} 
             onClick={() => handleShapeClick('wave')}></div>
        <div className={`insight-orb insight-orb-sky w-20 h-20 animate-gentle-float-2 transition-transform duration-300 ${isLogoComplete ? 'pointer-events-none cursor-default' : 'pointer-events-auto cursor-pointer hover:scale-110'}`}
             style={{ top: '85vh', left: '60vw' }} 
             onClick={() => handleShapeClick('triangle')}></div>
        <div className={`insight-orb insight-orb-teal w-52 h-52 animate-gentle-float-4 transition-transform duration-300 ${isLogoComplete ? 'pointer-events-none cursor-default' : 'pointer-events-auto cursor-pointer hover:scale-110'}`}
             style={{ top: '75vh', left: '45vw' }} 
             onClick={() => handleShapeClick('rectangle')}></div>
        <div className={`insight-orb insight-orb-cyan w-16 h-16 animate-gentle-float-6 transition-transform duration-300 ${isLogoComplete ? 'pointer-events-none cursor-default' : 'pointer-events-auto cursor-pointer hover:scale-110'}`}
             style={{ top: '90vh', left: '85vw' }} 
             onClick={() => handleShapeClick('wave')}></div>
        
        {/* 추가 액센트 오브들 */}
        <div className={`insight-orb insight-orb-indigo w-60 h-60 animate-gentle-float-3 transition-transform duration-300 ${logoCompletion.circle ? 'opacity-30' : ''} ${isLogoComplete ? 'pointer-events-none cursor-default' : 'pointer-events-auto cursor-pointer hover:scale-110'}`}
             style={{ top: '60vh', left: '5vw' }} 
             onClick={() => handleShapeClick('circle')}></div>
        <div className={`insight-orb insight-orb-crescent w-40 h-80 animate-gentle-float-8 transition-transform duration-300 ${logoCompletion.crescent ? 'opacity-30' : ''} ${isLogoComplete ? 'pointer-events-none cursor-default' : 'pointer-events-auto cursor-pointer hover:scale-110'}`}
             style={{ top: '10vh', left: '75vw' }} 
             onClick={() => handleShapeClick('crescent')}></div>
      </div>

      {/* 우측 하단 조합 로고 - 클릭시 하나씩 나타남 */}
      <div className={`absolute bottom-8 right-8 z-50 transition-all duration-1000 ${completedCount > 0 ? 'opacity-80 scale-100' : 'opacity-0 scale-50'}`}>
        <div 
          className={`relative ${isLogoComplete ? 'cursor-pointer' : 'cursor-default'}`}
          onClick={() => {
            if (isLogoComplete) {
              window.open('https://www.52g.gs/', '_blank');
            }
          }}
        >
          <svg 
            width="165" 
            height="73" 
            viewBox="0 0 661 291" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            className={`drop-shadow-lg transition-all duration-300 ${isLogoComplete ? 'hover:scale-105' : ''}`}
          >
            {/* 파란 직사각형 */}
            <path 
              d="M660.636 144.76H572.736V275.219H660.636V144.76Z" 
              fill="url(#paint0_linear_1355_324)"
              className={`transition-all duration-500 ${logoCompletion.rectangle ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
              style={{ transformOrigin: '616px 210px' }}
            />
            {/* 주황 초승달형 */}
            <path 
              fillRule="evenodd" 
              clipRule="evenodd" 
              d="M572.733 142.68V274.761C415.208 267.809 407.575 22.1859 572.733 4.80688C572.039 5.27032 572.502 128.314 572.733 142.68Z" 
              fill="url(#paint1_linear_1355_324)"
              className={`transition-all duration-500 ${logoCompletion.crescent ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
              style={{ transformOrigin: '490px 140px' }}
            />
            {/* 노랑 삼각형 */}
            <path 
              fillRule="evenodd" 
              clipRule="evenodd" 
              d="M404.57 278.468H213.736L306.262 125.301L404.57 278.468Z" 
              fill="url(#paint2_linear_1355_324)"
              className={`transition-all duration-500 ${logoCompletion.triangle ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
              style={{ transformOrigin: '309px 202px' }}
            />
            {/* 청록 웨이브 */}
            <path 
              fillRule="evenodd" 
              clipRule="evenodd" 
              d="M372.184 227.723C499.406 135.035 374.034 -59.1464 238.253 19.1749L372.184 227.723Z" 
              fill="url(#paint3_linear_1355_324)"
              className={`transition-all duration-500 ${logoCompletion.wave ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
              style={{ transformOrigin: '305px 84px' }}
            />
            {/* 1/4 날아간 주황 원형 (왼쪽 위 1/4 삭제) */}
            <path 
              d="M102.01 188.56 L102.01 86.3716 A102.01 102.01 0 0 1 204.019 188.56 A102.01 102.01 0 0 1 102.01 290.749 A102.01 102.01 0 0 1 0 188.56 L102.01 188.56 Z" 
              fill="url(#paint4_linear_1355_324)"
              className={`transition-all duration-500 ${logoCompletion.circle ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
              style={{ transformOrigin: '102px 189px' }}
            />
            {/* 노랑 L자형 */}
            <path 
              fillRule="evenodd" 
              clipRule="evenodd" 
              d="M104.554 86.6001V187.862L0 188.789L1.38788 0.863678L198.005 0.631958L197.542 87.2953L104.554 86.6001Z" 
              fill="url(#paint5_linear_1355_324)"
              className={`transition-all duration-500 ${logoCompletion.lshape ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
              style={{ transformOrigin: '99px 95px' }}
            />
            <defs>
              <linearGradient id="paint0_linear_1355_324" x1="616.686" y1="275.219" x2="616.686" y2="144.76" gradientUnits="userSpaceOnUse">
                <stop stopColor="#53ADE1"/>
                <stop offset="1" stopColor="#337EC2"/>
              </linearGradient>
              <linearGradient id="paint1_linear_1355_324" x1="512.129" y1="5.27032" x2="512.129" y2="275.224" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF674C"/>
                <stop offset="0.27" stopColor="#FF6E4D"/>
                <stop offset="0.66" stopColor="#FF8250"/>
                <stop offset="1" stopColor="#FF9953"/>
              </linearGradient>
              <linearGradient id="paint2_linear_1355_324" x1="309.269" y1="278.468" x2="309.269" y2="125.301" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFDF5D"/>
                <stop offset="1" stopColor="#FFB607"/>
              </linearGradient>
              <linearGradient id="paint3_linear_1355_324" x1="236.421" y1="117.267" x2="424.017" y2="119.139" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00CFB5"/>
                <stop offset="0.21" stopColor="#07D0B1"/>
                <stop offset="0.53" stopColor="#1BD1A7"/>
                <stop offset="0.9" stopColor="#3BD397"/>
                <stop offset="1" stopColor="#45D492"/>
              </linearGradient>
              <linearGradient id="paint4_linear_1355_324" x1="899.724" y1="842.567" x2="899.724" y2="2645.17" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF674C"/>
                <stop offset="0.27" stopColor="#FF6E4D"/>
                <stop offset="0.66" stopColor="#FF8250"/>
                <stop offset="1" stopColor="#FF9953"/>
              </linearGradient>
              <linearGradient id="paint5_linear_1355_324" x1="847.461" y1="1528.46" x2="847.461" y2="0.631958" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFDF5D"/>
                <stop offset="1" stopColor="#FFB607"/>
              </linearGradient>
            </defs>
          </svg>
          
          {/* 완성도 표시 */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 font-medium whitespace-nowrap">
            {isLogoComplete ? '5pen 2nnovation GS!' : `${completedCount}/6`}
          </div>
          
          {/* 완성 시 빤딱 애니메이션 (한 번만 실행) */}
          {isLogoComplete && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-sparkle-once"></div>
            </div>
          )}
        </div>
      </div>
      
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 z-30 pointer-events-none">
        <div className="w-full max-w-md">
          {/* 로고 및 브랜딩 */}
          <div className="text-center mb-10 pointer-events-auto">
            {/* Persona Insight Logo */}
            <OscilloscopeLogo isLoading={formLoading} />
            
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
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-8 shadow-lg relative z-10 pointer-events-auto">
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
          <div className="mt-8 text-center pointer-events-auto">
            <p className="text-xs text-gray-400 leading-relaxed">
              계속 진행하면{' '}
              <span className="text-blue-600 hover:underline cursor-pointer">서비스 약관</span> 및{' '}
              <span className="text-blue-600 hover:underline cursor-pointer">개인정보 처리방침</span>에 동의하는 것으로 간주됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 회원가입 모달 */}
      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="w-full max-w-md p-0 overflow-hidden border-0 shadow-xl">
          <VisuallyHidden>
            <DialogTitle>회원가입</DialogTitle>
          </VisuallyHidden>
          
          <div className="p-8">
            <SignupForm 
              onClose={handleCloseSignup}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}