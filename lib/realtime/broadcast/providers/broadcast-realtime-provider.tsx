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
  type InterviewPayload
} from '../types'

export interface BroadcastRealtimeState {
  interviews: InterviewPayload[]
  notes: Record<string, any[]> // interviewId -> notes
  isConnected: boolean
  isLoading: boolean
  error: Error | null
}

export interface BroadcastRealtimeContextValue extends BroadcastRealtimeState {
  projectId: string | null
  activeInterviewId: string | null
  subscribeToProject: (projectId: string) => Promise<void>
  unsubscribe: () => Promise<void>
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
    isConnected: false,
    isLoading: false,
    error: null
  })
  
  const projectChannelRef = useRef<ManagedChannel | null>(null)
  const currentProjectRef = useRef<string | null>(null)
  const noteHandlerRef = useRef<InterviewNoteHandler | null>(null)
  
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
    
    
    currentProjectRef.current = null
    
    setState({
      interviews: [],
      notes: {},
      isConnected: false,
      isLoading: false,
      error: null
    })
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
          ai_persona_definition:persona_definitions!interviews_ai_persona_match_fkey(id, name_ko, name_en, description, tags),
          confirmed_persona_definition:persona_definitions!interviews_confirmed_persona_definition_id_fkey(id, name_ko, name_en, description, tags),
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
    projectId: currentProjectRef.current,
    activeInterviewId: null, // TODO: implement active interview tracking
    subscribeToProject,
    unsubscribe,
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