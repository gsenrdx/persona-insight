/**
 * Interviews Hook - Unified API
 * Provides a single interface for interview operations with broadcast realtime
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRealtime, useInterviews as useRealtimeInterviews, useInterviewNotes as useRealtimeNotes, usePresence as useRealtimePresence } from '@/lib/realtime'
import type { Interview } from '@/types/interview'

// Main interviews hook with realtime support
export function useInterviewsRealtime(projectId: string, isAdmin: boolean = false) {
  const { session } = useAuth()
  const { subscribeToProject, refresh } = useRealtime()
  const interviews = useRealtimeInterviews()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Subscribe to project on mount
  useEffect(() => {
    if (!projectId) return
    
    let mounted = true
    
    const subscribe = async () => {
      if (!mounted) return
      
      setIsLoading(true)
      try {
        await subscribeToProject(projectId)
        if (mounted) {
          setIsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error)
          setIsLoading(false)
        }
      }
    }
    
    subscribe()
    
    return () => {
      mounted = false
    }
  }, [projectId, subscribeToProject])

  // Create interview
  const createInterview = useCallback(async (data: Partial<Interview>) => {
    if (!session?.access_token) {
      toast.error('인증이 필요합니다')
      return
    }

    try {
      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          project_id: projectId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create interview')
      }

      const result = await response.json()
      toast.success('인터뷰가 생성되었습니다')
      return result.data
    } catch (err) {
      toast.error('인터뷰 생성에 실패했습니다')
      throw err
    }
  }, [session, projectId])

  // Update interview
  const updateInterview = useCallback(async (id: string, data: Partial<Interview>) => {
    if (!session?.access_token) {
      toast.error('인증이 필요합니다')
      return
    }

    try {
      const response = await fetch(`/api/interviews/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Failed to update interview')
      }

      const result = await response.json()
      toast.success('인터뷰가 수정되었습니다')
      return result.data
    } catch (err) {
      toast.error('인터뷰 수정에 실패했습니다')
      throw err
    }
  }, [session])

  // Delete interview
  const deleteInterview = useCallback(async (id: string) => {
    if (!session?.access_token || !isAdmin) {
      toast.error('권한이 없습니다')
      return
    }

    try {
      const response = await fetch(`/api/interviews/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete interview')
      }

      toast.success('인터뷰가 삭제되었습니다')
    } catch (err) {
      toast.error('인터뷰 삭제에 실패했습니다')
      throw err
    }
  }, [session, isAdmin])

  return {
    interviews: interviews.filter(i => i.project_id === projectId),
    isLoading,
    error,
    createInterview,
    updateInterview,
    deleteInterview,
    refresh
  }
}

// Interview detail hook with realtime notes
export function useInterviewDetailRealtime(interviewId: string) {
  const { trackPresence, untrackPresence } = useRealtime()
  const interviews = useRealtimeInterviews()
  const notes = useRealtimeNotes(interviewId)
  const presence = useRealtimePresence(interviewId)
  
  const interview = interviews.find(i => i.id === interviewId)
  
  // Track presence when viewing interview
  useEffect(() => {
    if (interviewId) {
      trackPresence(interviewId)
      return () => {
        untrackPresence()
      }
    }
  }, [interviewId, trackPresence, untrackPresence])

  // Broadcast update function (for compatibility)
  const broadcastUpdate = useCallback(async (data: any) => {
    // This functionality is now handled automatically by the broadcast system
    console.log('Broadcast update:', data)
  }, [])

  return {
    interview,
    notes,
    presence,
    broadcastUpdate
  }
}

// Persona assignment mutation hook
export function useAssignPersonaDefinitionToInterview() {
  const { session } = useAuth()
  const { refresh } = useRealtime()
  
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
      // Refresh realtime data
      refresh()
    },
    onError: (error: Error) => {
      toast.error(error.message || '페르소나 할당에 실패했습니다')
    }
  })
}

// Re-export for backward compatibility
export { useInterviewsRealtime as default }