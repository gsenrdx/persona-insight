import { useQuery } from '@tanstack/react-query'

interface PersonaInterviewData {
  insights: Array<{
    content: string
    frequency: number
  }>
  painPoints: Array<{
    description: string
    frequency: number
  }>
  needs: Array<{
    description: string
    frequency: number
  }>
}

async function fetchPersonaInterviewData(personaId: string, companyId: string): Promise<PersonaInterviewData> {
  const response = await fetch(`/api/personas/${personaId}/interview-data?companyId=${companyId}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch interview data')
  }
  
  return response.json()
}

export function usePersonaInterviewData(personaId: string, companyId: string) {
  return useQuery({
    queryKey: ['persona-interview-data', personaId, companyId],
    queryFn: () => fetchPersonaInterviewData(personaId, companyId),
    enabled: !!personaId && !!companyId,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    cacheTime: 10 * 60 * 1000, // 10분간 메모리에 보관
    retry: 1,
    refetchOnWindowFocus: false
  })
}