import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { useAuth } from './use-auth'

export interface PersonaDefinition {
  id: string
  name_ko: string
  name_en: string
  description: string | null
  tags: string[] | null
  metrics: any
  evolution_path: string | null
  created_at: string | null
  updated_at: string | null
}

/**
 * 페르소나 정의 목록 조회
 */
export function usePersonaDefinitions() {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.personas.definitions(),
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다')
      
      const { data, error } = await supabase
        .from('persona_definitions')
        .select('*')
        .order('name_ko', { ascending: true })
        
      if (error) throw error
      return data as PersonaDefinition[]
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10분간 캐시
  })
}