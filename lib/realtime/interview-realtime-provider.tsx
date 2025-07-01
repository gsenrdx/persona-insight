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
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const presenceCleanupIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const presenceUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentPresenceRef = useRef<any>(null)
  const isSubscribingRef = useRef(false)

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
    const now = Date.now()
    const PRESENCE_TIMEOUT = 60000 // 60 seconds timeout
    
    Object.entries(presenceState).forEach(([key, presences]: [string, any]) => {
      (presences as any[]).forEach(p => {
        const { interview_id, user_id, user_name, email, online_at, ...data } = p
        if (interview_id) {
          if (!presence[interview_id]) {
            presence[interview_id] = []
          }
          
          // Check if presence is still valid (not timed out)
          const lastSeen = online_at ? new Date(online_at).getTime() : now
          if (now - lastSeen < PRESENCE_TIMEOUT) {
            // Check if user already exists to avoid duplicates
            const userExists = presence[interview_id].some(
              viewer => viewer.userId === (user_id || key)
            )
            if (!userExists) {
              presence[interview_id].push({ 
                userId: user_id || key, 
                userName: user_name,
                email: email,
                onlineAt: online_at || new Date().toISOString(),
                ...data 
              })
            }
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
  
  // Setup presence cleanup
  const setupPresenceCleanup = useCallback((channel: RealtimeChannel) => {
    // Clear existing interval
    if (presenceCleanupIntervalRef.current) {
      clearInterval(presenceCleanupIntervalRef.current)
    }
    
    // Clean up stale presence every 30 seconds
    presenceCleanupIntervalRef.current = setInterval(() => {
      if (channel.state === 'joined') {
        // Trigger presence sync to clean up stale entries
        const presenceState = channel.presenceState()
        handlePresenceSync(presenceState)
      }
    }, 30 * 1000) // 30 seconds
  }, [handlePresenceSync])
  
  // Setup token refresh
  const setupTokenRefresh = useCallback(() => {
    // Clear existing interval
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current)
    }
    
    tokenRefreshIntervalRef.current = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token && channelRef.current) {
          // Update the channel's auth token
          supabase.realtime.setAuth(session.access_token)
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[Realtime] JWT token refreshed')
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Realtime] Failed to refresh JWT token:', error)
        }
      }
    }, 30 * 60 * 1000) // Refresh every 30 minutes
  }, [])
  
  // Setup health check
  const setupHealthCheck = useCallback((channel: RealtimeChannel, projectId: string) => {
    // Clear existing interval
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current)
    }
    
    healthCheckIntervalRef.current = setInterval(() => {
      if (channelRef.current && projectIdRef.current === projectId) {
        const state = channelRef.current.state
        
        // Development logging
        if (process.env.NODE_ENV === 'development') {
          console.log('[Realtime] Health check - Channel state:', state)
        }
        
        // Only reconnect if truly disconnected, not if temporarily interrupted
        if (state === 'closed' || state === 'errored') {
          console.log('[Realtime] Health check detected disconnection, attempting to reconnect')
          
          // Channel disconnected, create new subscription
          const oldChannel = channelRef.current
          channelRef.current = null
          
          // Clear health check to avoid duplicate calls
          if (healthCheckIntervalRef.current) {
            clearInterval(healthCheckIntervalRef.current)
            healthCheckIntervalRef.current = null
          }
          
          // Clear token refresh
          if (tokenRefreshIntervalRef.current) {
            clearInterval(tokenRefreshIntervalRef.current)
            tokenRefreshIntervalRef.current = null
          }
          
          // Clear intervals
          if (presenceCleanupIntervalRef.current) {
            clearInterval(presenceCleanupIntervalRef.current)
            presenceCleanupIntervalRef.current = null
          }
          
          if (presenceUpdateIntervalRef.current) {
            clearInterval(presenceUpdateIntervalRef.current)
            presenceUpdateIntervalRef.current = null
          }
          
          // Channel is already closed/errored, just remove and reconnect
          supabase.removeChannel(oldChannel)
          
          // Small delay to ensure cleanup is complete
          setTimeout(() => {
            // Don't reset attempts here - use existing count
            subscribeToProject(projectId)
          }, 100)
        }
      }
    }, 30000) // Check every 30 seconds
  }, [])

  // Subscribe to project
  const subscribeToProject = useCallback((projectId: string) => {
    console.log('[Realtime] subscribeToProject called for:', projectId)
    console.log('[Realtime] Current channelRef:', channelRef.current)
    console.log('[Realtime] Current projectIdRef:', projectIdRef.current)
    console.log('[Realtime] isSubscribing:', isSubscribingRef.current)
    console.log('[Realtime] All channels:', supabase.getChannels().map(ch => ({ topic: ch.topic, state: ch.state })))
    
    // Prevent concurrent subscriptions
    if (isSubscribingRef.current) {
      console.log('[Realtime] Already subscribing, skipping')
      return
    }
    
    // Clear any pending cleanup
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current)
      cleanupTimeoutRef.current = null
    }

    // If already subscribed to this project, check the channel state
    if (projectIdRef.current === projectId && channelRef.current) {
      const channelState = channelRef.current.state
      
      // Development logging
      if (process.env.NODE_ENV === 'development') {
        console.log('[Realtime] Current channel state:', channelState, 'for project:', projectId)
      }
      
      if (channelState === 'joined') {
        // Already connected, just ensure data is loaded
        if (!state.isLoading && state.interviews.length === 0) {
          loadInitialData(projectId)
        }
        return
      }
      
      if (channelState === 'joining') {
        // Already trying to connect, wait
        return
      }
      
      // If channel exists but is closed/errored, we need to clean it up properly
      if (channelState === 'closed' || channelState === 'errored' || channelState === 'leaving') {
        const oldChannel = channelRef.current
        channelRef.current = null
        
        // Channel is already in a bad state, just remove it
        supabase.removeChannel(oldChannel)
      }
    }

    // Set subscribing flag
    isSubscribingRef.current = true
    
    // First check if we have an existing channel for this project
    const allChannels = supabase.getChannels()
    const existingProjectChannel = allChannels.find(ch => 
      ch.topic === `realtime:project-realtime-${projectId}` || 
      ch.topic === `project-realtime-${projectId}`
    )
    
    if (existingProjectChannel) {
      console.log('[Realtime] Found existing channel for project:', existingProjectChannel.state)
      
      if (existingProjectChannel.state === 'joined') {
        // Channel is already joined, just reuse it
        console.log('[Realtime] Reusing existing joined channel')
        channelRef.current = existingProjectChannel
        projectIdRef.current = projectId
        setState(prev => ({ ...prev, isSubscribed: true, error: null }))
        
        // Ensure health checks are running
        setupHealthCheck(existingProjectChannel, projectId)
        setupTokenRefresh()
        setupPresenceCleanup(existingProjectChannel)
        
        // Load initial data if needed
        loadInitialData(projectId)
        isSubscribingRef.current = false
        return
      } else if (existingProjectChannel.state === 'joining') {
        console.log('[Realtime] Channel is already joining, setting ref and waiting')
        channelRef.current = existingProjectChannel
        projectIdRef.current = projectId
        isSubscribingRef.current = false
        return
      } else {
        // Channel exists but in bad state, remove it
        console.log('[Realtime] Removing existing channel in bad state:', existingProjectChannel.state)
        supabase.removeChannel(existingProjectChannel)
      }
    }
    
    // Check if we're already subscribed to this project via channelRef
    if (channelRef.current && projectIdRef.current === projectId) {
      console.log('[Realtime] Already have channelRef for this project, but channel not found in getChannels()')
      // This shouldn't happen, but if it does, clear the ref
      channelRef.current = null
    }

    // Unsubscribe from previous channel if exists
    if (channelRef.current && projectIdRef.current !== projectId) {
      // Switching projects - clean up existing channel
      const oldChannel = channelRef.current
      channelRef.current = null
      
      // Clear all intervals immediately
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current)
        healthCheckIntervalRef.current = null
      }
      
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current)
        tokenRefreshIntervalRef.current = null
      }
      
      if (presenceCleanupIntervalRef.current) {
        clearInterval(presenceCleanupIntervalRef.current)
        presenceCleanupIntervalRef.current = null
      }
      
      if (presenceUpdateIntervalRef.current) {
        clearInterval(presenceUpdateIntervalRef.current)
        presenceUpdateIntervalRef.current = null
      }
      currentPresenceRef.current = null
      
      // Only unsubscribe if channel is in a subscribed state
      if (oldChannel.state === 'joined' || oldChannel.state === 'joining') {
        oldChannel.unsubscribe().then(() => {
          supabase.removeChannel(oldChannel)
        })
      } else {
        // Channel is already closed or in error state, just remove it
        supabase.removeChannel(oldChannel)
      }
    }

    projectIdRef.current = projectId

    // Use fixed channel name per project for consistent presence
    const channelName = `project-realtime-${projectId}`
    
    // This check is now done above, so we can skip it here
    
    // Final check before creating new channel
    const finalCheck = supabase.getChannels().find(ch => 
      ch.topic === `realtime:${channelName}` || ch.topic === channelName
    )
    
    if (finalCheck) {
      console.log('[Realtime] Channel appeared during execution, reusing:', finalCheck.state)
      channelRef.current = finalCheck
      projectIdRef.current = projectId
      
      if (finalCheck.state === 'joined') {
        setState(prev => ({ ...prev, isSubscribed: true, error: null }))
        loadInitialData(projectId)
      }
      isSubscribingRef.current = false
      return
    }
    
    console.log('[Realtime] Creating new channel:', channelName)
    
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true }, // Enable self-send for broadcasts
          presence: { key: projectId } // Use projectId as presence key for consistency
        }
      })
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
    
    console.log('[Realtime] About to subscribe. Channel state before subscribe:', channel.state)
    console.log('[Realtime] Channel reference:', channel)
    
    channel.subscribe((status, error) => {
        // Development logging
        if (process.env.NODE_ENV === 'development') {
          console.log('[Realtime] Channel status:', status, 'Project:', projectId)
        }
        
        if (status === 'SUBSCRIBED') {
          setState(prev => ({ ...prev, isSubscribed: true, error: null }))
          reconnectAttemptsRef.current = 0 // Reset reconnect attempts
          isSubscribingRef.current = false
          // Load initial data
          loadInitialData(projectId)
          // Setup presence cleanup
          setupPresenceCleanup(channel)
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          isSubscribingRef.current = false
          setState(prev => ({ 
            ...prev, 
            isSubscribed: false, 
            error: new Error(error?.message || 'Failed to subscribe to channel') 
          }))
          
          // Attempt to reconnect with exponential backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
            reconnectAttemptsRef.current++
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`[Realtime] Reconnect attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`)
            }
            
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current)
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (projectIdRef.current === projectId) {
                // Clean up the failed channel before reconnecting
                if (channelRef.current) {
                  const oldChannel = channelRef.current
                  channelRef.current = null
                  
                  // Check channel state before trying to unsubscribe
                  if (oldChannel.state === 'joined' || oldChannel.state === 'joining') {
                    oldChannel.unsubscribe().then(() => {
                      supabase.removeChannel(oldChannel)
                      // Now attempt to reconnect with fresh state
                      subscribeToProject(projectId)
                    })
                  } else {
                    // Channel is already closed, just remove and reconnect
                    supabase.removeChannel(oldChannel)
                    subscribeToProject(projectId)
                  }
                } else {
                  // No channel ref, just reconnect
                  subscribeToProject(projectId)
                }
              }
            }, delay)
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log('[Realtime] Max reconnect attempts reached')
            }
          }
        } else if (status === 'TIMED_OUT') {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Realtime] Connection timed out, attempting to reconnect')
          }
          
          isSubscribingRef.current = false
          setState(prev => ({ 
            ...prev, 
            isSubscribed: false, 
            error: new Error('Connection timed out') 
          }))
          
          // Handle timeout - clean up and reconnect
          if (projectIdRef.current === projectId && channelRef.current) {
            const oldChannel = channelRef.current
            channelRef.current = null
            
            // Clear health check
            if (healthCheckIntervalRef.current) {
              clearInterval(healthCheckIntervalRef.current)
              healthCheckIntervalRef.current = null
            }
            
            // Clear token refresh
            if (tokenRefreshIntervalRef.current) {
              clearInterval(tokenRefreshIntervalRef.current)
              tokenRefreshIntervalRef.current = null
            }
            
            // Check channel state before trying to unsubscribe
            if (oldChannel.state === 'joined' || oldChannel.state === 'joining') {
              oldChannel.unsubscribe().then(() => {
                supabase.removeChannel(oldChannel)
                // Reset attempts for timeout reconnect
                reconnectAttemptsRef.current = 0
                subscribeToProject(projectId)
              })
            } else {
              // Channel is already closed, just remove and reconnect
              supabase.removeChannel(oldChannel)
              reconnectAttemptsRef.current = 0
              subscribeToProject(projectId)
            }
          }
        }
      })

    console.log('[Realtime] Setting channelRef.current to new channel')
    channelRef.current = channel
    
    // Set up health checks and token refresh
    setupHealthCheck(channel, projectId)
    setupTokenRefresh()
  }, [loadInitialData, handleInterviewChange, handleNoteChange, handleReplyChange, handlePresenceSync, handleBroadcastUpdate, setupHealthCheck, setupTokenRefresh, setupPresenceCleanup, state.interviews.length])

  // Unsubscribe
  const unsubscribe = useCallback(() => {
    console.log('[Realtime] Unsubscribe called')
    
    // Reset subscribing flag
    isSubscribingRef.current = false
    
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
    
    // Clear token refresh
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current)
      tokenRefreshIntervalRef.current = null
    }
    
    // Clear presence cleanup
    if (presenceCleanupIntervalRef.current) {
      clearInterval(presenceCleanupIntervalRef.current)
      presenceCleanupIntervalRef.current = null
    }
    
    // Clear presence update
    if (presenceUpdateIntervalRef.current) {
      clearInterval(presenceUpdateIntervalRef.current)
      presenceUpdateIntervalRef.current = null
    }
    currentPresenceRef.current = null
    
    if (channelRef.current) {
      const channel = channelRef.current
      channelRef.current = null
      projectIdRef.current = null
      reconnectAttemptsRef.current = 0
      
      // Remove channel safely
      try {
        if (channel.state === 'joined' || channel.state === 'joining') {
          channel.unsubscribe().then(() => {
            supabase.removeChannel(channel)
          }).catch(err => {
            console.error('[Realtime] Error during unsubscribe:', err)
            // Try to remove anyway
            supabase.removeChannel(channel)
          })
        } else {
          supabase.removeChannel(channel)
        }
      } catch (err) {
        console.error('[Realtime] Error removing channel:', err)
      }
      
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
  const trackPresence = useCallback(async (interviewId: string, data: any) => {
    if (!channelRef.current) return
    
    // Check if channel is subscribed before tracking
    if (channelRef.current.state !== 'joined') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Realtime] Cannot track presence - channel not joined')
      }
      return
    }

    try {
      const presenceData = {
        interview_id: interviewId,
        user_id: data.userId,
        user_name: data.userName,
        email: data.email,
        ...data,
        online_at: new Date().toISOString(),
      }
      
      await channelRef.current.track(presenceData)
      currentPresenceRef.current = presenceData
      
      // Set up periodic presence update
      if (presenceUpdateIntervalRef.current) {
        clearInterval(presenceUpdateIntervalRef.current)
      }
      
      presenceUpdateIntervalRef.current = setInterval(async () => {
        if (channelRef.current?.state === 'joined' && currentPresenceRef.current) {
          try {
            const updatedPresence = {
              ...currentPresenceRef.current,
              online_at: new Date().toISOString(),
            }
            await channelRef.current.track(updatedPresence)
            currentPresenceRef.current = updatedPresence
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error('[Realtime] Failed to update presence:', error)
            }
          }
        }
      }, 30 * 1000) // Update every 30 seconds
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Realtime] Failed to track presence:', error)
      }
    }
  }, [])

  // Untrack presence
  const untrackPresence = useCallback(async () => {
    if (!channelRef.current) return
    
    // Clear presence update interval
    if (presenceUpdateIntervalRef.current) {
      clearInterval(presenceUpdateIntervalRef.current)
      presenceUpdateIntervalRef.current = null
    }
    currentPresenceRef.current = null
    
    // Check if channel is subscribed before untracking
    if (channelRef.current.state !== 'joined') {
      return
    }
    
    try {
      await channelRef.current.untrack()
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Realtime] Failed to untrack presence:', error)
      }
    }
  }, [])

  // Broadcast event
  const broadcastEvent = useCallback(async (event: string, payload: any) => {
    if (!channelRef.current) return
    
    // Check if channel is subscribed before broadcasting
    if (channelRef.current.state !== 'joined') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Realtime] Cannot broadcast - channel not joined')
      }
      return
    }

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      })
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Realtime] Failed to broadcast event:', error)
      }
    }
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
      
      // Clear token refresh  
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current)
        tokenRefreshIntervalRef.current = null
      }
      
      // In StrictMode, React may unmount and remount quickly
      // Use shorter timeout for navigation away from project
      cleanupTimeoutRef.current = setTimeout(() => {
        if (channelRef.current && projectIdRef.current) {
          unsubscribe()
        }
      }, 5000) // 5초 대기 - 탭 전환 시 연결 유지
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