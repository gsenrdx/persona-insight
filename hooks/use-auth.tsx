'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { projectsApi } from '@/lib/api/projects'

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
  session: any | null
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = async (userId: string) => {
    try {
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
        .single()

      if (error) {
        throw new Error(`프로필 로드 실패: ${error.message}`)
      }

      if (!data) {
        throw new Error('프로필을 찾을 수 없습니다.')
      }

      return data as Profile

    } catch (err) {
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
      }
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      
      // Supabase 로그아웃 실행
      await supabase.auth.signOut()
      
      // 상태 초기화
      setUser(null)
      setProfile(null)
      setSession(null)
      
      // 로그인 페이지로 리다이렉트
      window.location.href = '/login'
      
    } catch (error) {
      setError('로그아웃에 실패했습니다.')
    }
  }



  // Visibility API를 활용한 토큰 갱신
  useEffect(() => {
    if (!session) return

    const handleVisibilityChange = async () => {
      if (!document.hidden && session) {
        // 탭이 다시 보이게 되었을 때
        try {
          const { data: { session: currentSession }, error } = await supabase.auth.getSession()
          
          if (!currentSession || error) {
            // 세션이 만료되었으면 로그아웃
            await signOut()
          } else if (currentSession.expires_at) {
            // 토큰 만료 시간 확인
            const expiresAt = new Date(currentSession.expires_at * 1000)
            const now = new Date()
            const timeUntilExpiry = expiresAt.getTime() - now.getTime()
            
            // 5분 이내에 만료 예정이면 즉시 갱신
            if (timeUntilExpiry < 5 * 60 * 1000) {
              const { data, error } = await supabase.auth.refreshSession()
              if (error) {
                // 갱신 실패 시 로그아웃
                await signOut()
              } else if (data.session) {
                setSession(data.session)
              }
            }
          }
        } catch (err) {
          // 에러 발생 시 안전하게 처리
          console.error('토큰 갱신 중 오류:', err)
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // 탭이 활성화된 상태면 즉시 확인
    if (!document.hidden) {
      handleVisibilityChange()
    }
    
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [session, signOut])

  useEffect(() => {
    let mounted = true
    let subscription: ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription']

    const initializeAuth = async () => {
      try {
        setLoading(true)
        setError(null)

        // 현재 세션 확인
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          throw new Error(`세션 확인 실패: ${sessionError.message}`)
        }

        if (!mounted) return

        if (session?.user) {
          setUser(session.user)
          setSession(session)
          try {
            const profileData = await fetchProfile(session.user.id)
            if (mounted) {
              setProfile(profileData)
              setError(null)
              
              // 프로젝트 데이터 프리페칭
              if (profileData.company_id && session) {
                const fetchProjectsForPrefetch = async () => {
                  const response = await projectsApi.getProjects(
                    session.access_token,
                    { companyId: profileData.company_id, userId: profileData.id }
                  )
                  return response.data
                }
                
                queryClient.prefetchQuery({
                  queryKey: queryKeys.projects.byCompanyAndUser(profileData.company_id, profileData.id),
                  queryFn: fetchProjectsForPrefetch,
                  staleTime: 10 * 60 * 1000, // 10분
                })
              }
            }
          } catch (err) {
            if (mounted) {
              const errorMessage = err instanceof Error ? err.message : '프로필 로드에 실패했습니다.'
              setError(errorMessage)
              setProfile(null)
            }
          }
        } else {
          setUser(null)
          setProfile(null)
          setSession(null)
        }

        // 인증 상태 변화 리스너 등록
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return
            
            // SIGNED_OUT 이벤트 처리
            if (event === 'SIGNED_OUT') {
              setUser(null)
              setSession(null)
              setProfile(null)
              setError(null)
              return
            }
            
            // 토큰 갱신 성공
            if (event === 'TOKEN_REFRESHED' && session) {
              setSession(session)
              return
            }
            
            // 토큰 갱신 실패 시 강제 로그아웃
            if (event === 'TOKEN_REFRESH_FAILED' || event === 'USER_UPDATED' && !session) {
              setUser(null)
              setSession(null)
              setProfile(null)
              setError('세션이 만료되었습니다. 다시 로그인해주세요.')
              window.location.href = '/login?expired=true'
              return
            }

            try {
              if (session?.user) {
                setUser(session.user)
                setSession(session)
                const profileData = await fetchProfile(session.user.id)
                if (mounted) {
                  setProfile(profileData)
                  setError(null)
                  
                  // 프로젝트 데이터 프리페칭
                  if (profileData.company_id && session) {
                    const fetchProjectsForPrefetch = async () => {
                      const response = await projectService.getProjects(
                        session.access_token,
                        { companyId: profileData.company_id, userId: profileData.id }
                      )
                      return response.data
                    }
                    
                    queryClient.prefetchQuery({
                      queryKey: queryKeys.projects.byCompanyAndUser(profileData.company_id, profileData.id),
                      queryFn: fetchProjectsForPrefetch,
                      staleTime: 10 * 60 * 1000, // 10분
                    })
                  }
                }
              } else {
                setUser(null)
                setProfile(null)
                setSession(null)
                setError(null)
              }
            } catch (error) {
              if (mounted) {
                const errorMessage = error instanceof Error ? error.message : '프로필 로드에 실패했습니다.'
                setError(errorMessage)
                setProfile(null)
              }
            }
          }
        )

        subscription = authSubscription
      } catch (error) {
        if (mounted) {
          const errorMessage = error instanceof Error ? error.message : '인증 초기화에 실패했습니다.'
          setError(errorMessage)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const value = {
    user,
    profile,
    session,
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