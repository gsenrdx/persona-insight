'use client'

/**
 * Broadcast-based realtime provider
 * Replaces the old Postgres Changes approach with direct WebSocket broadcasts
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { channelManager } from '../channels/channel-manager'
import { connectionManager } from '../utils/connection-manager'
import { InterviewNoteHandler } from '../handlers/interview-note-handler'
import { MessageFactory } from '../utils/message-factory'
import type { ManagedChannel } from '../channels/channel-manager'
import { 
  InterviewBroadcastType,
  getProjectChannelName,
  type InterviewPayload,
  type InterviewPresence
} from '../types'

export interface BroadcastRealtimeState {
  interviews: InterviewPayload[]
  notes: Record<string, any[]> // interviewId -> notes
  presence: Record<string, InterviewPresence[]> // interviewId -> users
  isConnected: boolean
  isLoading: boolean
  error: Error | null
}

export interface BroadcastRealtimeContextValue extends BroadcastRealtimeState {
  subscribeToProject: (projectId: string) => Promise<void>
  unsubscribe: () => Promise<void>
  trackPresence: (interviewId: string) => Promise<void>
  untrackPresence: () => Promise<void>
  refresh: () => Promise<void>
}

const BroadcastRealtimeContext = createContext<BroadcastRealtimeContextValue | null>(null)

export interface BroadcastRealtimeProviderProps {
  children: React.ReactNode
}

export function BroadcastRealtimeProvider({ children }: BroadcastRealtimeProviderProps) {
  const { user, profile } = useAuth()
  
  const [state, setState] = useState<BroadcastRealtimeState>({
    interviews: [],
    notes: {},
    presence: {},
    isConnected: false,
    isLoading: false,
    error: null
  })
  
  const projectChannelRef = useRef<ManagedChannel | null>(null)
  const currentProjectRef = useRef<string | null>(null)
  const noteHandlerRef = useRef<InterviewNoteHandler | null>(null)
  const presenceTrackerRef = useRef<{ interviewId: string, interval: NodeJS.Timeout } | null>(null)
  
  // Subscribe to project
  const subscribeToProject = useCallback(async (projectId: string) => {
    if (!profile?.company_id || !user) return
    
    // If already subscribed to the same project, just return
    if (currentProjectRef.current === projectId && projectChannelRef.current) {
      const channelState = projectChannelRef.current.getState()
      if (channelState.isSubscribed || channelState.isConnected) {
        return
      }
    }
    
    // Unsubscribe from previous project
    if (currentProjectRef.current && currentProjectRef.current !== projectId) {
      await unsubscribe()
    }
    
    const channelName = getProjectChannelName(projectId)
    
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    await connectionManager.subscribe(channelName, async () => {
      currentProjectRef.current = projectId
      
      try {
        // Create note handler
        const noteHandler = new InterviewNoteHandler()
        noteHandlerRef.current = noteHandler
      
        // Subscribe to note state changes
        noteHandler.subscribe((noteState) => {
          const notes: Record<string, any[]> = {}
          noteState.notes.forEach((noteList, interviewId) => {
            notes[interviewId] = noteList
          })
          setState(prev => ({ ...prev, notes }))
        })
        
        // Get project channel
        const channelName = getProjectChannelName(projectId)
        const channel = channelManager.getChannel({
          name: channelName,
          presence: true,
          ack: false,
          selfBroadcast: false
        })
        projectChannelRef.current = channel
      
        // Set up message handlers
        
        // Interview messages
        channel.on(InterviewBroadcastType.INTERVIEW, async (message) => {
          const { action, payload } = message
          
          switch (action) {
            case 'create':
              setState(prev => ({
                ...prev,
                interviews: [...prev.interviews, payload as InterviewPayload]
              }))
              break
            case 'update':
              setState(prev => ({
                ...prev,
                interviews: prev.interviews.map(i => 
                  i.id === payload.id ? { ...i, ...payload } : i
                )
              }))
              break
            case 'delete':
              setState(prev => ({
                ...prev,
                interviews: prev.interviews.filter(i => i.id !== payload.id)
              }))
              break
          }
        })
      
        // Note messages (delegate to handler)
        channel.on(InterviewBroadcastType.INTERVIEW_NOTE, (message) => {
          noteHandler.handleMessage(message)
        })
      
        // Presence messages
        channel.on(InterviewBroadcastType.INTERVIEW_PRESENCE, (message) => {
        const presence = message.payload as InterviewPresence
        setState(prev => {
          const newPresence = { ...prev.presence }
          const interviewId = presence.interviewId
          
          if (!newPresence[interviewId]) {
            newPresence[interviewId] = []
          }
          
          // Update or add user presence
          const index = newPresence[interviewId].findIndex(p => p.userId === presence.userId)
          if (index >= 0) {
            newPresence[interviewId][index] = presence
          } else {
            newPresence[interviewId].push(presence)
          }
          
          // Remove stale presence (older than 90 seconds)
          const now = Date.now()
          Object.keys(newPresence).forEach(id => {
            newPresence[id] = newPresence[id].filter(p => {
              const lastActive = new Date(p.lastActiveAt).getTime()
              return now - lastActive < 90000
            })
          })
          
          return { ...prev, presence: newPresence }
        })
        })
        
        // Subscribe to channel with retry
        try {
          await channel.subscribe()
          setState(prev => ({ ...prev, isConnected: true }))
          
          // Load initial data
          await loadInitialData(projectId)
        } catch (subscribeError) {
          // If subscription fails due to database connection, log but don't throw
          console.warn('Initial subscription failed:', subscribeError)
          
          // Still try to load initial data even if realtime fails
          try {
            await loadInitialData(projectId)
          } catch (dataError) {
            console.error('Failed to load initial data:', dataError)
          }
          
          setState(prev => ({ 
            ...prev, 
            isConnected: false,
            error: subscribeError as Error
          }))
        }
        
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error as Error,
          isLoading: false,
          isConnected: false
        }))
        console.error('Failed to subscribe to project:', error)
      } finally {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    })
  }, [profile?.company_id, user])
  
  // Unsubscribe
  const unsubscribe = useCallback(async () => {
    if (currentProjectRef.current && projectChannelRef.current) {
      await channelManager.removeChannel(getProjectChannelName(currentProjectRef.current))
      projectChannelRef.current = null
    }
    
    if (noteHandlerRef.current) {
      noteHandlerRef.current.clearOptimisticUpdates()
      noteHandlerRef.current = null
    }
    
    if (presenceTrackerRef.current) {
      clearInterval(presenceTrackerRef.current.interval)
      presenceTrackerRef.current = null
    }
    
    currentProjectRef.current = null
    
    setState({
      interviews: [],
      notes: {},
      presence: {},
      isConnected: false,
      isLoading: false,
      error: null
    })
  }, [])
  
  // Track presence
  const trackPresence = useCallback(async (interviewId: string) => {
    if (!projectChannelRef.current || !user || !profile) return
    
    // Clear previous tracker
    if (presenceTrackerRef.current) {
      clearInterval(presenceTrackerRef.current.interval)
    }
    
    const sendPresence = async () => {
      const presence: InterviewPresence = {
        userId: user.id,
        userName: profile.name || undefined,
        email: user.email || undefined,
        avatarUrl: profile.avatar_url || undefined,
        interviewId,
        lastActiveAt: new Date().toISOString()
      }
      
      const message = MessageFactory.presenceAction(
        InterviewBroadcastType.INTERVIEW_PRESENCE,
        presence,
        user.id
      )
      
      try {
        await projectChannelRef.current!.send(message)
      } catch (error) {
        console.error('Failed to send presence:', error)
      }
    }
    
    // Send immediately
    await sendPresence()
    
    // Then every 30 seconds
    const interval = setInterval(sendPresence, 30000)
    presenceTrackerRef.current = { interviewId, interval }
  }, [user, profile])
  
  // Untrack presence
  const untrackPresence = useCallback(async () => {
    if (presenceTrackerRef.current) {
      clearInterval(presenceTrackerRef.current.interval)
      presenceTrackerRef.current = null
    }
  }, [])
  
  // Refresh data
  const refresh = useCallback(async () => {
    if (currentProjectRef.current) {
      await loadInitialData(currentProjectRef.current)
    }
  }, [])
  
  // Load initial data from database
  const loadInitialData = async (projectId: string) => {
    try {
      // Load interviews
      const { data: interviews } = await supabase
        .from('interviews')
        .select(`
          *,
          created_by_profile:profiles!interviews_created_by_fkey(id, name),
          interview_notes(count)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      
      if (interviews) {
        setState(prev => ({ ...prev, interviews }))
      }
      
      // Load notes for all interviews
      if (interviews && interviews.length > 0 && noteHandlerRef.current) {
        const interviewIds = interviews.map(i => i.id)
        
        const { data: notes } = await supabase
          .from('interview_notes')
          .select(`
            *,
            created_by_profile:profiles!created_by(id, name, avatar_url),
            replies:interview_note_replies(
              *,
              created_by_profile:profiles!created_by(id, name, avatar_url)
            )
          `)
          .in('interview_id', interviewIds)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
        
        if (notes) {
          // Group by interview
          const notesByInterview: Record<string, any[]> = {}
          notes.forEach(note => {
            if (!notesByInterview[note.interview_id]) {
              notesByInterview[note.interview_id] = []
            }
            notesByInterview[note.interview_id].push(note)
          })
          
          // Load into handler
          Object.entries(notesByInterview).forEach(([interviewId, notes]) => {
            noteHandlerRef.current!.loadInitialData(interviewId, notes)
          })
        }
      }
    } catch (error) {
      console.error('Failed to load initial data:', error)
    }
  }
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentProjectRef.current) {
        const channelName = getProjectChannelName(currentProjectRef.current)
        connectionManager.scheduleCleanup(channelName, async () => {
          await unsubscribe()
        })
      }
    }
  }, [unsubscribe])
  
  const contextValue: BroadcastRealtimeContextValue = {
    ...state,
    subscribeToProject,
    unsubscribe,
    trackPresence,
    untrackPresence,
    refresh
  }
  
  return (
    <BroadcastRealtimeContext.Provider value={contextValue}>
      {children}
    </BroadcastRealtimeContext.Provider>
  )
}

// Hooks
export function useBroadcastRealtime() {
  const context = useContext(BroadcastRealtimeContext)
  if (!context) {
    throw new Error('useBroadcastRealtime must be used within BroadcastRealtimeProvider')
  }
  return context
}

export function useBroadcastInterviews() {
  const { interviews } = useBroadcastRealtime()
  return interviews
}

export function useBroadcastInterview(interviewId: string) {
  const { interviews } = useBroadcastRealtime()
  return interviews.find(i => i.id === interviewId)
}

export function useBroadcastInterviewNotes(interviewId: string) {
  const { notes } = useBroadcastRealtime()
  return notes[interviewId] || []
}

export function useBroadcastPresence(interviewId: string) {
  const { presence } = useBroadcastRealtime()
  return presence[interviewId] || []
}