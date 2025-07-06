/**
 * Interview-specific broadcast types
 */

import type { BroadcastMessage, BroadcastAction } from './base.types'
import type { Database } from '@/types/database'

// Database types
type Interview = Database['public']['Tables']['interviews']['Row']
type InterviewNote = Database['public']['Tables']['interview_notes']['Row']
type InterviewNoteReply = Database['public']['Tables']['interview_note_replies']['Row']

// Interview broadcast events
export enum InterviewBroadcastType {
  INTERVIEW = 'interview',
  INTERVIEW_NOTE = 'interview_note',
  INTERVIEW_NOTE_REPLY = 'interview_note_reply',
  INTERVIEW_PRESENCE = 'interview_presence',
  INTERVIEW_SCRIPT = 'interview_script',
  INTERVIEW_SCRIPT_PRESENCE = 'interview_script_presence'
}

// Interview actions
export interface InterviewPayload extends Partial<Interview> {
  tempId?: string
}

export interface InterviewNotePayload extends Partial<InterviewNote> {
  tempId?: string
  interview_id: string
}

export interface InterviewNoteReplyPayload extends Partial<InterviewNoteReply> {
  tempId?: string
  note_id: string
}

// Script item payload for realtime editing
export interface ScriptItemPayload {
  interview_id: string
  script_id: string // id array joined with '-'
  cleaned_sentence: string
  speaker?: 'question' | 'answer'
  category?: 'painpoint' | 'needs' | null
  version?: number // for conflict resolution
  last_edited_by?: string
  last_edited_at?: string
}

// Script presence for collaborative editing
export interface ScriptPresencePayload {
  userId: string
  userName?: string
  avatarUrl?: string
  scriptId?: string // which script item user is editing
  cursorPosition?: number
  cursorCoords?: { x: number; y: number } // actual pixel coordinates
  selection?: {
    start: number
    end: number
  }
  selectionCoords?: { x: number; y: number; width: number; height: number } // actual pixel coordinates
  color?: string // user color for cursor/selection
  lastActiveAt?: string // for presence cleanup
}

// Typed broadcast messages
export type InterviewBroadcastMessage = BroadcastMessage<InterviewPayload>
export type InterviewNoteBroadcastMessage = BroadcastMessage<InterviewNotePayload>
export type InterviewNoteReplyBroadcastMessage = BroadcastMessage<InterviewNoteReplyPayload>
export type InterviewScriptBroadcastMessage = BroadcastMessage<ScriptItemPayload>
export type InterviewScriptPresenceBroadcastMessage = BroadcastMessage<ScriptPresencePayload>

// Re-export global presence types for compatibility
export type { 
  GlobalPresenceData,
  PresenceSummary,
  ActivityType,
  LocationType 
} from './global-presence.types'

// Channel names
export const getProjectChannelName = (projectId: string) => `project:${projectId}`
export const getInterviewChannelName = (interviewId: string) => `interview:${interviewId}`

// Presence types for interviews
export interface InterviewPresence {
  userId: string
  userName?: string
  email?: string
  avatarUrl?: string
  interviewId: string
  cursorPosition?: {
    noteId?: string
    position?: number
  }
  isTyping?: boolean
  lastActiveAt: string
}