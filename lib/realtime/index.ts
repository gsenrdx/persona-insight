// Main exports
export { InterviewRealtimeWrapper } from './interview-realtime-wrapper'

// Compatibility exports (using new system under the hood)
export { 
  useInterviewRealtime, 
  useInterviews, 
  useInterview, 
  useInterviewNotes, 
  useInterviewPresence,
  useAllPresence
} from './compatibility-shim'

// Type exports
export { type ConnectionQuality } from './types'

// New improved exports
export {
  useImprovedRealtime,
  useRealtimeInterviews,
  useRealtimeInterview,
  useRealtimeInterviewNotes,
  useRealtimePresence
} from './improved-realtime-provider'

// Core exports for advanced usage
export { channelRegistry } from './core/channel-registry'
export { ConnectionManager } from './core/connection-manager'
export { DataSyncManager } from './core/data-sync-manager'
export { PresenceManager } from './core/presence-manager'

// Component exports
export { ConnectionIndicator } from '@/components/realtime/connection-indicator'