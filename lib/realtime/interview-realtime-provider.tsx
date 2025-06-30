'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Interview, InterviewNote } from '@/types/interview'
import { Database } from '@/types/supabase'

type InterviewRow = Database['public']['Tables']['interviews']['Row']
type InterviewNoteRow = Database['public']['Tables']['interview_notes']['Row']

interface InterviewRealtimeState {
  interviews: Interview[]
  notes: Record<string, InterviewNote[]>
  presence: Record<string, any[]>
  isSubscribed: boolean
  isLoading: boolean
  error: Error | null
}

interface InterviewRealtimeContextValue extends InterviewRealtimeState {
  subscribeToProject: (projectId: string) => void
  unsubscribe: () => void
  trackPresence: (interviewId: string, data: any) => void
  broadcastEvent: (event: string, payload: any) => void
}

const InterviewRealtimeContext = createContext<InterviewRealtimeContextValue | null>(null)

// Transform functions outside component to avoid recreating
const transformInterviewRow = (row: InterviewRow & { 
  created_by_profile?: any,
  interview_notes?: any
}): Interview => {
  return {
    id: row.id,
    company_id: row.company_id,
    project_id: row.project_id,
    raw_text: row.raw_text,
    cleaned_script: row.cleaned_script as any,
    metadata: row.metadata as any,
    summary: row.summary,
    title: row.title,
    interview_date: row.interview_date,
    persona_id: row.persona_id,
    status: row.status as Interview['status'],
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    session_info: row.session_info as any,
    interviewee_profile: row.interviewee_profile as any,
    interview_quality_assessment: row.interview_quality_assessment as any,
    key_takeaways: row.key_takeaways,
    primary_pain_points: row.primary_pain_points as any,
    primary_needs: row.primary_needs as any,
    hmw_questions: row.hmw_questions as any,
    ai_persona_match: row.ai_persona_match,
    ai_persona_explanation: row.ai_persona_explanation,
    created_by_profile: row.created_by_profile,
    note_count: row.interview_notes?.[0]?.count || 0,
  }
}

const transformNoteRow = (row: InterviewNoteRow): InterviewNote => {
  return {
    id: row.id,
    interview_id: row.interview_id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
    metadata: row.metadata || {},
  }
}

export function InterviewRealtimeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<InterviewRealtimeState>({
    interviews: [],
    notes: {},
    presence: {},
    isSubscribed: false,
    isLoading: true, // 초기 로딩 상태를 true로 설정
    error: null,
  })
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const projectIdRef = useRef<string | null>(null)
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load initial data
  const loadInitialData = useCallback(async (projectId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      // Fetch interviews with creator profile and note count
      const { data: interviews, error: interviewsError } = await supabase
        .from('interviews')
        .select(`
          *,
          created_by_profile:profiles!interviews_created_by_fkey(
            id,
            name
          ),
          interview_notes(count)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (interviewsError) throw interviewsError

      // Fetch notes for all interviews
      const interviewIds = interviews?.map(i => i.id) || []
      
      if (interviewIds.length > 0) {
        const { data: notes, error: notesError } = await supabase
          .from('interview_notes')
          .select('*')
          .in('interview_id', interviewIds)
          .order('created_at', { ascending: false })

        if (notesError) throw notesError

        // Group notes by interview
        const notesByInterview: Record<string, InterviewNote[]> = {}
        notes?.forEach(note => {
          if (!notesByInterview[note.interview_id]) {
            notesByInterview[note.interview_id] = []
          }
          notesByInterview[note.interview_id].push(transformNoteRow(note))
        })

        setState(prev => ({
          ...prev,
          interviews: interviews?.map(transformInterviewRow) || [],
          notes: notesByInterview,
          isLoading: false,
        }))
      } else {
        setState(prev => ({
          ...prev,
          interviews: interviews?.map(transformInterviewRow) || [],
          notes: {},
          isLoading: false,
        }))
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error as Error,
        isLoading: false,
      }))
    }
  }, [])

  // Handle interview changes
  const handleInterviewChange = useCallback((
    payload: RealtimePostgresChangesPayload<InterviewRow>
  ) => {
    setState(prev => {
      const { eventType, new: newRow, old: oldRow } = payload
      let interviews = [...prev.interviews]

      switch (eventType) {
        case 'INSERT':
          if (newRow) {
            interviews.push(transformInterviewRow(newRow))
          }
          break
        case 'UPDATE':
          if (newRow) {
            const index = interviews.findIndex(i => i.id === newRow.id)
            if (index >= 0) {
              interviews[index] = transformInterviewRow(newRow)
            }
          }
          break
        case 'DELETE':
          if (oldRow) {
            interviews = interviews.filter(i => i.id !== oldRow.id)
            // Also remove notes for this interview
            const { [oldRow.id]: _, ...remainingNotes } = prev.notes
            return { ...prev, interviews, notes: remainingNotes }
          }
          break
      }

      return { ...prev, interviews }
    })
  }, [])

  // Handle note changes
  const handleNoteChange = useCallback((
    payload: RealtimePostgresChangesPayload<InterviewNoteRow>
  ) => {
    setState(prev => {
      const { eventType, new: newRow, old: oldRow } = payload
      const notes = { ...prev.notes }

      switch (eventType) {
        case 'INSERT':
          if (newRow) {
            const interviewId = newRow.interview_id
            if (!notes[interviewId]) {
              notes[interviewId] = []
            }
            notes[interviewId].push(transformNoteRow(newRow))
          }
          break
        case 'UPDATE':
          if (newRow) {
            const interviewId = newRow.interview_id
            if (notes[interviewId]) {
              const index = notes[interviewId].findIndex(n => n.id === newRow.id)
              if (index >= 0) {
                notes[interviewId][index] = transformNoteRow(newRow)
              }
            }
          }
          break
        case 'DELETE':
          if (oldRow) {
            const interviewId = oldRow.interview_id
            if (notes[interviewId]) {
              notes[interviewId] = notes[interviewId].filter(n => n.id !== oldRow.id)
            }
          }
          break
      }

      return { ...prev, notes }
    })
  }, [])

  // Handle presence sync
  const handlePresenceSync = useCallback((presenceState: any) => {
    const presence: Record<string, any[]> = {}
    
    Object.entries(presenceState).forEach(([key, presences]: [string, any]) => {
      (presences as any[]).forEach(p => {
        const { interview_id, ...data } = p
        if (interview_id) {
          if (!presence[interview_id]) {
            presence[interview_id] = []
          }
          presence[interview_id].push({ userId: key, ...data })
        }
      })
    })

    setState(prev => ({ ...prev, presence }))
  }, [])

  // Handle broadcast updates
  const handleBroadcastUpdate = useCallback((payload: any) => {
    // Handle custom broadcast events silently
  }, [])

  // Subscribe to project
  const subscribeToProject = useCallback((projectId: string) => {
    // Clear any pending cleanup
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current)
      cleanupTimeoutRef.current = null
    }

    // If already subscribed to this project, just reload data
    if (projectIdRef.current === projectId && channelRef.current) {
      const channelState = channelRef.current.state
      if (channelState === 'joined') {
        loadInitialData(projectId)
        return
      }
    }

    // Unsubscribe from previous channel if exists
    if (channelRef.current) {
      const oldChannel = channelRef.current
      channelRef.current = null
      // Delay removal to avoid connection issues
      setTimeout(() => {
        supabase.removeChannel(oldChannel)
      }, 50)
    }

    projectIdRef.current = projectId

    // Create channel following Supabase docs pattern
    const channel = supabase
      .channel(`project-${projectId}`)
      .on<InterviewRow>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interviews',
          filter: `project_id=eq.${projectId}`,
        },
        handleInterviewChange
      )
      .on<InterviewNoteRow>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interview_notes',
        },
        (payload) => {
          // We'll filter on client side after checking if interview belongs to project
          setState(prev => {
            const isInProject = prev.interviews.some(i => i.id === payload.new?.interview_id)
            if (isInProject || payload.eventType === 'DELETE') {
              handleNoteChange(payload)
            }
            return prev
          })
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState()
        handlePresenceSync(presenceState)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Silent join tracking
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Silent leave tracking
      })
      .on('broadcast', { event: 'interview-update' }, ({ payload }) => {
        handleBroadcastUpdate(payload)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setState(prev => ({ ...prev, isSubscribed: true, error: null }))
          // Load initial data
          loadInitialData(projectId)
        } else if (status === 'CHANNEL_ERROR') {
          setState(prev => ({ 
            ...prev, 
            isSubscribed: false, 
            error: new Error('Failed to subscribe to channel') 
          }))
        }
      })

    channelRef.current = channel
  }, [loadInitialData, handleInterviewChange, handleNoteChange, handlePresenceSync, handleBroadcastUpdate])

  // Unsubscribe
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
      projectIdRef.current = null
      setState({
        interviews: [],
        notes: {},
        presence: {},
        isSubscribed: false,
        isLoading: false, // 구독 해제 시 로딩 완료
        error: null,
      })
    }
  }, [])

  // Track presence
  const trackPresence = useCallback((interviewId: string, data: any) => {
    if (!channelRef.current) return

    channelRef.current.track({
      interview_id: interviewId,
      ...data,
      online_at: new Date().toISOString(),
    })
  }, [])

  // Broadcast event
  const broadcastEvent = useCallback((event: string, payload: any) => {
    if (!channelRef.current) return

    channelRef.current.send({
      type: 'broadcast',
      event,
      payload,
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // In StrictMode, React may unmount and remount quickly
      // Use longer timeout to prevent closing connection that will be immediately reopened
      cleanupTimeoutRef.current = setTimeout(() => {
        if (channelRef.current && projectIdRef.current) {
          unsubscribe()
        }
      }, 500)
    }
  }, []) // Empty deps intentionally - we only want cleanup on final unmount

  return (
    <InterviewRealtimeContext.Provider
      value={{
        ...state,
        subscribeToProject,
        unsubscribe,
        trackPresence,
        broadcastEvent,
      }}
    >
      {children}
    </InterviewRealtimeContext.Provider>
  )
}

// Hook to use the context
export function useInterviewRealtime() {
  const context = useContext(InterviewRealtimeContext)
  if (!context) {
    throw new Error('useInterviewRealtime must be used within InterviewRealtimeProvider')
  }
  return context
}

// Convenience hooks
export function useInterviews() {
  const { interviews } = useInterviewRealtime()
  return interviews
}

export function useInterview(interviewId: string) {
  const { interviews } = useInterviewRealtime()
  return interviews.find(i => i.id === interviewId)
}

export function useInterviewNotes(interviewId: string) {
  const { notes } = useInterviewRealtime()
  return notes[interviewId] || []
}

export function useInterviewPresence(interviewId: string) {
  const { presence } = useInterviewRealtime()
  return presence[interviewId] || []
}