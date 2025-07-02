import { useCallback, useEffect } from 'react'
import { useInterviewRealtime } from '@/lib/realtime/interview-realtime-provider'
import { supabase } from '@/lib/supabase'
import { Interview, InterviewStatus } from '@/types/interview'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

export function useInterviewsRealtime(projectId: string, isAdmin?: boolean) {
  const { user } = useAuth()
  const { interviews, isSubscribed, isLoading, error, subscribeToProject, unsubscribe } = useInterviewRealtime()

  // Subscribe to project on mount
  useEffect(() => {
    if (projectId && user) {
      // Direct subscription without delay since provider handles state properly now
      subscribeToProject(projectId)
    }
    // No cleanup needed - provider handles lifecycle
  }, [projectId, user, subscribeToProject])

  // Create interview
  const createInterview = useCallback(async (data: Partial<Interview>) => {
    if (!user) throw new Error('Not authenticated')

    try {
      const { data: newInterview, error } = await supabase
        .from('interviews')
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
      // Failed to create interview
      toast.error('인터뷰 생성에 실패했습니다')
      throw error
    }
  }, [projectId, user])

  // Update interview
  const updateInterview = useCallback(async (id: string, updates: Partial<Interview>) => {
    if (!user) throw new Error('Not authenticated')

    try {
      const { error } = await supabase
        .from('interviews')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast.success('인터뷰가 업데이트되었습니다')
    } catch (error) {
      // Failed to update interview
      toast.error('인터뷰 업데이트에 실패했습니다')
      throw error
    }
  }, [user])

  // Delete interview
  const deleteInterview = useCallback(async (id: string) => {
    if (!user) throw new Error('Not authenticated')

    try {
      // Build the delete query
      let query = supabase
        .from('interviews')
        .delete()
        .eq('id', id)
      
      // If not admin, only allow deleting own interviews
      if (!isAdmin) {
        query = query.eq('created_by', user.id)
      }
      
      const { error, count } = await query
        .select('id', { count: 'exact', head: true })

      if (error) throw error

      // 삭제가 성공했지만 실시간 업데이트가 작동하지 않는 경우를 대비
      // (REPLICA IDENTITY가 설정되지 않은 경우)
      if (count === 1) {
        // 약간의 지연 후 수동으로 데이터 새로고침
        // 실시간이 작동하면 이 작업은 중복되지만 해가 없음
        setTimeout(() => {
          if (projectId) {
            subscribeToProject(projectId)
          }
        }, 500)
      }

      toast.success('인터뷰가 삭제되었습니다')
    } catch (error) {
      // Failed to delete interview
      toast.error('인터뷰 삭제에 실패했습니다')
      throw error
    }
  }, [user, projectId, subscribeToProject, isAdmin])

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
  const { user, profile } = useAuth()
  const { interviews, notes, presence, trackPresence, untrackPresence, broadcastEvent } = useInterviewRealtime()
  
  const interview = interviews.find(i => i.id === interviewId)
  const interviewNotes = notes[interviewId] || []
  const interviewPresence = presence[interviewId] || []

  // Track user presence when viewing interview
  useEffect(() => {
    // Only track presence if we have a valid interviewId
    if (interviewId && interviewId.length > 0 && user && profile) {
      // Tracking presence for interview
      trackPresence(interviewId, {
        userId: user.id,
        userName: profile.name || 'Unknown User',
        email: user.email, // Add email from user object
        viewing: true,
        timestamp: new Date().toISOString(),
      })
      
      // Untrack presence when leaving the interview or interviewId changes
      return () => {
        // Untracking presence for interview
        untrackPresence()
      }
    } else if (!interviewId || interviewId.length === 0) {
      // If no interviewId, make sure to untrack any existing presence
      // No interview selected, untracking presence
      untrackPresence()
    }
  }, [interviewId, user, profile, trackPresence, untrackPresence])

  return {
    interview,
    notes: interviewNotes,
    presence: interviewPresence,
    broadcastUpdate: (data: any) => broadcastEvent('interview-update', { interviewId, ...data }),
  }
}