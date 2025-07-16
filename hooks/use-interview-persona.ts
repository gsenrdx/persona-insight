'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Interview } from '@/types/interview'

// Persona assignment mutation hook
export function useAssignPersonaDefinitionToInterview() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      interviewId, 
      personaDefinitionId 
    }: { 
      interviewId: string; 
      personaDefinitionId: string
    }) => {
      if (!session?.access_token) {
        throw new Error('인증이 필요합니다')
      }
      
      const response = await fetch(`/api/interviews/${interviewId}/assign-persona`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ personaCombinationId: personaDefinitionId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '페르소나 할당에 실패했습니다')
      }

      const result = await response.json()
      return result.data
    },
    onMutate: async (variables) => {
      // 인터뷰 리스트 낙관적 업데이트
      const queryKey = ['interviews']
      const previousInterviews = queryClient.getQueryData(queryKey)
      
      // 낙관적 업데이트
      queryClient.setQueriesData(
        { queryKey },
        (oldData: Interview[] | undefined) => {
          if (!oldData) return oldData
          
          return oldData.map(interview => 
            interview.id === variables.interviewId
              ? { 
                  ...interview, 
                  persona_combination_id: variables.personaDefinitionId,
                  // 임시로 persona_combination 정보 업데이트 (실제 데이터는 서버에서 받아옴)
                  persona_combination: {
                    id: variables.personaDefinitionId,
                    persona_code: 'Loading...',
                    type_ids: [],
                    title: '업데이트 중...',
                    description: ''
                  }
                }
              : interview
          )
        }
      )
      
      return { previousInterviews }
    },
    onSuccess: (data, variables) => {
      toast.success('페르소나가 할당되었습니다')
      
      // 서버에서 받은 실제 데이터로 업데이트
      queryClient.setQueriesData(
        { queryKey: ['interviews'] },
        (oldData: Interview[] | undefined) => {
          if (!oldData) return oldData
          
          return oldData.map(interview => 
            interview.id === variables.interviewId
              ? { ...interview, ...data }
              : interview
          )
        }
      )
      
      // 페르소나 관련 캐시 무효화 (인터뷰 수 업데이트)
      queryClient.invalidateQueries({
        queryKey: ['personas']
      })
    },
    onError: (error: Error, variables, context) => {
      // 에러 시 롤백
      if (context?.previousInterviews) {
        queryClient.setQueryData(['interviews'], context.previousInterviews)
      }
      toast.error(error.message || '페르소나 할당에 실패했습니다')
    }
  })
}