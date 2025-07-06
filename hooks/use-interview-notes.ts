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

  // Add reply functionality (temporary - will be implemented in broadcast system)
  const addReply = async (data: { noteId: string; content: string }) => {
    console.warn('Reply functionality is being migrated to broadcast system')
    // TODO: Implement in broadcast handler
  }

  const deleteReply = async (noteId: string, replyId: string) => {
    console.warn('Delete reply functionality is being migrated to broadcast system')
    // TODO: Implement in broadcast handler
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