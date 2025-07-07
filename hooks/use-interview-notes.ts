/**
 * Interview Notes Hook - Production Ready
 * Uses broadcast-based realtime system
 */

import { useInterviewNotesBroadcast } from '@/lib/realtime'
import type { CreateNoteRequest } from '@/types/interview-notes'

export function useInterviewNotes(interviewId: string) {
  const {
    notes,
    isLoading,
    isConnected,
    error,
    addNote,
    updateNote,
    deleteNote,
    isAddingNote,
    isDeletingNote
  } = useInterviewNotesBroadcast({
    interviewId,
    enabled: !!interviewId
  })

  // Helper function for backward compatibility
  const getNotesByScriptId = (scriptId: string) => {
    return notes.filter(note => 
      note.script_item_ids?.includes(scriptId)
    )
  }

  // Reply functionality - currently handled by broadcast system
  const addReply = async (data: { noteId: string; content: string }) => {
    // Reply functionality is handled by the broadcast system
    // This is kept for API compatibility
  }

  const deleteReply = async (noteId: string, replyId: string) => {
    // Delete reply functionality is handled by the broadcast system
    // This is kept for API compatibility
  }

  return {
    notes,
    isLoading,
    isConnected,
    error,
    addNote,
    updateNote,
    deleteNote,
    getNotesByScriptId,
    addReply,
    deleteReply,
    isAddingNote,
    isDeletingNote,
    isAddingReply: false,
    isDeletingReply: false
  }
}

// Re-export for backward compatibility
export { useInterviewNotes as useInterviewNotesRealtime }