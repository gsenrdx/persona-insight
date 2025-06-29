import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import type { InterviewNote, CreateNoteRequest, CreateReplyRequest } from '@/types/interview-notes'

export function useInterviewNotes(interviewId: string) {
  const { session, profile } = useAuth()
  const queryClient = useQueryClient()

  // 메모 목록 조회
  const { data: notes = [], isLoading, error } = useQuery({
    queryKey: ['interview-notes', interviewId],
    queryFn: async () => {
      if (!session?.access_token) throw new Error('No access token')
      
      const response = await fetch(`/api/interviews/${interviewId}/notes`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch notes')
      }
      
      const result = await response.json()
      return result.data as InterviewNote[]
    },
    enabled: !!session?.access_token && !!interviewId
  })

  // 메모 추가
  const addNoteMutation = useMutation({
    mutationFn: async (data: CreateNoteRequest) => {
      if (!session?.access_token) throw new Error('No access token')
      
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
      
      const result = await response.json()
      return result.data as InterviewNote
    },
    onMutate: async (data: CreateNoteRequest) => {
      await queryClient.cancelQueries({ queryKey: ['interview-notes', interviewId] })
      const previousNotes = queryClient.getQueryData(['interview-notes', interviewId]) as InterviewNote[]
      
      // 낙관적 업데이트 - 임시 메모 추가
      const optimisticNote: InterviewNote = {
        id: `temp-${Date.now()}`,
        interview_id: interviewId,
        script_item_ids: data.scriptItemIds,
        content: data.content,
        created_by: session?.user?.id || '',
        company_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false,
        created_by_profile: {
          id: profile?.id || '',
          name: profile?.name || '사용자',
          avatar_url: profile?.avatar_url || null
        },
        replies: []
      }
      
      queryClient.setQueryData(['interview-notes', interviewId], (old: InterviewNote[] = []) => [...old, optimisticNote])
      
      return { previousNotes }
    },
    onError: (err, data, context) => {
      // 에러 시 원래 데이터로 복구
      queryClient.setQueryData(['interview-notes', interviewId], context?.previousNotes)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-notes', interviewId] })
    }
  })

  // 메모 삭제
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      if (!session?.access_token) throw new Error('No access token')
      
      const response = await fetch(`/api/interviews/${interviewId}/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete note')
      }
    },
    onMutate: async (noteId: string) => {
      await queryClient.cancelQueries({ queryKey: ['interview-notes', interviewId] })
      const previousNotes = queryClient.getQueryData(['interview-notes', interviewId]) as InterviewNote[]
      
      // 낙관적 업데이트 - 메모 제거
      const updatedNotes = previousNotes?.filter(note => note.id !== noteId)
      queryClient.setQueryData(['interview-notes', interviewId], updatedNotes)
      
      return { previousNotes }
    },
    onError: (err, data, context) => {
      queryClient.setQueryData(['interview-notes', interviewId], context?.previousNotes)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-notes', interviewId] })
    }
  })

  // 댓글 추가
  const addReplyMutation = useMutation({
    mutationFn: async (data: CreateReplyRequest) => {
      if (!session?.access_token) throw new Error('No access token')
      
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
      
      const result = await response.json()
      return result.data
    },
    onMutate: async (data: CreateReplyRequest) => {
      await queryClient.cancelQueries({ queryKey: ['interview-notes', interviewId] })
      const previousNotes = queryClient.getQueryData(['interview-notes', interviewId]) as InterviewNote[]
      
      // 낙관적 업데이트 - 댓글 추가
      const updatedNotes = previousNotes?.map(note => {
        if (note.id === data.noteId) {
          const optimisticReply = {
            id: `temp-reply-${Date.now()}`,
            note_id: data.noteId,
            content: data.content,
            created_by: session?.user?.id || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_deleted: false,
            created_by_profile: {
              id: profile?.id || '',
              name: profile?.name || '사용자',
              avatar_url: profile?.avatar_url || null
            }
          }
          return {
            ...note,
            replies: [...(note.replies || []), optimisticReply]
          }
        }
        return note
      })
      
      queryClient.setQueryData(['interview-notes', interviewId], updatedNotes)
      
      return { previousNotes }
    },
    onError: (err, data, context) => {
      queryClient.setQueryData(['interview-notes', interviewId], context?.previousNotes)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-notes', interviewId] })
    }
  })

  // 댓글 삭제
  const deleteReplyMutation = useMutation({
    mutationFn: async ({ noteId, replyId }: { noteId: string; replyId: string }) => {
      if (!session?.access_token) throw new Error('No access token')
      
      const response = await fetch(`/api/interviews/${interviewId}/notes/${noteId}/replies/${replyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete reply')
      }
    },
    onMutate: async ({ noteId, replyId }) => {
      await queryClient.cancelQueries({ queryKey: ['interview-notes', interviewId] })
      const previousNotes = queryClient.getQueryData(['interview-notes', interviewId]) as InterviewNote[]
      
      // 낙관적 업데이트 - 댓글 제거
      const updatedNotes = previousNotes?.map(note => {
        if (note.id === noteId) {
          return {
            ...note,
            replies: note.replies?.filter(reply => reply.id !== replyId) || []
          }
        }
        return note
      })
      
      queryClient.setQueryData(['interview-notes', interviewId], updatedNotes)
      
      return { previousNotes }
    },
    onError: (err, data, context) => {
      queryClient.setQueryData(['interview-notes', interviewId], context?.previousNotes)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-notes', interviewId] })
    }
  })

  // 스크립트 ID로 메모 찾기
  const getNotesByScriptId = (scriptId: string) => {
    return notes.filter(note => note.script_item_ids.includes(scriptId))
  }

  return {
    notes,
    isLoading,
    error,
    addNote: addNoteMutation.mutate,
    deleteNote: deleteNoteMutation.mutate,
    addReply: addReplyMutation.mutate,
    deleteReply: deleteReplyMutation.mutate,
    getNotesByScriptId,
    isAddingNote: addNoteMutation.isPending,
    isDeletingNote: deleteNoteMutation.isPending,
    isAddingReply: addReplyMutation.isPending,
    isDeletingReply: deleteReplyMutation.isPending
  }
}