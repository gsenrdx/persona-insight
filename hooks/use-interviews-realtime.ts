import { useCallback, useEffect } from 'react'
import { useInterviewRealtime } from '@/lib/realtime/interview-realtime-provider'
import { supabase } from '@/lib/supabase'
import { Interview, InterviewStatus } from '@/types/interview'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

export function useInterviewsRealtime(projectId: string) {
  const { user } = useAuth()
  const { interviews, isSubscribed, isLoading, error, subscribeToProject, unsubscribe } = useInterviewRealtime()

  // Subscribe to project on mount
  useEffect(() => {
    if (projectId && user) {
      // Small delay to ensure component is fully mounted
      const timeoutId = setTimeout(() => {
        subscribeToProject(projectId)
      }, 10)
      
      return () => {
        clearTimeout(timeoutId)
        // Don't immediately unsubscribe - let the provider handle cleanup
      }
    }
    // projectId나 user가 없으면 로딩 상태를 해제하지 않음
    // Provider가 초기 로딩 상태를 관리함
  }, [projectId, user, subscribeToProject])

  // Create interview
  const createInterview = useCallback(async (data: Partial<Interview>) => {
    if (!user) throw new Error('Not authenticated')

    try {
      const { data: newInterview, error } = await supabase
        .from('interviewees')
        .insert({
          ...data,
          project_id: projectId,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('인터뷰가 생성되었습니다')
      return newInterview
    } catch (error) {
      console.error('Failed to create interview:', error)
      toast.error('인터뷰 생성에 실패했습니다')
      throw error
    }
  }, [projectId, user])

  // Update interview
  const updateInterview = useCallback(async (id: string, updates: Partial<Interview>) => {
    if (!user) throw new Error('Not authenticated')

    try {
      const { error } = await supabase
        .from('interviewees')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast.success('인터뷰가 업데이트되었습니다')
    } catch (error) {
      console.error('Failed to update interview:', error)
      toast.error('인터뷰 업데이트에 실패했습니다')
      throw error
    }
  }, [user])

  // Delete interview
  const deleteInterview = useCallback(async (id: string) => {
    if (!user) throw new Error('Not authenticated')

    try {
      const { error } = await supabase
        .from('interviewees')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('인터뷰가 삭제되었습니다')
    } catch (error) {
      console.error('Failed to delete interview:', error)
      toast.error('인터뷰 삭제에 실패했습니다')
      throw error
    }
  }, [user])

  // Update interview status
  const updateStatus = useCallback(async (id: string, status: InterviewStatus) => {
    return updateInterview(id, { processing_status: status })
  }, [updateInterview])

  // Filter interviews by project
  const projectInterviews = interviews.filter(i => i.project_id === projectId)

  return {
    interviews: projectInterviews,
    isLoading,
    error,
    createInterview,
    updateInterview,
    deleteInterview,
    updateStatus,
  }
}

// Hook for single interview
export function useInterviewDetailRealtime(interviewId: string) {
  const { interviews, notes, presence, trackPresence, broadcastEvent } = useInterviewRealtime()
  
  const interview = interviews.find(i => i.id === interviewId)
  const interviewNotes = notes[interviewId] || []
  const interviewPresence = presence[interviewId] || []

  // Track user presence when viewing interview
  useEffect(() => {
    if (interviewId) {
      trackPresence(interviewId, {
        viewing: true,
        timestamp: new Date().toISOString(),
      })
    }
  }, [interviewId, trackPresence])

  return {
    interview,
    notes: interviewNotes,
    presence: interviewPresence,
    broadcastUpdate: (data: any) => broadcastEvent('interview-update', { interviewId, ...data }),
  }
}