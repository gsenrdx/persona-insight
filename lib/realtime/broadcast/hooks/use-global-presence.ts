/**
 * Global presence hook for company-wide activity tracking
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { channelManager } from '../channels/channel-manager'
import { connectionManager } from '../utils/connection-manager'
import { MessageFactory } from '../utils/message-factory'
import { InterviewScriptHandler } from '../handlers/interview-script-handler'
import {
  GlobalBroadcastType,
  getGlobalPresenceChannelName,
  type GlobalPresencePayload,
  type ActivityType,
  type LocationType,
  LocationType as Locations,
  ActivityType as Activities
} from '../types/global-presence.types'

export interface UseGlobalPresenceOptions {
  enabled?: boolean
  trackLocation?: boolean
  trackActivityEnabled?: boolean
  heartbeatInterval?: number
}

export interface UseGlobalPresenceReturn {
  activeUsers: GlobalPresencePayload[]
  isLoading: boolean
  isConnected: boolean
  error: Error | null
  trackActivity: (activity: ActivityType, location: LocationType, details?: any) => void
  updatePresence: (updates: Partial<GlobalPresencePayload>) => void
  getUsersInLocation: (location: LocationType) => GlobalPresencePayload[]
  getUsersByActivity: (activity: ActivityType) => GlobalPresencePayload[]
}

// User color cache for consistency
const userColorCache = new Map<string, string>()

// Location mapping based on pathname
const getLocationFromPath = (pathname: string): { type: LocationType; context: any } => {
  if (pathname === '/projects' || pathname === '/') {
    return { type: Locations.PROJECT_LIST, context: {} }
  }
  
  const projectMatch = pathname.match(/^\/projects\/([^\/]+)$/)
  if (projectMatch) {
    return { 
      type: Locations.PROJECT_DETAIL, 
      context: { projectId: projectMatch[1] } 
    }
  }
  
  const interviewListMatch = pathname.match(/^\/projects\/([^\/]+)\/interviews$/)
  if (interviewListMatch) {
    return { 
      type: Locations.INTERVIEW_LIST, 
      context: { projectId: interviewListMatch[1] } 
    }
  }
  
  const interviewDetailMatch = pathname.match(/^\/projects\/([^\/]+)\/interviews\/([^\/]+)$/)
  if (interviewDetailMatch) {
    return { 
      type: Locations.INTERVIEW_DETAIL, 
      context: { 
        projectId: interviewDetailMatch[1], 
        interviewId: interviewDetailMatch[2] 
      } 
    }
  }
  
  // Default fallback
  return { type: Locations.PROJECT_LIST, context: {} }
}

export function useGlobalPresence({
  enabled = true,
  trackLocation = true,
  trackActivityEnabled = true,
  heartbeatInterval = 10000 // 10 seconds for faster updates
}: UseGlobalPresenceOptions = {}): UseGlobalPresenceReturn {
  const { user, profile } = useAuth()
  const pathname = usePathname()
  
  const [activeUsers, setActiveUsers] = useState<GlobalPresencePayload[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const channelRef = useRef<ReturnType<typeof channelManager.getChannel> | null>(null)
  const cleanupRef = useRef<(() => void)[]>([])
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentLocationRef = useRef<{ type: LocationType; context: any } | null>(null)
  const currentActivityRef = useRef<ActivityType>(Activities.VIEWING)
  
  // Get or generate consistent user color
  const userColor = userColorCache.get(user?.id || '') || 
    InterviewScriptHandler.generateUserColor(user?.id)
  
  if (user?.id && !userColorCache.has(user.id)) {
    userColorCache.set(user.id, userColor)
  }
  
  // Initialize global presence system
  useEffect(() => {
    if (!enabled || !user || !profile?.company_id) {
      setIsLoading(false)
      return
    }
    
    let isMounted = true
    
    const initializeGlobalPresence = async () => {
      setIsLoading(true)
      setError(null)
      
      const channelName = getGlobalPresenceChannelName(profile.company_id)
      
      try {
        // Use connection manager for deduplication
        await connectionManager.subscribe(channelName, async () => {
          if (!isMounted) return
          
          // Get or create channel
          const channel = channelManager.getChannel({
            name: channelName,
            presence: true,
            ack: true,
            selfBroadcast: false
          })
          
          channelRef.current = channel
          
          // Set up message handlers
          const unsubscribePresence = channel.on(
            GlobalBroadcastType.GLOBAL_PRESENCE,
            (message) => {
              if (!isMounted) return
              
              const { payload } = message
              setActiveUsers(prev => {
                const filtered = prev.filter(u => u.userId !== payload.userId)
                
                // Only add if user is still active (within 90 seconds)
                const isActive = Date.now() - new Date(payload.lastActiveAt).getTime() < 90000
                if (isActive) {
                  return [...filtered, payload].slice(0, 100) // Limit to 100 users for performance
                }
                return filtered
              })
            }
          )
          cleanupRef.current.push(unsubscribePresence)
          
          // Set up error handler
          const unsubscribeError = channel.onError((err) => {
            console.error('Global presence channel error:', err)
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
          
          // Send initial presence
          await sendPresenceUpdate()
          
        })
        
      } catch (err) {
        console.error('Failed to initialize global presence:', err)
        if (isMounted) {
          setError(err as Error)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    
    // Helper function to send presence updates
    const sendPresenceUpdate = async (overrides: Partial<GlobalPresencePayload> = {}) => {
      if (!channelRef.current || !user || !profile) return
      
      const location = getLocationFromPath(pathname)
      currentLocationRef.current = location
      
      const presence: GlobalPresencePayload = {
        userId: user.id,
        userName: profile.name || user.email?.split('@')[0],
        avatarUrl: profile.avatar_url || undefined,
        currentLocation: {
          type: location.type,
          ...location.context
        },
        activity: currentActivityRef.current,
        color: userColor,
        lastActiveAt: new Date().toISOString(),
        sessionId: crypto.randomUUID(),
        ...overrides
      }
      
      const channelState = channelRef.current.getState()
      if (channelState.isConnected || channelState.isSubscribed) {
        const message = MessageFactory.createAction(
          GlobalBroadcastType.GLOBAL_PRESENCE,
          presence,
          user.id
        )
        
        if (channelRef.current) {
          try {
            await channelRef.current.send(message)
          } catch (err) {
            console.warn('Failed to send presence update:', err)
          }
        }
      }
    }
    
    initializeGlobalPresence()
    
    // Set up heartbeat
    if (heartbeatInterval > 0) {
      heartbeatIntervalRef.current = setInterval(() => {
        sendPresenceUpdate()
      }, heartbeatInterval)
    }
    
    // Cleanup
    return () => {
      isMounted = false
      
      // Clear heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
      
      // Send leave message
      if (channelRef.current && user) {
        const channelState = channelRef.current.getState()
        if (channelState.isConnected || channelState.isSubscribed) {
          const leaveMessage = MessageFactory.deleteAction(
            GlobalBroadcastType.GLOBAL_PRESENCE,
            { userId: user.id },
            user.id
          )
          if (channelRef.current) {
            channelRef.current.send(leaveMessage).catch(console.error)
          }
        }
      }
      
      // Clean up handlers
      cleanupRef.current.forEach(cleanup => cleanup())
      cleanupRef.current = []
      
      // Schedule channel cleanup
      if (channelRef.current && profile?.company_id) {
        const channelName = getGlobalPresenceChannelName(profile.company_id)
        connectionManager.scheduleCleanup(channelName, async () => {
          await channelManager.removeChannel(channelName)
        })
        channelRef.current = null
      }
    }
  }, [enabled, user, profile, pathname, userColor, heartbeatInterval])
  
  // Track location changes
  useEffect(() => {
    if (!trackLocation || !user || !profile) return
    
    const location = getLocationFromPath(pathname)
    
    // Only update if location actually changed
    if (!currentLocationRef.current || 
        currentLocationRef.current.type !== location.type ||
        JSON.stringify(currentLocationRef.current.context) !== JSON.stringify(location.context)) {
      
      currentLocationRef.current = location
      
      // Send updated presence
      const sendUpdate = async () => {
        if (!channelRef.current) return
        
        const presence: GlobalPresencePayload = {
          userId: user.id,
          userName: profile.name || user.email?.split('@')[0],
          avatarUrl: profile.avatar_url || undefined,
          currentLocation: {
            type: location.type,
            ...location.context
          },
          activity: currentActivityRef.current,
          color: userColor,
          lastActiveAt: new Date().toISOString()
        }
        
        const channelState = channelRef.current.getState()
        if (channelState.isConnected || channelState.isSubscribed) {
          const message = MessageFactory.updateAction(
            GlobalBroadcastType.GLOBAL_PRESENCE,
            presence,
            user.id
          )
          
          if (channelRef.current) {
            try {
              await channelRef.current.send(message)
            } catch (err) {
              console.warn('Failed to send location update:', err)
            }
          }
        }
      }
      
      sendUpdate()
    }
  }, [pathname, trackLocation, user, profile, userColor])
  
  // Track activity function
  const trackActivity = useCallback((activity: ActivityType, location: LocationType, details?: any) => {
    if (!trackActivityEnabled || !user || !profile) return
    
    currentActivityRef.current = activity
    
    const sendUpdate = async () => {
      if (!channelRef.current) return
      
      const presence: GlobalPresencePayload = {
        userId: user.id,
        userName: profile.name || user.email?.split('@')[0],
        avatarUrl: profile.avatar_url || undefined,
        currentLocation: {
          type: location,
          ...details
        },
        activity,
        activityDetails: details?.activityDetails,
        color: userColor,
        lastActiveAt: new Date().toISOString()
      }
      
      const channelState = channelRef.current.getState()
      if (channelState.isConnected || channelState.isSubscribed) {
        const message = MessageFactory.updateAction(
          GlobalBroadcastType.GLOBAL_PRESENCE,
          presence,
          user.id
        )
        
        if (channelRef.current) {
          try {
            await channelRef.current.send(message)
          } catch (err) {
            console.warn('Failed to send activity update:', err)
          }
        }
      }
    }
    
    sendUpdate()
  }, [trackActivityEnabled, user, profile, userColor])
  
  // Update presence function
  const updatePresence = useCallback((updates: Partial<GlobalPresencePayload>) => {
    if (!user || !profile) return
    
    const sendUpdate = async () => {
      if (!channelRef.current) return
      
      const location = currentLocationRef.current || getLocationFromPath(pathname)
      
      const presence: GlobalPresencePayload = {
        userId: user.id,
        userName: profile.name || user.email?.split('@')[0],
        avatarUrl: profile.avatar_url || undefined,
        currentLocation: {
          type: location.type,
          ...location.context
        },
        activity: currentActivityRef.current,
        color: userColor,
        lastActiveAt: new Date().toISOString(),
        ...updates
      }
      
      const channelState = channelRef.current.getState()
      if (channelState.isConnected || channelState.isSubscribed) {
        const message = MessageFactory.updateAction(
          GlobalBroadcastType.GLOBAL_PRESENCE,
          presence,
          user.id
        )
        
        if (channelRef.current) {
          try {
            await channelRef.current.send(message)
          } catch (err) {
            console.warn('Failed to send presence update:', err)
          }
        }
      }
    }
    
    sendUpdate()
  }, [user, profile, userColor, pathname])
  
  // Helper functions
  const getUsersInLocation = useCallback((location: LocationType): GlobalPresencePayload[] => {
    return activeUsers.filter(user => user.currentLocation.type === location)
  }, [activeUsers])
  
  const getUsersByActivity = useCallback((activity: ActivityType): GlobalPresencePayload[] => {
    return activeUsers.filter(user => user.activity === activity)
  }, [activeUsers])
  
  return {
    activeUsers,
    isLoading,
    isConnected,
    error,
    trackActivity,
    updatePresence,
    getUsersInLocation,
    getUsersByActivity
  }
}