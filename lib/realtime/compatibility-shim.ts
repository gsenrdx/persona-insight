/**
 * Compatibility shim for smooth migration from old to new realtime system
 * Maps old hook names to new ones
 */

import {
  useImprovedRealtime,
  useRealtimeInterviews,
  useRealtimeInterview,
  useRealtimeInterviewNotes,
  useRealtimePresence
} from './improved-realtime-provider'

// Map old useInterviewRealtime to new useImprovedRealtime
export function useInterviewRealtime() {
  const context = useImprovedRealtime()
  
  // Map new API to old API structure
  return {
    ...context,
    // Old API compatibility
    isSubscribed: context.connectionState === 'connected',
    forceRefreshData: context.refresh,
    getConnectionQuality: () => ({
      lastSuccessfulPing: Date.now(),
      failedPings: 0,
      averageLatency: 50,
      isStable: context.connectionState === 'connected'
    }),
    // Broadcast event is now handled automatically
    broadcastEvent: async (event: string, payload: any) => {
      console.warn('broadcastEvent is deprecated and no longer needed')
    }
  }
}

// Direct mappings
export const useInterviews = useRealtimeInterviews
export const useInterview = useRealtimeInterview
export const useInterviewNotes = useRealtimeInterviewNotes
export const useInterviewPresence = useRealtimePresence

// useAllPresence needs special handling
export function useAllPresence() {
  const { presence } = useImprovedRealtime()
  return presence
}