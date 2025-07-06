/**
 * Realtime System - Broadcast Based
 * 
 * Production-ready realtime system with 10-30ms latency
 * Replaces legacy Postgres Changes approach
 */

// Core exports
export * from './broadcast'

// Main provider
export { BroadcastRealtimeProvider as RealtimeProvider } from './broadcast'

// Primary hooks
export {
  useBroadcastRealtime as useRealtime,
  useBroadcastInterviews as useInterviews,
  useBroadcastInterview as useInterview,
  useBroadcastInterviewNotes as useInterviewNotes,
  useBroadcastPresence as usePresence
} from './broadcast'

// Interview-specific hooks
export { useInterviewNotesBroadcast } from './broadcast'

// Channel manager for advanced usage
export { channelManager } from './broadcast'

// Message factory for custom messages
export { MessageFactory } from './broadcast'

// Types
export type {
  BroadcastMessage,
  BroadcastAction,
  InterviewPayload,
  InterviewNotePayload,
  InterviewPresence,
  ChannelState
} from './broadcast'