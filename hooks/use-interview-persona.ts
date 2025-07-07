'use client'

import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

// Persona assignment mutation hook
export function useAssignPersonaDefinitionToInterview() {
  const { session } = useAuth()
  
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
        body: JSON.stringify({ personaDefinitionId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '페르소나 할당에 실패했습니다')
      }

      const result = await response.json()
      return result.data
    },
    onSuccess: () => {
      toast.success('페르소나가 할당되었습니다')
    },
    onError: (error: Error) => {
      toast.error(error.message || '페르소나 할당에 실패했습니다')
    }
  })
}