'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Interview, InterviewNote } from '@/types/interview'
import { Database } from '@/types/supabase'

type InterviewRow = Database['public']['Tables']['interviewees']['Row']
type InterviewNoteRow = Database['public']['Tables']['interview_notes']['Row']

interface InterviewRealtimeState {
  interviews: Interview[]
  notes: Record<string, InterviewNote[]>
  presence: Record<string, any[]>
  isSubscribed: boolean
  error: Error | null
}

interface InterviewRealtimeContextValue extends InterviewRealtimeState {
  subscribeToProject: (projectId: string) => void
  unsubscribe: () => void
  trackPresence: (interviewId: string, data: any) => void
  broadcastEvent: (event: string, payload: any) => void
}

const InterviewRealtimeContext = createContext<InterviewRealtimeContextValue | null>(null)

export function InterviewRealtimeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<InterviewRealtimeState>({
    interviews: [],
    notes: {},
    presence: {},
    isSubscribed: false,
    error: null,
  })
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const projectIdRef = useRef<string | null>(null)

  // Subscribe to project interviews
  const subscribeToProject = useCallback((projectId: string) => {
    // Unsubscribe from previous channel if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
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
          table: 'interviewees',
          filter: `project_id=eq.${projectId}`,
        },
        (payload: RealtimePostgresChangesPayload<InterviewRow>) => {
          handleInterviewChange(payload)
        }
      )
      .on<InterviewNoteRow>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interview_notes',
        },
        (payload: RealtimePostgresChangesPayload<InterviewNoteRow>) => {
          // Filter notes client-side for interviews in this project
          const interviews = state.interviews
          const isInProject = interviews.some(i => i.id === payload.new?.interview_id)
          if (payload.new && isInProject) {
            handleNoteChange(payload)
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState()
        handlePresenceSync(presenceState)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
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
  }, [state.interviews])

  // Unsubscribe from channel
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
        error: null,
      })
    }
  }, [])

  // Track presence for collaborative features
  const trackPresence = useCallback((interviewId: string, data: any) => {
    if (!channelRef.current) return

    channelRef.current.track({
      interview_id: interviewId,
      ...data,
      online_at: new Date().toISOString(),
    })
  }, [])

  // Broadcast custom events
  const broadcastEvent = useCallback((event: string, payload: any) => {
    if (!channelRef.current) return

    channelRef.current.send({
      type: 'broadcast',
      event,
      payload,
    })
  }, [])

  // Load initial data when subscribing
  const loadInitialData = async (projectId: string) => {
    try {
      // Fetch interviews
      const { data: interviews, error: interviewsError } = await supabase
        .from('interviewees')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (interviewsError) throw interviewsError

      // Fetch notes for all interviews
      const interviewIds = interviews?.map(i => i.id) || []
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
      }))
    } catch (error) {
      console.error('Failed to load initial data:', error)
      setState(prev => ({ ...prev, error: error as Error }))
    }
  }

  // Handle interview changes
  const handleInterviewChange = (payload: RealtimePostgresChangesPayload<InterviewRow>) => {
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
  }

  // Handle note changes
  const handleNoteChange = (payload: RealtimePostgresChangesPayload<InterviewNoteRow>) => {
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
  }

  // Handle presence sync
  const handlePresenceSync = (presenceState: any) => {
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
  }

  // Handle broadcast updates
  const handleBroadcastUpdate = (payload: any) => {
    // Handle custom broadcast events
    console.log('Broadcast update:', payload)
  }

  // Check if interview belongs to current project
  const isInterviewInProject = (interviewId: string): boolean => {
    return state.interviews.some(i => i.id === interviewId)
  }

  // Transform database rows
  const transformInterviewRow = (row: InterviewRow): Interview => {
    return {
      id: row.id,
      project_id: row.project_id,
      name: row.name,
      role: row.role || '',
      interview_date: row.interview_date || '',
      interview_method: row.interview_method || '',
      file_name: row.file_name || '',
      file_url: row.file_url || '',
      processing_status: row.processing_status as any,
      interview_insights: row.interview_insights || {},
      created_at: row.created_at,
      updated_at: row.updated_at,
      metadata: row.metadata || {},
      summary: row.summary || '',
      topics: row.topics || [],
      key_quotes: row.key_quotes || [],
      pain_points: row.pain_points || [],
      needs: row.needs || [],
      behaviors: row.behaviors || [],
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

  // Cleanup on unmount (StrictMode 대응)
  useEffect(() => {
    return () => {
      // StrictMode에서 빠른 unmount/remount 방지
      const timeoutId = setTimeout(() => {
        if (channelRef.current) {
          unsubscribe()
        }
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
  }, [])

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