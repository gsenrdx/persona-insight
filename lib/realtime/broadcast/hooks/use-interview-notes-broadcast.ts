/**
 * React hook for interview notes using broadcast
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { channelManager } from '../channels/channel-manager'
import { connectionManager } from '../utils/connection-manager'
import { InterviewNoteHandler } from '../handlers/interview-note-handler'
import { MessageFactory } from '../utils/message-factory'
import { 
  InterviewBroadcastType,
  getInterviewChannelName,
  type InterviewNotePayload,
  type ChannelState
} from '../types'
import type { CreateNoteRequest } from '@/types/interview-notes'

export interface UseInterviewNotesBroadcastOptions {
  interviewId: string
  enabled?: boolean
}

export interface UseInterviewNotesBroadcastReturn {
  notes: InterviewNotePayload[]
  isLoading: boolean
  isConnected: boolean
  error: Error | null
  addNote: (data: CreateNoteRequest) => Promise<void>
  updateNote: (noteId: string, content: string) => Promise<void>
  deleteNote: (noteId: string) => Promise<void>
  isAddingNote: boolean
  isDeletingNote: boolean
}

export function useInterviewNotesBroadcast({
  interviewId,
  enabled = true
}: UseInterviewNotesBroadcastOptions): UseInterviewNotesBroadcastReturn {
  const { user, session, profile } = useAuth()
  const [notes, setNotes] = useState<InterviewNotePayload[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isDeletingNote, setIsDeletingNote] = useState(false)
  
  const channelRef = useRef<ReturnType<typeof channelManager.getChannel> | null>(null)
  const handlerRef = useRef<InterviewNoteHandler | null>(null)
  const cleanupRef = useRef<(() => void)[]>([])
  
  // Load initial notes from database
  const loadInitialNotes = useCallback(async (handler?: InterviewNoteHandler) => {
    const noteHandler = handler || handlerRef.current
    if (!noteHandler) {
      console.warn('No handler available to load initial notes')
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('interview_notes')
        .select(`
          *,
          created_by_profile:profiles!created_by(id, name, avatar_url),
          replies:interview_note_replies(
            *,
            created_by_profile:profiles!created_by(id, name, avatar_url)
          )
        `)
        .eq('interview_id', interviewId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      if (data) {
        noteHandler.loadInitialData(interviewId, data)
      }
    } catch (err) {
      console.error('Failed to load initial notes:', err)
      setError(err as Error)
    }
  }, [interviewId])
  
  // Initialize channel and handler
  useEffect(() => {
    if (!enabled || !interviewId || !user) {
      setIsLoading(false)
      return
    }
    
    let isMounted = true
    const initializeChannel = async () => {
      setIsLoading(true)
      setError(null)
      
      const channelName = getInterviewChannelName(interviewId)
      
      // Use connectionManager to handle deduplication
      await connectionManager.subscribe(channelName, async () => {
        try {
          // Create handler
          const handler = new InterviewNoteHandler()
          if (!isMounted) return
          
          handlerRef.current = handler
          
          // Subscribe to handler state changes
          const unsubscribe = handler.subscribe((state) => {
            if (!isMounted) return
            const interviewNotes = handler.getNotesForInterview(interviewId)
            setNotes(interviewNotes)
          })
          cleanupRef.current.push(unsubscribe)
          
          // Get or create channel
          const channel = channelManager.getChannel({
            name: channelName,
            presence: true,
            ack: true,
            selfBroadcast: false
          })
          if (!isMounted) return
          
          channelRef.current = channel
          
          // Set up message handler
          const unsubscribeMessage = channel.on(
            InterviewBroadcastType.INTERVIEW_NOTE,
            (message) => {
              if (handlerRef.current) {
                handler.handleMessage(message)
              }
            }
          )
          cleanupRef.current.push(unsubscribeMessage)
          
          // Set up error handler
          const unsubscribeError = channel.onError((err) => {
            console.error('Channel error:', err)
            if (isMounted) {
              setError(err)
            }
          })
          cleanupRef.current.push(unsubscribeError)
          
          // Subscribe to channel (only if not already subscribed)
          const channelState = channel.getState()
          // Cast to internal state type that includes isSubscribing
          const internalState = channelState as ChannelState & { isSubscribing?: boolean }
          
          if (!internalState.isSubscribed && !internalState.isConnected && !internalState.isSubscribing) {
            await channel.subscribe()
          }
          
          if (!isMounted) return
          
          // Update connection state based on actual channel state
          const updatedState = channel.getState()
          setIsConnected(updatedState.isConnected || updatedState.isSubscribed)
          
          // Load initial data with the handler we just created
          await loadInitialNotes(handler)
          
        } catch (err) {
          console.error('Failed to initialize channel:', err)
          if (isMounted) {
            setError(err as Error)
            setIsLoading(false)
          }
          throw err // Re-throw to let connectionManager handle it
        }
      }).catch((err) => {
        // Handle errors from connectionManager
        console.error('Channel initialization failed:', err)
        if (isMounted) {
          setError(err as Error)
          setIsLoading(false)
        }
      }).finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })
    }
    
    initializeChannel()
    
    // Cleanup
    return () => {
      isMounted = false
      
      // Clean up local handlers
      cleanupRef.current.forEach(cleanup => cleanup())
      cleanupRef.current = []
      
      // Schedule channel cleanup with delay (for React StrictMode)
      if (channelRef.current) {
        const channelName = getInterviewChannelName(interviewId)
        connectionManager.scheduleCleanup(channelName, async () => {
          await channelManager.removeChannel(channelName)
        })
        channelRef.current = null
      }
      
      if (handlerRef.current) {
        handlerRef.current.clearInterview(interviewId)
        handlerRef.current = null
      }
    }
  }, [enabled, interviewId, user, loadInitialNotes])
  
  // Add note
  const addNote = useCallback(async (data: CreateNoteRequest) => {
    if (!session?.access_token || !user || !profile || !channelRef.current || !handlerRef.current) {
      toast.error('인증이 필요합니다')
      return
    }
    
    setIsAddingNote(true)
    
    try {
      // 1. Create optimistic note
      const tempNote: InterviewNotePayload = {
        interview_id: interviewId,
        script_item_ids: data.scriptItemIds,
        content: data.content,
        created_by: user.id,
        company_id: profile.company_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false
      }
      
      // 2. Add optimistic update
      const tempId = handlerRef.current.addNoteOptimistic(interviewId, tempNote)
      tempNote.tempId = tempId
      
      // 3. Broadcast immediately (10-30ms)
      const message = MessageFactory.createAction(
        InterviewBroadcastType.INTERVIEW_NOTE,
        tempNote,
        user.id
      )
      await channelRef.current.send(message)
      
      // 4. Save to database (background)
      const response = await fetch(`/api/interviews/${interviewId}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error('Failed to create note')
      }
      
      const { data: createdNote } = await response.json()
      
      // 5. Confirm optimistic update
      handlerRef.current.confirmOptimisticUpdate(tempId, createdNote.id)
      
      // 6. Broadcast real data
      const confirmMessage = MessageFactory.updateAction(
        InterviewBroadcastType.INTERVIEW_NOTE,
        { ...createdNote, tempId },
        user.id
      )
      await channelRef.current.send(confirmMessage)
      
      toast.success('메모가 추가되었습니다')
    } catch (err) {
      // Rollback optimistic update
      if (handlerRef.current && tempNote.tempId) {
        handlerRef.current.failOptimisticUpdate(tempNote.tempId)
        
        // Broadcast deletion
        const deleteMessage = MessageFactory.deleteAction(
          InterviewBroadcastType.INTERVIEW_NOTE,
          { id: tempNote.tempId, interview_id: interviewId },
          user.id
        )
        await channelRef.current.send(deleteMessage)
      }
      
      toast.error('메모 추가에 실패했습니다')
      console.error('Failed to add note:', err)
    } finally {
      setIsAddingNote(false)
    }
  }, [session, user, profile, interviewId])
  
  // Update note
  const updateNote = useCallback(async (noteId: string, content: string) => {
    if (!session?.access_token || !user || !channelRef.current) {
      toast.error('인증이 필요합니다')
      return
    }
    
    try {
      // 1. Broadcast update immediately
      const message = MessageFactory.updateAction(
        InterviewBroadcastType.INTERVIEW_NOTE,
        { id: noteId, content, interview_id: interviewId },
        user.id
      )
      await channelRef.current.send(message)
      
      // 2. Update database
      const response = await fetch(`/api/interviews/${interviewId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update note')
      }
      
    } catch (err) {
      toast.error('메모 수정에 실패했습니다')
      console.error('Failed to update note:', err)
    }
  }, [session, user, interviewId])
  
  // Delete note
  const deleteNote = useCallback(async (noteId: string) => {
    if (!session?.access_token || !user || !channelRef.current) {
      toast.error('인증이 필요합니다')
      return
    }
    
    setIsDeletingNote(true)
    
    try {
      // 1. Broadcast delete immediately
      const message = MessageFactory.deleteAction(
        InterviewBroadcastType.INTERVIEW_NOTE,
        { id: noteId, interview_id: interviewId },
        user.id
      )
      await channelRef.current.send(message)
      
      // 2. Delete from database
      const response = await fetch(`/api/interviews/${interviewId}/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete note')
      }
      
      toast.success('메모가 삭제되었습니다')
    } catch (err) {
      // Restore note (need to reload)
      await loadInitialNotes()
      toast.error('메모 삭제에 실패했습니다')
      console.error('Failed to delete note:', err)
    } finally {
      setIsDeletingNote(false)
    }
  }, [session, user, interviewId])
  
  return {
    notes,
    isLoading,
    isConnected,
    error,
    addNote,
    updateNote,
    deleteNote,
    isAddingNote,
    isDeletingNote
  }
}