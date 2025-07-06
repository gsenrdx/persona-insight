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
  INTERVIEW_PRESENCE = 'interview_presence'
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

// Typed broadcast messages
export type InterviewBroadcastMessage = BroadcastMessage<InterviewPayload>
export type InterviewNoteBroadcastMessage = BroadcastMessage<InterviewNotePayload>
export type InterviewNoteReplyBroadcastMessage = BroadcastMessage<InterviewNoteReplyPayload>

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