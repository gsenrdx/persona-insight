/**
 * React hook for collaborative script editing with broadcast
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { channelManager } from '../channels/channel-manager'
import { connectionManager } from '../utils/connection-manager'
import { InterviewScriptHandler } from '../handlers/interview-script-handler'
import { MessageFactory } from '../utils/message-factory'
import { 
  InterviewBroadcastType,
  getInterviewChannelName,
  type ScriptItemPayload,
  type ScriptPresencePayload,
  type InterviewScriptState
} from '../types'
import type { CleanedScriptItem } from '@/types/interview'

export interface UseInterviewScriptBroadcastOptions {
  interviewId: string
  enabled?: boolean
}

export interface UseInterviewScriptBroadcastReturn {
  scripts: Map<string, ScriptItemPayload>
  presence: Map<string, ScriptPresencePayload>
  isLoading: boolean
  isConnected: boolean
  error: Error | null
  updateScript: (scriptId: string, text: string) => Promise<void>
  updatePresence: (presence: Partial<ScriptPresencePayload>) => void
  getPresenceForScript: (scriptId: string) => ScriptPresencePayload[]
  userColor: string
}

// User color cache
const userColorCache = new Map<string, string>()

export function useInterviewScriptBroadcast({
  interviewId,
  enabled = true
}: UseInterviewScriptBroadcastOptions): UseInterviewScriptBroadcastReturn {
  const { user, profile, session } = useAuth()
  const [state, setState] = useState<InterviewScriptState>({
    scripts: new Map(),
    presence: new Map(),
    localChanges: new Map()
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const channelRef = useRef<ReturnType<typeof channelManager.getChannel> | null>(null)
  const handlerRef = useRef<InterviewScriptHandler | null>(null)
  const cleanupRef = useRef<(() => void)[]>([])
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Get or generate user color
  const userColor = userColorCache.get(user?.id || '') || 
    InterviewScriptHandler.generateUserColor()
  
  if (user?.id && !userColorCache.has(user.id)) {
    userColorCache.set(user.id, userColor)
  }
  
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
          const handler = new InterviewScriptHandler(user.id)
          if (!isMounted) return
          
          handlerRef.current = handler
          
          // Subscribe to handler state changes
          const unsubscribeState = handler.subscribe((newState) => {
            if (!isMounted) return
            setState(newState)
          })
          cleanupRef.current.push(unsubscribeState)
          
          // Subscribe to presence changes
          const unsubscribePresence = handler.subscribeToPresence((presence) => {
            if (!isMounted) return
            setState(prev => ({ ...prev, presence }))
          })
          cleanupRef.current.push(unsubscribePresence)
          
          // Get or create channel
          const channel = channelManager.getChannel({
            name: channelName,
            presence: true,
            ack: true,
            selfBroadcast: false
          })
          if (!isMounted) return
          
          channelRef.current = channel
          
          // Set up message handlers
          const unsubscribeScript = channel.on(
            InterviewBroadcastType.INTERVIEW_SCRIPT,
            (message) => {
              if (handlerRef.current) {
                handler.handleMessage(message)
              }
            }
          )
          cleanupRef.current.push(unsubscribeScript)
          
          const unsubscribePresenceChannel = channel.on(
            InterviewBroadcastType.INTERVIEW_SCRIPT_PRESENCE,
            (message) => {
              if (handlerRef.current) {
                handler.handlePresenceMessage(message)
              }
            }
          )
          cleanupRef.current.push(unsubscribePresenceChannel)
          
          // Set up error handler
          const unsubscribeError = channel.onError((err) => {
            console.error('Script channel error:', err)
            if (isMounted) {
              setError(err)
            }
          })
          cleanupRef.current.push(unsubscribeError)
          
          // Subscribe to channel
          const channelState = channel.getState()
          const internalState = channelState as any
          
          if (!internalState.isSubscribed && !internalState.isConnected && !internalState.isSubscribing) {
            await channel.subscribe()
          }
          
          if (!isMounted) return
          
          // Update connection state
          const updatedState = channel.getState()
          setIsConnected(updatedState.isConnected || updatedState.isSubscribed)
          
          // Load initial script data from database
          const { data: interviewData } = await supabase
            .from('interviews')
            .select('cleaned_script')
            .eq('id', interviewId)
            .single()
          
          if (interviewData?.cleaned_script && Array.isArray(interviewData.cleaned_script)) {
            const scriptItems = interviewData.cleaned_script.map((item: any) => ({
              interview_id: interviewId,
              script_id: Array.isArray(item.id) ? item.id.join('-') : item.id,
              cleaned_sentence: item.cleaned_sentence,
              speaker: item.speaker,
              category: item.category,
              last_edited_by: item.last_edited_by,
              last_edited_at: item.last_edited_at,
              version: item.version || 0
            }))
            handler.loadInitialScripts(scriptItems)
          }
          
          // Send initial presence after a short delay to ensure channel is connected
          setTimeout(async () => {
            if (channelRef.current && isMounted) {
              const channelState = channelRef.current.getState()
              if (channelState.isConnected || channelState.isSubscribed) {
                const initialPresence: ScriptPresencePayload = {
                  userId: user.id,
                  userName: profile?.name || user.email?.split('@')[0],
                  avatarUrl: profile?.avatar_url || undefined,
                  color: userColor,
                  lastActiveAt: new Date().toISOString()
                }
                
                const presenceMessage = MessageFactory.presenceAction(
                  InterviewBroadcastType.INTERVIEW_SCRIPT_PRESENCE,
                  initialPresence,
                  user.id
                )
                try {
                  await channelRef.current.send(presenceMessage)
                } catch (err) {
                  console.warn('Failed to send initial presence:', err)
                }
              }
            }
          }, 100)
          
          // Set up presence heartbeat (every 20 seconds)
          presenceIntervalRef.current = setInterval(async () => {
            if (channelRef.current && handlerRef.current) {
              const channelState = channelRef.current.getState()
              if (channelState.isConnected || channelState.isSubscribed) {
                const presence = handlerRef.current.getState().presence.get(user.id)
                if (presence) {
                  const heartbeat = MessageFactory.presenceAction(
                    InterviewBroadcastType.INTERVIEW_SCRIPT_PRESENCE,
                    { ...presence, lastActiveAt: new Date().toISOString() },
                    user.id
                  )
                  try {
                    await channelRef.current.send(heartbeat)
                  } catch (err) {
                    console.warn('Failed to send presence heartbeat:', err)
                  }
                }
              }
            }
          }, 20000)
          
        } catch (err) {
          console.error('Failed to initialize script channel:', err)
          if (isMounted) {
            setError(err as Error)
            setIsLoading(false)
          }
          throw err
        }
      }).catch((err) => {
        console.error('Script channel initialization failed:', err)
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
      
      // Clear presence interval
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current)
        presenceIntervalRef.current = null
      }
      
      // Send leave presence message
      if (channelRef.current && user) {
        const channelState = channelRef.current.getState()
        if (channelState.isConnected || channelState.isSubscribed) {
          const leaveMessage = MessageFactory.deleteAction(
            InterviewBroadcastType.INTERVIEW_SCRIPT_PRESENCE,
            { userId: user.id },
            user.id
          )
          channelRef.current.send(leaveMessage).catch(console.error)
        }
      }
      
      // Clean up local handlers
      cleanupRef.current.forEach(cleanup => cleanup())
      cleanupRef.current = []
      
      // Schedule channel cleanup
      if (channelRef.current) {
        const channelName = getInterviewChannelName(interviewId)
        connectionManager.scheduleCleanup(channelName, async () => {
          await channelManager.removeChannel(channelName)
        })
        channelRef.current = null
      }
      
      if (handlerRef.current) {
        handlerRef.current.clear()
        handlerRef.current = null
      }
    }
  }, [enabled, interviewId, user, profile, userColor])
  
  // Update script
  const updateScript = useCallback(async (scriptId: string, text: string) => {
    if (!user) {
      toast.error('로그인이 필요합니다')
      return
    }
    
    if (!isConnected || !channelRef.current || !handlerRef.current) {
      // Still allow local editing even if not connected
      // Channel not connected, saving to database only
      
      // Save to database directly
      try {
        const response = await fetch(`/api/interviews/${interviewId}/script`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            scriptId,
            cleanedSentence: text
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to save script')
        }
        
        toast.success('스크립트가 저장되었습니다')
      } catch (err) {
        toast.error('스크립트 저장에 실패했습니다')
        // Failed to save script
      }
      return
    }
    
    try {
      // Update locally first (optimistic update)
      const updated = handlerRef.current.updateScript(scriptId, text)
      if (!updated) {
        toast.error('충돌이 발생했습니다. 다시 시도해주세요.')
        return
      }
      
      // Broadcast update immediately
      const message = MessageFactory.updateAction(
        InterviewBroadcastType.INTERVIEW_SCRIPT,
        updated,
        user.id
      )
      await channelRef.current.send(message)
      
      // Save to database (in background)
      fetch(`/api/interviews/${interviewId}/script`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          scriptId,
          cleanedSentence: text
        })
      }).catch(err => {
        // Failed to save script to database
        // Could implement rollback here if needed
      })
      
    } catch (err) {
      toast.error('스크립트 업데이트에 실패했습니다')
      // Failed to update script
    }
  }, [user, interviewId, isConnected, session])
  
  // Update presence
  const updatePresence = useCallback((presence: Partial<ScriptPresencePayload>) => {
    if (!channelRef.current || !handlerRef.current || !user || !profile) return
    
    try {
      // Update local presence
      handlerRef.current.updatePresence({
        ...presence,
        userId: user.id,
        userName: profile.name || user.email?.split('@')[0],
        avatarUrl: profile.avatar_url || undefined,
        color: userColor
      })
      
      // Broadcast presence update
      const fullPresence = handlerRef.current.getState().presence.get(user.id)
      if (fullPresence) {
        const channelState = channelRef.current.getState()
        if (channelState.isConnected || channelState.isSubscribed) {
          const message = MessageFactory.presenceAction(
            InterviewBroadcastType.INTERVIEW_SCRIPT_PRESENCE,
            fullPresence,
            user.id
          )
          channelRef.current.send(message).catch(console.error)
        }
      }
    } catch (err) {
      console.error('Failed to update presence:', err)
    }
  }, [user, profile, userColor])
  
  // Get presence for specific script
  const getPresenceForScript = useCallback((scriptId: string): ScriptPresencePayload[] => {
    if (!handlerRef.current) return []
    return handlerRef.current.getPresenceForScript(scriptId)
  }, [])
  
  return {
    scripts: state.scripts,
    presence: state.presence,
    isLoading,
    isConnected,
    error,
    updateScript,
    updatePresence,
    getPresenceForScript,
    userColor
  }
}