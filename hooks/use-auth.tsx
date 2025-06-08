'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  name: string
  role: 'super_admin' | 'company_admin' | 'company_user'
  company_id: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
  company?: {
    id: string
    name: string
    domains: string[]
  } | null
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const fetchProfile = async (userId: string) => {
    try {
      console.log('프로필 조회 시도 - userId:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          company:companies(
            id,
            name,
            domains
          )
        `)
        .eq('id', userId)

      if (error) {
        console.error('프로필 로드 실패 (DB 오류):', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        throw new Error(`프로필 로드 실패: ${error.message}`)
      }

      if (!data || data.length === 0) {
        console.error('프로필 로드 실패: RLS 정책에 의해 접근이 거부되었거나 해당 프로필이 존재하지 않습니다.')
        throw new Error('프로필을 찾을 수 없습니다. 관리자에게 문의해주세요.')
      }

      const profile = data[0]
      console.log('프로필 로드 성공:', profile)
      return profile as Profile
    } catch (err) {
      console.error('프로필 로드 중 예외 발생:', err)
      throw err
    }
  }

  const refreshProfile = async () => {
    if (user) {
      try {
        setError(null)
        const profileData = await fetchProfile(user.id)
        setProfile(profileData)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '프로필 로드에 실패했습니다.'
        setError(errorMessage)
        console.error('프로필 갱신 실패:', err)
      }
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('로그아웃 실패:', error)
      setError('로그아웃에 실패했습니다.')
    }
  }

  const initializeAuth = async () => {
    try {
      setError(null)
      console.log('인증 상태 초기화 시작')
      
      // 현재 세션 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('세션 조회 실패:', sessionError)
        throw new Error('세션 확인 중 오류가 발생했습니다.')
      }

      if (session?.user) {
        console.log('기존 세션 발견:', session.user.id)
        setUser(session.user)
        
        // 프로필 로드
        try {
          const profileData = await fetchProfile(session.user.id)
          setProfile(profileData)
          console.log('인증 상태 초기화 완료 - 로그인됨')
        } catch (profileError) {
          console.error('프로필 로드 실패:', profileError)
          // 프로필 로드 실패 시에도 사용자는 로그인된 상태로 유지
          // 하지만 에러 상태를 설정하여 UI에서 적절히 처리할 수 있도록 함
          const errorMessage = profileError instanceof Error ? profileError.message : '프로필 로드에 실패했습니다.'
          setError(errorMessage)
        }
      } else {
        console.log('세션 없음 - 로그아웃 상태')
        setUser(null)
        setProfile(null)
      }
    } catch (err) {
      console.error('인증 초기화 실패:', err)
      const errorMessage = err instanceof Error ? err.message : '인증 상태 확인에 실패했습니다.'
      setError(errorMessage)
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
      setIsInitialized(true)
    }
  }

  useEffect(() => {
    // 초기화가 이미 진행 중이면 중복 실행 방지
    if (isInitialized) return

    console.log('AuthProvider 초기화 시작')
    initializeAuth()

    // 인증 상태 변경 리스너 설정
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('인증 상태 변경:', event, session?.user?.id)
        
        // 초기화가 완료된 후에만 상태 변경 처리
        if (!isInitialized) return

        setError(null)

        if (session?.user) {
          setUser(session.user)
          
          // SIGNED_IN 이벤트에서만 프로필을 새로 로드
          // TOKEN_REFRESHED 등에서는 기존 프로필 유지
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            try {
              const profileData = await fetchProfile(session.user.id)
              setProfile(profileData)
            } catch (profileError) {
              console.error('프로필 로드 실패:', profileError)
              const errorMessage = profileError instanceof Error ? profileError.message : '프로필 로드에 실패했습니다.'
              setError(errorMessage)
            }
          }
        } else {
          // 로그아웃 시
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => {
      console.log('AuthProvider 정리')
      subscription.unsubscribe()
    }
  }, [isInitialized])

  const value = {
    user,
    profile,
    loading,
    error,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 