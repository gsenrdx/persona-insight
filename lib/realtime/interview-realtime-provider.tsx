'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Interview } from '@/types/interview'
import { InterviewNote } from '@/types/interview-notes'
import { Database } from '@/types/supabase'

type InterviewRow = Database['public']['Tables']['interviews']['Row']
type InterviewNoteRow = Database['public']['Tables']['interview_notes']['Row']
type InterviewNoteReplyRow = Database['public']['Tables']['interview_note_replies']['Row']

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
  untrackPresence: () => void
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

const transformNoteRow = (row: InterviewNoteRow & { 
  created_by_profile?: any,
  replies?: any[]
}): InterviewNote => {
  return {
    id: row.id,
    interview_id: row.interview_id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
    metadata: row.metadata || {},
    script_item_ids: row.script_item_ids || [],
    created_by_profile: row.created_by_profile,
    replies: row.replies?.filter(r => !r.is_deleted) || [],
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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

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
          .select(`
            *,
            created_by_profile:profiles!created_by(
              id,
              name,
              avatar_url
            ),
            replies:interview_note_replies(
              id,
              content,
              created_by,
              created_at,
              is_deleted,
              created_by_profile:profiles!created_by(
                id,
                name,
                avatar_url
              )
            )
          `)
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
  const handleInterviewChange = useCallback(async (
    payload: RealtimePostgresChangesPayload<InterviewRow>
  ) => {
    const { eventType, new: newRow, old: oldRow } = payload

    switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
        if (newRow) {
          // Fetch complete interview data with profile
          const { data: fullInterview, error } = await supabase
            .from('interviews')
            .select(`
              *,
              created_by_profile:profiles!interviews_created_by_fkey(
                id,
                name
              ),
              interview_notes(count)
            `)
            .eq('id', newRow.id)
            .single()

          if (!error && fullInterview) {
            setState(prev => {
              let interviews = [...prev.interviews]
              
              if (eventType === 'INSERT') {
                interviews.push(transformInterviewRow(fullInterview))
              } else {
                const index = interviews.findIndex(i => i.id === fullInterview.id)
                if (index >= 0) {
                  interviews[index] = transformInterviewRow(fullInterview)
                }
              }

              return { ...prev, interviews }
            })
          }
        }
        break
        
      case 'DELETE':
        if (oldRow) {
          setState(prev => ({
            ...prev,
            interviews: prev.interviews.filter(i => i.id !== oldRow.id),
            notes: (() => {
              const { [oldRow.id]: _, ...remainingNotes } = prev.notes
              return remainingNotes
            })()
          }))
        }
        break
    }
  }, [])

  // Handle note changes
  const handleNoteChange = useCallback(async (
    payload: RealtimePostgresChangesPayload<InterviewNoteRow>
  ) => {
    const { eventType, new: newRow, old: oldRow } = payload

    switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
        if (newRow) {
          // Fetch complete note data with profile and replies
          const { data: fullNote, error } = await supabase
            .from('interview_notes')
            .select(`
              *,
              created_by_profile:profiles!created_by(
                id,
                name,
                avatar_url
              ),
              replies:interview_note_replies(
                id,
                content,
                created_by,
                created_at,
                is_deleted,
                created_by_profile:profiles!created_by(
                  id,
                  name,
                  avatar_url
                )
              )
            `)
            .eq('id', newRow.id)
            .single()

          if (!error && fullNote) {
            setState(prev => {
              const notes = { ...prev.notes }
              const interviewId = fullNote.interview_id
              
              if (!notes[interviewId]) {
                notes[interviewId] = []
              }

              if (eventType === 'INSERT') {
                notes[interviewId].push(transformNoteRow(fullNote))
              } else {
                const index = notes[interviewId].findIndex(n => n.id === fullNote.id)
                if (index >= 0) {
                  notes[interviewId][index] = transformNoteRow(fullNote)
                }
              }

              return { ...prev, notes }
            })
          }
        }
        break
        
      case 'DELETE':
        if (oldRow) {
          setState(prev => {
            const notes = { ...prev.notes }
            const interviewId = oldRow.interview_id
            if (notes[interviewId]) {
              notes[interviewId] = notes[interviewId].filter(n => n.id !== oldRow.id)
            }
            return { ...prev, notes }
          })
        }
        break
    }
  }, [])

  // Handle reply changes
  const handleReplyChange = useCallback(async (
    payload: RealtimePostgresChangesPayload<InterviewNoteReplyRow>
  ) => {
    const { eventType, new: newRow, old: oldRow } = payload

    switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
        if (newRow) {
          // Fetch complete reply data with profile
          const { data: fullReply, error } = await supabase
            .from('interview_note_replies')
            .select(`
              *,
              created_by_profile:profiles!created_by(
                id,
                name,
                avatar_url
              )
            `)
            .eq('id', newRow.id)
            .single()

          if (!error && fullReply) {
            setState(prev => {
              const notes = { ...prev.notes }
              
              // Find the note across all interviews
              for (const interviewId in notes) {
                const noteIndex = notes[interviewId].findIndex(n => n.id === fullReply.note_id)
                if (noteIndex >= 0) {
                  const note = notes[interviewId][noteIndex]
                  
                  if (eventType === 'INSERT') {
                    note.replies = [...(note.replies || []), fullReply]
                  } else {
                    const replyIndex = note.replies?.findIndex(r => r.id === fullReply.id)
                    if (replyIndex !== undefined && replyIndex >= 0 && note.replies) {
                      note.replies[replyIndex] = fullReply
                    }
                  }
                  
                  notes[interviewId][noteIndex] = { ...note }
                  break
                }
              }

              return { ...prev, notes }
            })
          }
        }
        break
        
      case 'DELETE':
        if (oldRow) {
          setState(prev => {
            const notes = { ...prev.notes }
            
            // Find and remove the reply
            for (const interviewId in notes) {
              const noteIndex = notes[interviewId].findIndex(n => n.id === oldRow.note_id)
              if (noteIndex >= 0) {
                const note = notes[interviewId][noteIndex]
                note.replies = note.replies?.filter(r => r.id !== oldRow.id) || []
                notes[interviewId][noteIndex] = { ...note }
                break
              }
            }

            return { ...prev, notes }
          })
        }
        break
    }
  }, [])

  // Handle presence sync
  const handlePresenceSync = useCallback((presenceState: any) => {
    const presence: Record<string, any[]> = {}
    
    Object.entries(presenceState).forEach(([key, presences]: [string, any]) => {
      (presences as any[]).forEach(p => {
        const { interview_id, user_id, user_name, email, ...data } = p
        if (interview_id) {
          if (!presence[interview_id]) {
            presence[interview_id] = []
          }
          // Check if user already exists to avoid duplicates
          const userExists = presence[interview_id].some(
            viewer => viewer.userId === (user_id || key)
          )
          if (!userExists) {
            presence[interview_id].push({ 
              userId: user_id || key, 
              userName: user_name,
              email: email,
              ...data 
            })
          }
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

    // If already subscribed to this project, check the channel state
    if (projectIdRef.current === projectId && channelRef.current) {
      const channelState = channelRef.current.state
      if (channelState === 'joined' || channelState === 'joining') {
        // If already joined or joining, just ensure data is loaded
        if (!state.isLoading && state.interviews.length === 0) {
          loadInitialData(projectId)
        }
        return
      }
      // If channel exists but is closed/errored, we need to clean it up
      if (channelState === 'closed' || channelState === 'errored') {
        const oldChannel = channelRef.current
        channelRef.current = null
        supabase.removeChannel(oldChannel)
        // Continue to create new channel
      }
    }

    // Unsubscribe from previous channel if exists
    if (channelRef.current) {
      // Always clean up existing channel when switching projects
      const oldChannel = channelRef.current
      channelRef.current = null
      
      // Clear health check immediately
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current)
        healthCheckIntervalRef.current = null
      }
      
      // Immediate removal for project change
      supabase.removeChannel(oldChannel)
    }

    projectIdRef.current = projectId

    // Create channel with unique name to prevent conflicts
    const channelName = `project-${projectId}-${Date.now()}-${Math.random().toString(36).substring(2)}`
    const channel = supabase
      .channel(channelName)
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
      .on<InterviewNoteReplyRow>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interview_note_replies',
        },
        handleReplyChange
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
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          setState(prev => ({ ...prev, isSubscribed: true, error: null }))
          reconnectAttemptsRef.current = 0 // Reset reconnect attempts
          // Load initial data
          loadInitialData(projectId)
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setState(prev => ({ 
            ...prev, 
            isSubscribed: false, 
            error: new Error(error?.message || 'Failed to subscribe to channel') 
          }))
          
          // Attempt to reconnect with exponential backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
            reconnectAttemptsRef.current++
            
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current)
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (projectIdRef.current === projectId && channelRef.current) {
                // Clean up the failed channel before reconnecting
                const oldChannel = channelRef.current
                channelRef.current = null
                supabase.removeChannel(oldChannel)
                
                // Now attempt to reconnect
                subscribeToProject(projectId)
              }
            }, delay)
          }
        } else if (status === 'TIMED_OUT') {
          // Handle timeout - clean up and reconnect
          if (projectIdRef.current === projectId && channelRef.current) {
            const oldChannel = channelRef.current
            channelRef.current = null
            supabase.removeChannel(oldChannel)
            
            // Clear health check
            if (healthCheckIntervalRef.current) {
              clearInterval(healthCheckIntervalRef.current)
              healthCheckIntervalRef.current = null
            }
            
            subscribeToProject(projectId)
          }
        }
      })

    channelRef.current = channel
    
    // Set up health check
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current)
    }
    
    healthCheckIntervalRef.current = setInterval(() => {
      if (channelRef.current && projectIdRef.current === projectId) {
        const state = channelRef.current.state
        if (state === 'closed' || state === 'errored') {
          // Channel disconnected, create new subscription
          // First clean up the old channel
          const oldChannel = channelRef.current
          channelRef.current = null
          supabase.removeChannel(oldChannel)
          
          // Clear health check to avoid duplicate calls
          if (healthCheckIntervalRef.current) {
            clearInterval(healthCheckIntervalRef.current)
            healthCheckIntervalRef.current = null
          }
          
          // Reset attempts and reconnect
          reconnectAttemptsRef.current = 0
          subscribeToProject(projectId)
        }
      }
    }, 30000) // Check every 30 seconds
  }, [loadInitialData, handleInterviewChange, handleNoteChange, handleReplyChange, handlePresenceSync, handleBroadcastUpdate, state.isLoading, state.interviews.length])

  // Unsubscribe
  const unsubscribe = useCallback(() => {
    // Clear any pending cleanup first
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current)
      cleanupTimeoutRef.current = null
    }
    
    // Clear any reconnect attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    // Clear health check
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current)
      healthCheckIntervalRef.current = null
    }
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
      projectIdRef.current = null
      reconnectAttemptsRef.current = 0
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
      user_id: data.userId,
      user_name: data.userName,
      email: data.email,
      ...data,
      online_at: new Date().toISOString(),
    })
  }, [])

  // Untrack presence
  const untrackPresence = useCallback(() => {
    if (!channelRef.current) return
    
    channelRef.current.untrack()
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
      // Clear any reconnect attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      
      // Clear health check
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current)
        healthCheckIntervalRef.current = null
      }
      
      // In StrictMode, React may unmount and remount quickly
      // Use shorter timeout for navigation away from project
      cleanupTimeoutRef.current = setTimeout(() => {
        if (channelRef.current && projectIdRef.current) {
          unsubscribe()
        }
      }, 100) // Short timeout to ensure cleanup on navigation
    }
  }, [unsubscribe])

  return (
    <InterviewRealtimeContext.Provider
      value={{
        ...state,
        subscribeToProject,
        unsubscribe,
        trackPresence,
        untrackPresence,
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

export function useAllPresence() {
  const { presence } = useInterviewRealtime()
  return presence
}