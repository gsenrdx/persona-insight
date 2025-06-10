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



  useEffect(() => {
    let subscription: ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'];

    (async () => {
      try {
        setLoading(true);

        // 1) 먼저 현재 세션을 가져와 초기 상태를 설정합니다.
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          try {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
          } catch (err) {
            setError(err instanceof Error ? err.message : '프로필 로드에 실패했습니다.');
          }
        } else {
          setUser(null);
          setProfile(null);
        }

        // 2) 이후 변화에 대응하도록 리스너를 등록합니다.
        const listener = supabase.auth.onAuthStateChange(async (_event, session) => {
          try {
            if (session?.user) {
              setUser(session.user);
              const profileData = await fetchProfile(session.user.id);
              setProfile(profileData);
              setError(null);
            } else {
              setUser(null);
              setProfile(null);
              setError(null);
            }
          } catch (error) {
            setError(error instanceof Error ? error.message : '프로필 로드에 실패했습니다.');
            setProfile(null);
          }
        });

        subscription = listener.data.subscription;
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

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