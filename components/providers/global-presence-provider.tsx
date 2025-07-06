'use client'

import { ReactNode } from 'react'
import { useGlobalPresence } from '@/lib/realtime/broadcast/hooks/use-global-presence'

interface GlobalPresenceProviderProps {
  children: ReactNode
}

/**
 * Global presence provider that automatically tracks user location and activity
 * Should be placed high in the component tree to ensure consistent tracking
 */
export function GlobalPresenceProvider({ children }: GlobalPresenceProviderProps) {
  // Initialize global presence tracking
  useGlobalPresence({
    enabled: true,
    trackLocation: true,
    trackActivityEnabled: true,
    heartbeatInterval: 5000 // 5 seconds for fast updates
  })

  return <>{children}</>
}