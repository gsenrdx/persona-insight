'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AuthConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const confirmAuth = async () => {
      try {
        const code = searchParams.get('code')
        
        if (!code) {
          setStatus('error')
          setMessage('인증 코드가 없습니다.')
          return
        }

        // 코드를 세션으로 교환
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (error) {
          setStatus('error')
          setMessage('인증에 실패했습니다. 다시 시도해주세요.')
          // 인증 에러
          return
        }

        setStatus('success')
        setMessage('이메일 인증이 완료되었습니다!')
        
      } catch (error) {
        setStatus('error')
        setMessage('인증 중 오류가 발생했습니다.')
        // 확인 에러
      }
    }

    confirmAuth()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-8 shadow-lg text-center">
          {/* 로고 */}
          <img 
            src="/logo.svg" 
            alt="Persona Insight Logo" 
            className="w-16 h-16 mx-auto mb-6 drop-shadow-lg"
          />

          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                이메일 인증 중...
              </h1>
              <p className="text-gray-500 text-sm">
                잠시만 기다려주세요
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                인증 완료!
              </h1>
              <p className="text-gray-500 text-sm mb-2">
                {message}
              </p>
              <p className="text-gray-600 text-sm mb-6">
                이제 홈페이지에서 로그인해주세요.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    // 모바일인지 확인
                    const isMobile = window.innerWidth < 768
                    if (isMobile) {
                      // 모바일이면 알림 메시지
                      alert('PC에서 Persona Insight에 로그인해주세요!')
                    } else {
                      // PC면 로그인 페이지로
                      router.push('/login')
                    }
                  }}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  로그인하러 가기
                </Button>
                <p className="text-xs text-gray-400">
                  PC에서 Persona Insight를 이용해주세요
                </p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                인증 실패
              </h1>
              <p className="text-gray-500 text-sm mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => router.push('/login')}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  로그인 페이지로 돌아가기
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}