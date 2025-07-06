/**
 * Interview note message handler
 */

import { BaseMessageHandler } from './base-handler'
import { BroadcastAction } from '../types'
import type { 
  BroadcastMessage,
  InterviewNotePayload,
  InterviewNoteBroadcastMessage
} from '../types'

export interface InterviewNoteState {
  notes: Map<string, InterviewNotePayload[]> // interviewId -> notes
  replies: Map<string, any[]> // noteId -> replies
}

export class InterviewNoteHandler extends BaseMessageHandler<InterviewNotePayload> {
  private state: InterviewNoteState = {
    notes: new Map(),
    replies: new Map()
  }
  
  private listeners: Set<(state: InterviewNoteState) => void> = new Set()
  
  /**
   * Handle incoming note message
   */
  async handleMessage(message: InterviewNoteBroadcastMessage): Promise<void> {
    // Skip if duplicate
    if (this.isDuplicate(message)) {
      return
    }
    
    const { action, payload } = message
    
    switch (action) {
      case BroadcastAction.CREATE:
        this.handleCreate(payload)
        break
      case BroadcastAction.UPDATE:
        this.handleUpdate(payload)
        break
      case BroadcastAction.DELETE:
        this.handleDelete(payload)
        break
      case BroadcastAction.SYNC:
        this.handleSync(payload)
        break
    }
    
    // Notify listeners
    this.notifyListeners()
  }
  
  /**
   * Add state change listener
   */
  subscribe(listener: (state: InterviewNoteState) => void): () => void {
    this.listeners.add(listener)
    // Immediately call with current state
    listener(this.getState())
    
    return () => {
      this.listeners.delete(listener)
    }
  }
  
  /**
   * Get current state
   */
  getState(): InterviewNoteState {
    return {
      notes: new Map(this.state.notes),
      replies: new Map(this.state.replies)
    }
  }
  
  /**
   * Add note with optimistic update
   */
  addNoteOptimistic(interviewId: string, note: InterviewNotePayload): string {
    const tempId = `temp-${Date.now()}-${Math.random()}`
    const optimisticNote = {
      ...note,
      id: tempId,
      tempId
    }
    
    // Add to optimistic updates
    this.addOptimisticUpdate(tempId, optimisticNote)
    
    // Add to state
    const notes = this.state.notes.get(interviewId) || []
    this.state.notes.set(interviewId, [...notes, optimisticNote])
    
    this.notifyListeners()
    return tempId
  }
  
  /**
   * Get notes for interview (including optimistic)
   */
  getNotesForInterview(interviewId: string): InterviewNotePayload[] {
    const notes = this.state.notes.get(interviewId) || []
    const optimisticNotes = this.getOptimisticUpdates()
      .filter(u => u.status === 'pending' && u.data.interview_id === interviewId)
      .map(u => u.data)
    
    // Merge and deduplicate
    const allNotes = [...notes]
    optimisticNotes.forEach(optNote => {
      if (!notes.some(n => n.tempId === optNote.tempId)) {
        allNotes.push(optNote)
      }
    })
    
    return allNotes
  }
  
  /**
   * Load initial data
   */
  loadInitialData(interviewId: string, notes: InterviewNotePayload[]): void {
    this.state.notes.set(interviewId, notes)
    this.notifyListeners()
  }
  
  /**
   * Clear data for interview
   */
  clearInterview(interviewId: string): void {
    this.state.notes.delete(interviewId)
    // Also clear replies for notes in this interview
    const notes = this.state.notes.get(interviewId) || []
    notes.forEach(note => {
      if (note.id) {
        this.state.replies.delete(note.id)
      }
    })
    this.notifyListeners()
  }
  
  private handleCreate(payload: InterviewNotePayload): void {
    const { interview_id, tempId } = payload
    if (!interview_id) return
    
    const notes = this.state.notes.get(interview_id) || []
    
    // If this confirms an optimistic update
    if (tempId && payload.id) {
      this.confirmOptimisticUpdate(tempId, payload.id)
      // Replace temp note with real one
      const index = notes.findIndex(n => n.tempId === tempId || n.id === tempId)
      if (index >= 0) {
        notes[index] = payload
      } else {
        notes.push(payload)
      }
    } else {
      // New note from another user
      notes.push(payload)
    }
    
    this.state.notes.set(interview_id, notes)
  }
  
  private handleUpdate(payload: InterviewNotePayload): void {
    const { interview_id, id } = payload
    if (!interview_id || !id) return
    
    const notes = this.state.notes.get(interview_id) || []
    const index = notes.findIndex(n => n.id === id)
    
    if (index >= 0) {
      notes[index] = { ...notes[index], ...payload }
      this.state.notes.set(interview_id, notes)
    }
  }
  
  private handleDelete(payload: InterviewNotePayload): void {
    const { interview_id, id } = payload
    if (!interview_id || !id) return
    
    const notes = this.state.notes.get(interview_id) || []
    const filtered = notes.filter(n => n.id !== id && n.tempId !== id)
    this.state.notes.set(interview_id, filtered)
    
    // Also remove replies
    this.state.replies.delete(id)
  }
  
  private handleSync(payload: InterviewNotePayload): void {
    // Full sync - replace all notes for interview
    const { interview_id } = payload
    if (!interview_id || !Array.isArray(payload.notes)) return
    
    this.state.notes.set(interview_id, payload.notes)
  }
  
  private notifyListeners(): void {
    const state = this.getState()
    this.listeners.forEach(listener => {
      try {
        listener(state)
      } catch (error) {
        console.error('Error in note handler listener:', error)
      }
    })
  }
  
  /**
   * Check for duplicate by content and timing
   */
  override isDuplicate(message: InterviewNoteBroadcastMessage): boolean {
    if (super.isDuplicate(message)) return true
    
    const { payload, metadata } = message
    const { interview_id, content, tempId } = payload
    
    if (!interview_id || !content) return false
    
    const notes = this.state.notes.get(interview_id) || []
    
    // Check for exact content match within 5 seconds
    return notes.some(note => {
      if (note.content !== content) return false
      if (note.created_by !== metadata.userId) return false
      
      const noteTime = new Date(note.created_at || 0).getTime()
      const messageTime = metadata.timestamp
      
      return Math.abs(noteTime - messageTime) < 5000
    })
  }
}