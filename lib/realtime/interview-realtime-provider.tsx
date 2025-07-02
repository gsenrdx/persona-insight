'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Interview } from '@/types/interview'
import { InterviewNote } from '@/types/interview-notes'
import { Database } from '@/types/supabase'
import { Profile, PersonaDefinition, InterviewNoteReply, PresenceData, ViewerInfo } from '@/types/realtime'

type InterviewRow = Database['public']['Tables']['interviews']['Row']
type InterviewNoteRow = Database['public']['Tables']['interview_notes']['Row']
type InterviewNoteReplyRow = Database['public']['Tables']['interview_note_replies']['Row']

// Connection quality tracking
export interface ConnectionQuality {
  lastSuccessfulPing: number
  failedPings: number
  averageLatency: number
  isStable: boolean
}

interface InterviewRealtimeState {
  interviews: Interview[]
  notes: Record<string, InterviewNote[]>
  presence: Record<string, ViewerInfo[]>
  isSubscribed: boolean
  isLoading: boolean
  error: Error | null
  connectionQuality?: ConnectionQuality
}

interface InterviewRealtimeContextValue extends InterviewRealtimeState {
  subscribeToProject: (projectId: string) => void
  unsubscribe: () => void
  trackPresence: (interviewId: string, data: Partial<PresenceData>) => void
  untrackPresence: () => void
  broadcastEvent: (event: string, payload: any) => void
  getConnectionQuality: () => ConnectionQuality
}

const InterviewRealtimeContext = createContext<InterviewRealtimeContextValue | null>(null)

// Transform functions outside component to avoid recreating
const transformInterviewRow = (row: InterviewRow & { 
  created_by_profile?: Profile,
  interview_notes?: { count: number }[],
  ai_persona_definition?: PersonaDefinition,
  confirmed_persona_definition?: PersonaDefinition
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
    script_sections: row.script_sections as any,
    ai_persona_match: row.ai_persona_match,
    ai_persona_explanation: row.ai_persona_explanation,
    ai_persona_definition: row.ai_persona_definition,
    confirmed_persona_definition_id: row.confirmed_persona_definition_id,
    confirmed_persona_definition: row.confirmed_persona_definition,
    created_by_profile: row.created_by_profile,
    note_count: Array.isArray(row.interview_notes) && row.interview_notes[0]?.count || 0,
  }
}

const transformNoteRow = (row: InterviewNoteRow & { 
  created_by_profile?: Profile,
  replies?: InterviewNoteReply[]
}): InterviewNote => {
  return {
    id: row.id,
    interview_id: row.interview_id,
    script_item_ids: row.script_item_ids || [],
    content: row.content,
    created_by: row.created_by,
    company_id: row.company_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_deleted: row.is_deleted || false,
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
    isLoading: true, // 초기 로딩 상태를 true로 설정 - 첫 구독이 완료되면 false로 변경
    error: null,
  })
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const projectIdRef = useRef<string | null>(null)
  const mountedRef = useRef(false)
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastLoadedProjectIdRef = useRef<string | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 3 // 표준적인 재시도 횟수
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const presenceCleanupIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const presenceUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentPresenceRef = useRef<PresenceData | null>(null)
  const isSubscribingRef = useRef(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(false)
  const lastActivityRef = useRef<number>(Date.now())
  const visibilityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastVisibilityStateRef = useRef<boolean>(true) // SSR safe - default to visible
  const connectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const missedUpdatesCheckTimeRef = useRef<number>(Date.now())
  const connectionQualityRef = useRef<ConnectionQuality>({
    lastSuccessfulPing: Date.now(),
    failedPings: 0,
    averageLatency: 0,
    isStable: true
  })

  // Load initial data
  const loadInitialData = useCallback(async (projectId: string) => {
    // 이미 이 프로젝트의 초기 데이터를 로드했고 폴링 중이 아니라면 스킵
    if (lastLoadedProjectIdRef.current === projectId && !isPollingRef.current) {
      // 이미 로드했지만 로딩 상태는 false로 설정
      setState(prev => ({ ...prev, isLoading: false }))
      return
    }
    
    lastLoadedProjectIdRef.current = projectId
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      // Fetch interviews with creator profile, note count, and persona definition
      const { data: interviews, error: interviewsError } = await supabase
        .from('interviews')
        .select(`
          *,
          created_by_profile:profiles!interviews_created_by_fkey(
            id,
            name
          ),
          interview_notes(count),
          ai_persona_definition:persona_definitions!ai_persona_match(
            id,
            name_ko,
            name_en,
            description,
            tags
          ),
          confirmed_persona_definition:persona_definitions!interviews_confirmed_persona_definition_id_fkey(
            id,
            name_ko,
            name_en,
            description,
            tags
          )
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

        setState(prev => {
          const newInterviews = interviews?.map(transformInterviewRow) || []
          
          // 데이터가 실제로 변경되었는지 확인
          const hasInterviewChanges = 
            prev.interviews.length !== newInterviews.length ||
            prev.interviews.some((prevInterview, index) => {
              const newInterview = newInterviews[index]
              return !newInterview || 
                     prevInterview.id !== newInterview.id ||
                     prevInterview.updated_at !== newInterview.updated_at ||
                     prevInterview.status !== newInterview.status
            })
          
          // 노트 변경사항 확인
          const hasNoteChanges = Object.keys(notesByInterview).length !== Object.keys(prev.notes).length ||
            Object.keys(notesByInterview).some(key => {
              const prevNotes = prev.notes[key] || []
              const newNotes = notesByInterview[key] || []
              return prevNotes.length !== newNotes.length
            })
          
          // 변경사항이 없으면 기존 상태 유지
          if (!hasInterviewChanges && !hasNoteChanges) {
            return { ...prev, isLoading: false }
          }
          
          return {
            ...prev,
            interviews: newInterviews,
            notes: notesByInterview,
            isLoading: false,
          }
        })
      } else {
        setState(prev => {
          const newInterviews = interviews?.map(transformInterviewRow) || []
          
          // 데이터가 실제로 변경되었는지 확인
          const hasChanges = 
            prev.interviews.length !== newInterviews.length ||
            prev.interviews.some((prevInterview, index) => {
              const newInterview = newInterviews[index]
              return !newInterview || 
                     prevInterview.id !== newInterview.id ||
                     prevInterview.updated_at !== newInterview.updated_at ||
                     prevInterview.status !== newInterview.status
            })
          
          // 변경사항이 없으면 기존 상태 유지
          if (!hasChanges) {
            return { ...prev, isLoading: false }
          }
          
          return {
            ...prev,
            interviews: newInterviews,
            notes: {},
            isLoading: false,
          }
        })
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error as Error,
        isLoading: false,
      }))
    }
  }, [])

  // Start polling fallback when realtime fails
  const startPolling = useCallback((projectId: string) => {
    // Prevent duplicate polling
    if (isPollingRef.current || !projectId) return
    
    // Starting fallback polling for project
    
    isPollingRef.current = true
    
    // Initial poll immediately
    loadInitialData(projectId)
    
    // Adaptive polling interval based on activity
    const getPollingInterval = () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current
      if (timeSinceLastActivity < 60000) return 5000 // Active: 5s
      if (timeSinceLastActivity < 300000) return 10000 // Semi-active: 10s
      return 30000 // Inactive: 30s
    }
    
    const scheduleNextPoll = () => {
      pollingIntervalRef.current = setTimeout(() => {
        if (projectIdRef.current === projectId && isPollingRef.current) {
          loadInitialData(projectId)
          scheduleNextPoll() // Schedule next poll with adaptive interval
        }
      }, getPollingInterval())
    }
    
    scheduleNextPoll()
  }, [loadInitialData])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current) // Changed from clearInterval to clearTimeout
      pollingIntervalRef.current = null
    }
    isPollingRef.current = false
    
    // Stopped fallback polling
  }, [])

  // Handle interview changes
  const handleInterviewChange = useCallback(async (
    payload: RealtimePostgresChangesPayload<InterviewRow>
  ) => {
    const { eventType, new: newRow, old: oldRow } = payload
    
    // Update last activity time
    lastActivityRef.current = Date.now()

    switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
        if (newRow) {
          // Fetch complete interview data with profile and persona definition
          const { data: fullInterview, error } = await supabase
            .from('interviews')
            .select(`
              *,
              created_by_profile:profiles!interviews_created_by_fkey(
                id,
                name
              ),
              interview_notes(count),
              ai_persona_definition:persona_definitions!ai_persona_match(
                id,
                name_ko,
                name_en,
                description,
                tags
              ),
              confirmed_persona_definition:persona_definitions!interviews_confirmed_persona_definition_id_fkey(
                id,
                name_ko,
                name_en,
                description,
                tags
              )
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
          setState(prev => {
            // 삭제할 인터뷰가 실제로 존재하는지 확인
            const interviewExists = prev.interviews.some(i => i.id === oldRow.id)
            
            if (interviewExists) {
              return {
                ...prev,
                interviews: prev.interviews.filter(i => i.id !== oldRow.id),
                notes: (() => {
                  const { [oldRow.id]: _, ...remainingNotes } = prev.notes
                  return remainingNotes
                })()
              }
            }
            
            return prev
          })
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

  // Create note ID to interview ID map for O(1) lookup
  const noteToInterviewMap = useMemo(() => {
    const map = new Map<string, string>()
    const MAX_MAP_SIZE = 10000 // Prevent unbounded growth
    let count = 0
    
    for (const [interviewId, notes] of Object.entries(state.notes)) {
      for (const note of notes) {
        if (count >= MAX_MAP_SIZE) {
          console.warn('Note map size limit reached')
          break
        }
        map.set(note.id, interviewId)
        count++
      }
      if (count >= MAX_MAP_SIZE) break
    }
    return map
  }, [state.notes])

  // Handle reply changes with optimized lookup
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
              // Use map for O(1) lookup
              const interviewId = noteToInterviewMap.get(fullReply.note_id)
              if (!interviewId) return prev
              
              const notes = { ...prev.notes }
              const noteList = notes[interviewId]
              if (!noteList) return prev
              
              const noteIndex = noteList.findIndex(n => n.id === fullReply.note_id)
              if (noteIndex < 0) return prev
              
              const updatedNotes = [...noteList]
              const note = { ...updatedNotes[noteIndex] }
              
              if (eventType === 'INSERT') {
                note.replies = [...(note.replies || []), fullReply]
              } else {
                const replies = [...(note.replies || [])]
                const replyIndex = replies.findIndex(r => r.id === fullReply.id)
                if (replyIndex >= 0) {
                  replies[replyIndex] = fullReply
                  note.replies = replies
                }
              }
              
              updatedNotes[noteIndex] = note
              notes[interviewId] = updatedNotes

              return { ...prev, notes }
            })
          }
        }
        break
        
      case 'DELETE':
        if (oldRow) {
          setState(prev => {
            // Use map for O(1) lookup
            const interviewId = noteToInterviewMap.get(oldRow.note_id)
            if (!interviewId) return prev
            
            const notes = { ...prev.notes }
            const noteList = notes[interviewId]
            if (!noteList) return prev
            
            const noteIndex = noteList.findIndex(n => n.id === oldRow.note_id)
            if (noteIndex < 0) return prev
            
            const updatedNotes = [...noteList]
            const note = { ...updatedNotes[noteIndex] }
            note.replies = (note.replies || []).filter(r => r.id !== oldRow.id)
            
            updatedNotes[noteIndex] = note
            notes[interviewId] = updatedNotes

            return { ...prev, notes }
          })
        }
        break
    }
  }, [noteToInterviewMap])

  // Handle presence sync
  const handlePresenceSync = useCallback((presenceState: Record<string, PresenceData[]>) => {
    const presence: Record<string, ViewerInfo[]> = {}
    const now = Date.now()
    const PRESENCE_TIMEOUT = 90000 // 90 seconds timeout (3x update interval)
    
    Object.entries(presenceState).forEach(([key, presences]) => {
      presences.forEach((p: PresenceData) => {
        const { interview_id, user_id, user_name, email, online_at, heartbeat, ...data } = p
        // Skip heartbeat-only presence updates
        if (heartbeat && !interview_id) {
          return
        }
        
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
  const handleBroadcastUpdate = useCallback((_payload: any) => {
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
        handlePresenceSync(presenceState as Record<string, PresenceData[]>)
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
            // JWT token refreshed
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          // Failed to refresh JWT token
        }
      }
    }, 5 * 60 * 1000) // Refresh every 5 minutes for better stability
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
          // Health check - Channel state
        }
        
        // Send heartbeat to keep connection alive
        if (state === 'joined') {
          // Only update existing presence data if we have it
          if (currentPresenceRef.current) {
            // Update existing presence without overwriting
            channelRef.current.track({
              ...currentPresenceRef.current,
              online_at: new Date().toISOString(),
            }).catch((error) => {
              // If heartbeat fails, connection might be degraded
              connectionQualityRef.current.failedPings++
              
              if (connectionQualityRef.current.failedPings > 3) {
                connectionQualityRef.current.isStable = false
              }
              
              if (channelRef.current && projectIdRef.current === projectId) {
                // Force reconnect on heartbeat failure
                const oldChannel = channelRef.current
                channelRef.current = null
                supabase.removeChannel(oldChannel)
                setTimeout(() => {
                  subscribeToProject(projectId)
                }, 100)
              }
            })
          }
          
          // Check for stale connection (no activity for 1 minute)
          const timeSinceLastActivity = Date.now() - lastActivityRef.current
          if (timeSinceLastActivity > 60 * 1000) {
            // Force refresh if no activity for 1 minute
            lastActivityRef.current = Date.now()
            
            // Force reload data to catch any missed updates
            loadInitialData(projectId)
            
            // Send ping to check connection
            const pingStart = Date.now()
            channelRef.current.send({
              type: 'broadcast',
              event: 'ping',
              payload: { timestamp: new Date().toISOString() }
            }).then(() => {
              // Ping successful, update connection quality
              const latency = Date.now() - pingStart
              connectionQualityRef.current.lastSuccessfulPing = Date.now()
              connectionQualityRef.current.failedPings = 0
              connectionQualityRef.current.averageLatency = 
                (connectionQualityRef.current.averageLatency * 0.8) + (latency * 0.2)
              connectionQualityRef.current.isStable = true
              
              // Update state with connection quality
              setState(prev => ({ ...prev, connectionQuality: { ...connectionQualityRef.current } }))
            }).catch(() => {
              // If ping fails, connection is likely dead
              connectionQualityRef.current.failedPings++
              connectionQualityRef.current.isStable = false
              
              // Force reconnect
              const oldChannel = channelRef.current
              channelRef.current = null
              supabase.removeChannel(oldChannel)
              setTimeout(() => {
                subscribeToProject(projectId)
              }, 100)
            })
          }
        }
        
        // Only reconnect if truly disconnected, not if temporarily interrupted
        else if (state === 'closed' || state === 'errored') {
          // Health check detected disconnection, attempting to reconnect
          
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
    }, 15000) // Check every 15 seconds for better responsiveness
  }, [loadInitialData])

  // Subscribe to project
  const subscribeToProject = useCallback((projectId: string) => {
    // Development logging disabled for production
    
    // Prevent concurrent subscriptions
    if (isSubscribingRef.current) {
      // Already subscribing, skipping
      return
    }
    
    // Clear any pending cleanup
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current)
      cleanupTimeoutRef.current = null
    }
    
    // If switching to a different project, cleanup old connection first
    if (projectIdRef.current && projectIdRef.current !== projectId && channelRef.current) {
      // Switching to different project - cleanup old channel
      const oldChannel = channelRef.current
      channelRef.current = null
      
      try {
        if (oldChannel.state === 'joined' || oldChannel.state === 'joining') {
          oldChannel.unsubscribe()
        }
        supabase.removeChannel(oldChannel)
      } catch (err) {
        // Ignore cleanup errors
      }
      
      // Reset state
      projectIdRef.current = null
      setState({
        interviews: [],
        notes: {},
        presence: {},
        isSubscribed: false,
        isLoading: true,
        error: null,
      })
    }

    // If already subscribed to this project, check the channel state
    if (projectIdRef.current === projectId && channelRef.current) {
      const channelState = channelRef.current.state
      
      // Development logging
      if (process.env.NODE_ENV === 'development') {
        // Current channel state for project
      }
      
      if (channelState === 'joined') {
        // Already connected, just ensure state is in sync
        setState(prev => ({ 
          ...prev, 
          isSubscribed: true, 
          isLoading: false,
          error: null 
        }))
        isSubscribingRef.current = false
        return
      }
      
      if (channelState === 'joining') {
        // Already trying to connect, wait
        isSubscribingRef.current = false
        return
      }
      
      // If channel exists but is closed/errored, we need to clean it up properly
      if (channelState === 'closed' || channelState === 'errored' || channelState === 'leaving') {
        const oldChannel = channelRef.current
        channelRef.current = null
        
        // Channel is already in a bad state, just remove it
        try {
          supabase.removeChannel(oldChannel)
        } catch (err) {
          // Ignore errors during cleanup
        }
      }
    }

    // Set subscribing flag and loading state
    isSubscribingRef.current = true
    setState(prev => ({ ...prev, isLoading: true }))
    
    // First check if we have an existing channel for this project
    const allChannels = supabase.getChannels()
    const existingProjectChannel = allChannels.find(ch => 
      ch.topic === `realtime:project-realtime-${projectId}` || 
      ch.topic === `project-realtime-${projectId}`
    )
    
    if (existingProjectChannel) {
      // Found existing channel for project
      
      if (existingProjectChannel.state === 'joined') {
        // Channel is already joined, just reuse it
        // Reusing existing joined channel
        channelRef.current = existingProjectChannel
        projectIdRef.current = projectId
        setState(prev => ({ 
          ...prev, 
          isSubscribed: true, 
          isLoading: false,
          error: null 
        }))
        
        // Ensure health checks are running
        setupHealthCheck(existingProjectChannel, projectId)
        setupTokenRefresh()
        setupPresenceCleanup(existingProjectChannel)
        
        // Load initial data to sync state
        loadInitialData(projectId)
        isSubscribingRef.current = false
        return
      } else if (existingProjectChannel.state === 'joining') {
        // Channel is already joining, setting ref and waiting
        channelRef.current = existingProjectChannel
        projectIdRef.current = projectId
        isSubscribingRef.current = false
        return
      } else {
        // Channel exists but in bad state, remove it
        // Removing existing channel in bad state
        supabase.removeChannel(existingProjectChannel)
      }
    }
    
    // Check if we're already subscribed to this project via channelRef
    if (channelRef.current && projectIdRef.current === projectId) {
      // Already have channelRef for this project, but channel not found in getChannels()
      // This shouldn't happen, but if it does, clear the ref
      channelRef.current = null
    }

    // Unsubscribe from previous channel if exists
    if (channelRef.current && projectIdRef.current !== projectId) {
      // Switching projects - clean up existing channel
      const oldChannel = channelRef.current
      channelRef.current = null
      
      // Reset initial data flag when switching projects
      lastLoadedProjectIdRef.current = null
      
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
      
      // Clear state data to prevent memory leaks when switching projects
      setState({
        interviews: [],
        notes: {},
        presence: {},
        isSubscribed: false,
        isLoading: true,
        error: null,
      })
      
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
      // Channel appeared during execution, reusing
      channelRef.current = finalCheck
      projectIdRef.current = projectId
      
      if (finalCheck.state === 'joined') {
        setState(prev => ({ ...prev, isSubscribed: true, error: null }))
        loadInitialData(projectId)
      }
      isSubscribingRef.current = false
      return
    }
    
    // Creating new channel
    
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
        handlePresenceSync(presenceState as Record<string, PresenceData[]>)
      })
      .on('presence', { event: 'join' }, () => {
        // Silent join tracking
      })
      .on('presence', { event: 'leave' }, () => {
        // Silent leave tracking
      })
      .on('broadcast', { event: 'interview-update' }, ({ payload }) => {
        handleBroadcastUpdate(payload)
      })
    
    // About to subscribe
    
    channel.subscribe((status, error) => {
        
        if (status === 'SUBSCRIBED') {
          setState(prev => ({ ...prev, isSubscribed: true, error: null }))
          reconnectAttemptsRef.current = 0 // Reset reconnect attempts
          isSubscribingRef.current = false
          connectionQualityRef.current.isStable = true
          connectionQualityRef.current.failedPings = 0
          
          // Stop polling if it was running (realtime recovered)
          stopPolling()
          
          // Load initial data
          loadInitialData(projectId)
          // Setup presence cleanup
          setupPresenceCleanup(channel)
          // Setup health check
          setupHealthCheck(channel, projectId)
          // Setup token refresh
          setupTokenRefresh()
          
          // Set up connection stability check
          if (connectionCheckIntervalRef.current) {
            clearInterval(connectionCheckIntervalRef.current)
          }
          
          connectionCheckIntervalRef.current = setInterval(() => {
            if (channelRef.current && channelRef.current.state === 'joined') {
              // Test the connection with a broadcast
              const testStart = Date.now()
              channelRef.current.send({
                type: 'broadcast',
                event: 'connection-check',
                payload: { timestamp: new Date().toISOString() }
              }).then(() => {
                // Update connection quality metrics
                const latency = Date.now() - testStart
                connectionQualityRef.current.averageLatency = 
                  (connectionQualityRef.current.averageLatency * 0.9) + (latency * 0.1)
                
                // Update state with connection quality
                setState(prev => ({ ...prev, connectionQuality: { ...connectionQualityRef.current } }))
              }).catch(() => {
                // Connection test failed, likely disconnected
                connectionQualityRef.current.failedPings++
                connectionQualityRef.current.isStable = false
                
                // Force reconnect
                if (projectIdRef.current === projectId) {
                  const oldChannel = channelRef.current
                  channelRef.current = null
                  supabase.removeChannel(oldChannel)
                  subscribeToProject(projectId)
                }
              })
            }
          }, 45000) // Check every 45 seconds
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
              // Reconnect attempt
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
              // Max reconnect attempts reached
            }
            
            // Start polling fallback after max reconnect attempts
            if (projectIdRef.current === projectId) {
              startPolling(projectId)
            }
          }
        } else if (status === 'TIMED_OUT') {
          if (process.env.NODE_ENV === 'development') {
            // Connection timed out, attempting to reconnect
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
            
            // Clear intervals using helper
            // Clear intervals
            if (healthCheckIntervalRef.current) {
              clearInterval(healthCheckIntervalRef.current)
              healthCheckIntervalRef.current = null
            }
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

    // Setting channelRef.current to new channel
    channelRef.current = channel
    
    // Set up health checks and token refresh
    setupHealthCheck(channel, projectId)
    setupTokenRefresh()
  }, [loadInitialData, handleInterviewChange, handleNoteChange, handleReplyChange, handlePresenceSync, handleBroadcastUpdate, setupHealthCheck, setupTokenRefresh, setupPresenceCleanup, startPolling, stopPolling])

  // Unsubscribe
  const unsubscribe = useCallback(() => {
    // Unsubscribe called
    
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
    
    // Clear connection check
    if (connectionCheckIntervalRef.current) {
      clearInterval(connectionCheckIntervalRef.current)
      connectionCheckIntervalRef.current = null
    }
    
    // Clear visibility check
    if (visibilityCheckIntervalRef.current) {
      clearInterval(visibilityCheckIntervalRef.current)
      visibilityCheckIntervalRef.current = null
    }
    
    // Stop polling if running
    stopPolling()
    
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
            // Error during unsubscribe
            // Try to remove anyway
            supabase.removeChannel(channel)
          })
        } else {
          supabase.removeChannel(channel)
        }
      } catch (err) {
        // Error removing channel
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
  const trackPresence = useCallback(async (interviewId: string, data: Partial<PresenceData>) => {
    if (!channelRef.current) return
    
    // Check if channel is subscribed before tracking
    if (channelRef.current.state !== 'joined') {
      if (process.env.NODE_ENV === 'development') {
        // Cannot track presence - channel not joined
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
              // Failed to update presence
            }
          }
        }
      }, 30 * 1000) // Update every 30 seconds
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // Failed to track presence
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
        // Failed to untrack presence
      }
    }
  }, [])

  // Broadcast event
  const broadcastEvent = useCallback(async (event: string, payload: any) => {
    if (!channelRef.current) return
    
    // Check if channel is subscribed before broadcasting
    if (channelRef.current.state !== 'joined') {
      if (process.env.NODE_ENV === 'development') {
        // Cannot broadcast - channel not joined
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
        // Failed to broadcast event
      }
    }
  }, [])

  // Monitor mount status
  useEffect(() => {
    mountedRef.current = true
    
    return () => {
      mountedRef.current = false
    }
  }, [])
  
  // Get connection quality
  const getConnectionQuality = useCallback(() => {
    return connectionQualityRef.current
  }, [])
  
  // Monitor network status and visibility changes
  useEffect(() => {
    const handleOnline = () => {
      if (projectIdRef.current && channelRef.current?.state !== 'joined') {
        // Network came back online, reconnect
        subscribeToProject(projectIdRef.current)
      }
    }
    
    const handleVisibilityChange = () => {
      const wasHidden = lastVisibilityStateRef.current
      const isHidden = document.hidden
      lastVisibilityStateRef.current = isHidden
      
      if (!isHidden && wasHidden && projectIdRef.current) {
        // Page became visible after being hidden
        missedUpdatesCheckTimeRef.current = Date.now()
        
        // Always reload data when coming back from background
        loadInitialData(projectIdRef.current)
        
        // Check connection state
        if (channelRef.current?.state !== 'joined') {
          // Force reconnect
          subscribeToProject(projectIdRef.current)
        } else {
          // Connection appears joined but might be stale
          // Send a test broadcast to verify connection
          channelRef.current.send({
            type: 'broadcast',
            event: 'visibility-check',
            payload: { timestamp: new Date().toISOString() }
          }).catch(() => {
            // Connection is actually dead, force reconnect
            if (projectIdRef.current) {
              const oldChannel = channelRef.current
              channelRef.current = null
              if (oldChannel) {
                supabase.removeChannel(oldChannel)
              }
              subscribeToProject(projectIdRef.current)
            }
          })
        }
      } else if (isHidden) {
        // Page is going to background
        // Start more aggressive polling as a fallback
        if (projectIdRef.current && !isPollingRef.current) {
          startPolling(projectIdRef.current)
        }
      }
    }
    
    const handleFocus = () => {
      if (projectIdRef.current) {
        // Window gained focus, reload data to catch any missed updates
        loadInitialData(projectIdRef.current)
      }
    }
    
    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Set up visibility monitoring interval
    visibilityCheckIntervalRef.current = setInterval(() => {
      if (document.hidden && projectIdRef.current && !isPollingRef.current) {
        // Tab is hidden and polling isn't running, start it
        startPolling(projectIdRef.current)
      }
    }, 30000) // Check every 30 seconds
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      if (visibilityCheckIntervalRef.current) {
        clearInterval(visibilityCheckIntervalRef.current)
      }
    }
  }, [subscribeToProject, loadInitialData, startPolling])

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
      
      // Clear connection check
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current)
        connectionCheckIntervalRef.current = null
      }
      
      // Clear visibility check
      if (visibilityCheckIntervalRef.current) {
        clearInterval(visibilityCheckIntervalRef.current)
        visibilityCheckIntervalRef.current = null
      }
      
      // Don't immediately unsubscribe on unmount
      // Channel will be reused if user navigates back quickly
      // Only cleanup if explicitly navigating to a different project
      // or if the entire app is being closed
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
        getConnectionQuality,
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