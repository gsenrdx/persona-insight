/**
 * Interview Notes Hook - 낙관적 업데이트 기반
 * 즉시 반응하는 노트 관리 시스템
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import { toast } from 'sonner'
import type { CreateNoteRequest } from '@/types/interview-notes'
import type { Database } from '@/types/database'

type InterviewNote = Database['public']['Tables']['interview_notes']['Row']

interface UseInterviewNotesOptions {
  interviewId: string
  projectId?: string
  enabled?: boolean
}

/**
 * 프로덕션 수준 인터뷰 노트 관리
 * 낙관적 업데이트로 즉시 반응하는 협업 환경 제공
 */
export function useInterviewNotes(interviewId: string, projectId?: string) {
  const { session, profile } = useAuth()
  const queryClient = useQueryClient()

  // 노트 목록 조회 (스마트 폴링으로 협업 지원)
  const {
    data: notes = [],
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery<InterviewNote[]>({
    queryKey: ['interview-notes', interviewId],
    queryFn: async () => {
      if (!session?.access_token) throw new Error('인증이 필요합니다')
      
      const response = await fetch(`/api/interviews/${interviewId}/notes`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`노트 조회 실패: ${response.status}`)
      }
      
      const result = await response.json()
      return result.data || []
    },
    enabled: !!session?.access_token && !!interviewId,
    // 적응형 폴링: 백그라운드에서 비활성화, 최근 활동 시에만 활성
    refetchInterval: (query) => {
      // 백그라운드 탭에서 폴링 비활성화
      if (document.hidden) return false
      
      const notes = query.state.data as InterviewNote[] || []
      
      // 노트가 없으면 폴링 중단
      if (notes.length === 0) return false
      
      // 최근 5분 이내 노트가 있으면 30초마다 폴링
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      const hasRecentActivity = notes.some(note => {
        const noteTime = new Date(note.created_at).getTime()
        return noteTime > fiveMinutesAgo
      })
      
      // 최근 활동이 있으면 30초, 없으면 5분마다 폴링
      return hasRecentActivity ? 30000 : 5 * 60 * 1000
    },
    // 창 포커스 시 최신 상태 확인
    refetchOnWindowFocus: true,
    // 재연결 시 동기화
    refetchOnReconnect: true,
    // 캐시 시간 단축 (협업 환경)
    staleTime: 30 * 1000,
    // 메모리 효율을 위한 가비지 컬렉션 시간
    gcTime: 5 * 60 * 1000,
    // 에러 시 재시도 최적화
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false
      // 네트워크 오류는 더 적극적으로 재시도
      if (error?.message?.includes('Failed to fetch')) return failureCount < 5
      return true
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000)
  })

  // 노트 추가 (낙관적 업데이트)
  const addNoteMutation = useMutation({
    mutationFn: async (data: CreateNoteRequest) => {
      if (!session?.access_token) throw new Error('인증이 필요합니다')
      
      const response = await fetch(`/api/interviews/${interviewId}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error('노트 추가에 실패했습니다')
      }
      
      return response.json()
    },
    onMutate: async (newNote) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['interview-notes', interviewId] })
      
      // 이전 데이터 백업
      const previousNotes = queryClient.getQueryData<InterviewNote[]>(['interview-notes', interviewId])
      
      // 낙관적 업데이트: 임시 노트 즉시 추가
      const tempNote: InterviewNote = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        interview_id: interviewId,
        content: newNote.content,
        script_item_ids: newNote.script_item_ids || null,
        created_by: profile?.id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: { is_temp: true }
      }
      
      queryClient.setQueryData<InterviewNote[]>(
        ['interview-notes', interviewId],
        (old = []) => [tempNote, ...old]
      )
      
      return { previousNotes, tempNote }
    },
    onSuccess: (data, variables, context) => {
      // 서버 응답으로 임시 데이터 교체
      if (data && context?.tempNote) {
        queryClient.setQueryData<InterviewNote[]>(
          ['interview-notes', interviewId],
          (old = []) => {
            const withoutTemp = old.filter(note => note.id !== context.tempNote.id)
            const realNote = { ...data, metadata: {} }
            return [realNote, ...withoutTemp]
          }
        )
      }
      
      // 노트 추가 후 폴링 활성화 (다른 사용자 반응 감지)
      queryClient.invalidateQueries({ queryKey: ['interview-notes', interviewId] })
      
      toast.success('노트가 추가되었습니다')
    },
    onError: (error, variables, context) => {
      // 에러 시 이전 상태로 복원
      if (context?.previousNotes) {
        queryClient.setQueryData(['interview-notes', interviewId], context.previousNotes)
      }
      
      const errorMessage = error instanceof Error ? error.message : '노트 추가에 실패했습니다'
      toast.error(errorMessage)
    }
  })

  // 노트 업데이트
  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      if (!session?.access_token) throw new Error('Unauthorized')
      
      const response = await fetch(`/api/interviews/${interviewId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update note')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // 노트 수정 후 폴링 활성화
      queryClient.invalidateQueries({ queryKey: ['interview-notes', interviewId] })
      toast.success('노트가 수정되었습니다')
    },
    onError: (error) => {
      toast.error('노트 수정에 실패했습니다')
      // Error logged for debugging
    }
  })

  // 노트 삭제
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      if (!session?.access_token) throw new Error('Unauthorized')
      
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
    onSuccess: () => {
      // 노트 삭제 후 폴링 활성화
      queryClient.invalidateQueries({ queryKey: ['interview-notes', interviewId] })
      toast.success('노트가 삭제되었습니다')
    },
    onError: (error) => {
      toast.error('노트 삭제에 실패했습니다')
      // Error logged for debugging
    }
  })

  // 댓글 추가
  const addReplyMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      if (!session?.access_token) throw new Error('Unauthorized')
      
      const response = await fetch(`/api/interviews/${interviewId}/notes/${noteId}/replies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      })
      
      if (!response.ok) {
        throw new Error('Failed to add reply')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // 댓글 추가 후 폴링 활성화
      queryClient.invalidateQueries({ queryKey: ['interview-notes', interviewId] })
      toast.success('댓글이 추가되었습니다')
    },
    onError: (error) => {
      toast.error('댓글 추가에 실패했습니다')
      // Error logged for debugging
    }
  })

  // 댓글 삭제
  const deleteReplyMutation = useMutation({
    mutationFn: async ({ noteId, replyId }: { noteId: string; replyId: string }) => {
      if (!session?.access_token) throw new Error('Unauthorized')
      
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
    onSuccess: () => {
      // 댓글 삭제 후 폴링 활성화
      queryClient.invalidateQueries({ queryKey: ['interview-notes', interviewId] })
      toast.success('댓글이 삭제되었습니다')
    },
    onError: (error) => {
      toast.error('댓글 삭제에 실패했습니다')
      // Error logged for debugging
    }
  })

  // Helper function
  const getNotesByScriptId = (scriptId: string) => {
    return notes.filter(note => 
      note.script_item_ids?.includes(scriptId)
    )
  }

  return {
    // 데이터
    notes,
    isLoading,
    error,
    isFetching,
    
    // 액션
    addNote: addNoteMutation.mutate,
    updateNote: updateNoteMutation.mutate,
    deleteNote: deleteNoteMutation.mutate,
    addReply: addReplyMutation.mutate,
    deleteReply: deleteReplyMutation.mutate,
    refetch,
    
    // 상태
    isAddingNote: addNoteMutation.isPending,
    isUpdatingNote: updateNoteMutation.isPending,
    isDeletingNote: deleteNoteMutation.isPending,
    isAddingReply: addReplyMutation.isPending,
    isDeletingReply: deleteReplyMutation.isPending,
    
    // 헬퍼
    getNotesByScriptId,
    isEmpty: notes.length === 0 && !isLoading,
    totalCount: notes.length
  }
}