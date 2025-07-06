/**
 * Main export file for broadcast-based realtime system
 */

// Types
export * from './types'

// Channel Manager
export { channelManager } from './channels/channel-manager'

// Message Factory
export { MessageFactory } from './utils/message-factory'

// Handlers
export { BaseMessageHandler } from './handlers/base-handler'
export { InterviewNoteHandler } from './handlers/interview-note-handler'

// Hooks
export { useInterviewNotesBroadcast } from './hooks/use-interview-notes-broadcast'

// Provider
export {
  BroadcastRealtimeProvider,
  useBroadcastRealtime,
  useBroadcastInterviews,
  useBroadcastInterview,
  useBroadcastInterviewNotes,
  useBroadcastPresence
} from './providers/broadcast-realtime-provider'