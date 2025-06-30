import { useCallback } from 'react'
import { useInterviewRealtime } from '@/lib/realtime/interview-realtime-provider'
import { supabase } from '@/lib/supabase'
import { InterviewNote } from '@/types/interview-notes'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

export function useInterviewNotesRealtime(interviewId: string) {
  const { user } = useAuth()
  const { notes, broadcastEvent } = useInterviewRealtime()
  
  const interviewNotes = notes[interviewId] || []

  // Create note
  const createNote = useCallback(async (content: string, parentId?: string) => {
    if (!user) throw new Error('Not authenticated')

    try {
      const { data: newNote, error } = await supabase
        .from('interview_notes')
        .insert({
          interview_id: interviewId,
          user_id: user.id,
          content,
          parent_id: parentId,
        })
        .select()
        .single()

      if (error) throw error

      // 브로드캐스트로 다른 사용자에게 알림
      broadcastEvent('note-created', {
        interviewId,
        noteId: newNote.id,
        userId: user.id,
      })

      toast.success('노트가 추가되었습니다')
      return newNote
    } catch (error) {
      console.error('Failed to create note:', error)
      toast.error('노트 추가에 실패했습니다')
      throw error
    }
  }, [interviewId, user, broadcastEvent])

  // Update note
  const updateNote = useCallback(async (noteId: string, content: string) => {
    if (!user) throw new Error('Not authenticated')

    try {
      const { error } = await supabase
        .from('interview_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .eq('user_id', user.id) // 본인 노트만 수정 가능

      if (error) throw error

      // 브로드캐스트로 다른 사용자에게 알림
      broadcastEvent('note-updated', {
        interviewId,
        noteId,
        userId: user.id,
      })

      toast.success('노트가 수정되었습니다')
    } catch (error) {
      console.error('Failed to update note:', error)
      toast.error('노트 수정에 실패했습니다')
      throw error
    }
  }, [user, broadcastEvent, interviewId])

  // Delete note
  const deleteNote = useCallback(async (noteId: string) => {
    if (!user) throw new Error('Not authenticated')

    try {
      const { error } = await supabase
        .from('interview_notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id) // 본인 노트만 삭제 가능

      if (error) throw error

      // 브로드캐스트로 다른 사용자에게 알림
      broadcastEvent('note-deleted', {
        interviewId,
        noteId,
        userId: user.id,
      })

      toast.success('노트가 삭제되었습니다')
    } catch (error) {
      console.error('Failed to delete note:', error)
      toast.error('노트 삭제에 실패했습니다')
      throw error
    }
  }, [user, broadcastEvent, interviewId])

  // Add reply to note
  const addReply = useCallback(async (noteId: string, content: string) => {
    return createNote(content, noteId)
  }, [createNote])

  return {
    notes: interviewNotes,
    createNote,
    updateNote,
    deleteNote,
    addReply,
    isLoading: false, // Realtime은 항상 동기화됨
    error: null,
  }
}