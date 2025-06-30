import { useCallback } from 'react'
import { useInterviewRealtime } from '@/lib/realtime/interview-realtime-provider'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import type { InterviewNote, CreateNoteRequest, CreateReplyRequest } from '@/types/interview-notes'

export function useInterviewNotesRealtime(interviewId: string) {
  const { user, session } = useAuth()
  const { notes } = useInterviewRealtime()
  
  // Get notes for current interview
  const interviewNotes = notes[interviewId] || []

  // Add note
  const addNote = useCallback(async (data: CreateNoteRequest) => {
    if (!session?.access_token) {
      toast.error('인증이 필요합니다')
      return
    }

    try {
      const response = await fetch(`/api/interviews/${interviewId}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error('Failed to create note')
      }
      
      // Realtime will automatically update via subscription
      toast.success('메모가 추가되었습니다')
    } catch (error) {
      console.error('Failed to add note:', error)
      toast.error('메모 추가에 실패했습니다')
    }
  }, [session, interviewId])

  // Delete note
  const deleteNote = useCallback(async (noteId: string) => {
    if (!session?.access_token) {
      toast.error('인증이 필요합니다')
      return
    }

    try {
      const response = await fetch(`/api/interviews/${interviewId}/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete note')
      }
      
      // Realtime will automatically update via subscription
      toast.success('메모가 삭제되었습니다')
    } catch (error) {
      console.error('Failed to delete note:', error)
      toast.error('메모 삭제에 실패했습니다')
    }
  }, [session, interviewId])

  // Add reply
  const addReply = useCallback(async (data: CreateReplyRequest) => {
    if (!session?.access_token) {
      toast.error('인증이 필요합니다')
      return
    }

    try {
      const response = await fetch(`/api/interviews/${interviewId}/notes/${data.noteId}/replies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: data.content })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create reply')
      }
      
      // Realtime will automatically update via subscription
      toast.success('댓글이 추가되었습니다')
    } catch (error) {
      console.error('Failed to add reply:', error)
      toast.error('댓글 추가에 실패했습니다')
    }
  }, [session, interviewId])

  // Delete reply
  const deleteReply = useCallback(async ({ noteId, replyId }: { noteId: string; replyId: string }) => {
    if (!session?.access_token) {
      toast.error('인증이 필요합니다')
      return
    }

    try {
      const response = await fetch(`/api/interviews/${interviewId}/notes/${noteId}/replies/${replyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete reply')
      }
      
      // Realtime will automatically update via subscription
      toast.success('댓글이 삭제되었습니다')
    } catch (error) {
      console.error('Failed to delete reply:', error)
      toast.error('댓글 삭제에 실패했습니다')
    }
  }, [session, interviewId])

  // Get notes by script ID
  const getNotesByScriptId = useCallback((scriptId: string) => {
    return interviewNotes.filter((note: any) => 
      note.script_item_ids?.includes(scriptId)
    )
  }, [interviewNotes])

  return {
    notes: interviewNotes,
    isLoading: false, // Realtime is always ready
    error: null,
    addNote,
    deleteNote,
    addReply,
    deleteReply,
    getNotesByScriptId,
    isAddingNote: false,
    isDeletingNote: false,
    isAddingReply: false,
    isDeletingReply: false
  }
}