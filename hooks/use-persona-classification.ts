import { useQuery } from '@tanstack/react-query'

export interface ClassificationInfo {
  classificationName: string
  classificationDescription: string
  typeName: string
  typeDescription: string
  typeId: string
}

async function fetchPersonaClassificationInfo(personaId: string, companyId: string): Promise<ClassificationInfo[]> {
  const response = await fetch(`/api/personas/${personaId}/classification-info?companyId=${companyId}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch classification info')
  }
  
  return response.json()
}

export function usePersonaClassification(personaId: string, companyId: string) {
  return useQuery({
    queryKey: ['persona-classification', personaId, companyId],
    queryFn: () => fetchPersonaClassificationInfo(personaId, companyId),
    enabled: !!personaId && !!companyId,
    staleTime: 10 * 60 * 1000, // 10분간 캐시 유지 (분류 정보는 자주 변경되지 않음)
    cacheTime: 30 * 60 * 1000, // 30분간 메모리에 보관
    retry: 1,
    refetchOnWindowFocus: false
  })
}