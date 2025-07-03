'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { channelRegistry } from './core/channel-registry'
import { DataSyncManager } from './core/data-sync-manager'
import { PresenceManager } from './core/presence-manager'
import { Interview } from '@/types/interview'
import { InterviewNote } from '@/types/interview-notes'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'

interface RealtimeState {
  interviews: Interview[]
  notes: Record<string, InterviewNote[]>
  presence: Record<string, any[]>
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error'
  isLoading: boolean
  error: Error | null
}

interface RealtimeContextValue extends RealtimeState {
  subscribeToProject: (projectId: string) => Promise<void>
  unsubscribe: () => void
  trackPresence: (interviewId: string) => Promise<void>
  untrackPresence: () => Promise<void>
  refresh: () => Promise<void>
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

export function ImprovedRealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth()
  
  const [state, setState] = useState<RealtimeState>({
    interviews: [],
    notes: {},
    presence: {},
    connectionState: 'disconnected',
    isLoading: false,
    error: null
  })
  
  // 토큰 갱신을 위한 ref
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // 매니저 인스턴스 refs
  const dataSyncRef = useRef<DataSyncManager | null>(null)
  const presenceRef = useRef<PresenceManager | null>(null)
  const currentProjectRef = useRef<string | null>(null)
  
  // 데이터 변환 함수 (메모이제이션)
  const transformInterview = useCallback((row: any): Interview => ({
    id: row.id,
    company_id: row.company_id,
    project_id: row.project_id,
    raw_text: row.raw_text,
    cleaned_script: row.cleaned_script,
    metadata: row.metadata,
    summary: row.summary,
    title: row.title,
    interview_date: row.interview_date,
    persona_id: row.persona_id,
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    session_info: row.session_info,
    interviewee_profile: row.interviewee_profile,
    interview_quality_assessment: row.interview_quality_assessment,
    key_takeaways: row.key_takeaways,
    primary_pain_points: row.primary_pain_points,
    primary_needs: row.primary_needs,
    hmw_questions: row.hmw_questions,
    script_sections: row.script_sections,
    ai_persona_match: row.ai_persona_match,
    ai_persona_explanation: row.ai_persona_explanation,
    ai_persona_definition: row.ai_persona_definition,
    confirmed_persona_definition_id: row.confirmed_persona_definition_id,
    confirmed_persona_definition: row.confirmed_persona_definition,
    created_by_profile: row.created_by_profile,
    note_count: row.interview_notes?.[0]?.count || 0
  }), [])
  
  const transformNote = useCallback((row: any): InterviewNote => ({
    id: row.id,
    interview_id: row.interview_id,
    script_item_ids: row.script_item_ids || [],
    content: row.content,
    created_by: row.created_by,
    company_id: row.company_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_deleted: row.is_deleted || false,
    created_by_profile: row.created_by_profile,
    replies: row.replies?.filter((r: any) => !r.is_deleted) || []
  }), [])
  
  // 프로젝트 구독
  const subscribeToProject = useCallback(async (projectId: string) => {
    if (!profile?.company_id) {
      setState(prev => ({ ...prev, error: new Error('No company context') }))
      return
    }
    
    // 이미 같은 프로젝트에 구독 중이면 스킵
    if (currentProjectRef.current === projectId && state.connectionState === 'connected') {
      return
    }
    
    // 이전 구독 정리
    if (currentProjectRef.current && currentProjectRef.current !== projectId) {
      await unsubscribe()
    }
    
    currentProjectRef.current = projectId
    setState(prev => ({ ...prev, isLoading: true, connectionState: 'connecting' }))
    
    try {
      // 채널 가져오기 또는 생성
      const channel = await channelRegistry.getOrCreateChannel(profile.company_id, projectId)
      
      // 데이터 동기화 매니저 설정
      const dataSync = new DataSyncManager({
        projectId,
        companyId: profile.company_id,
        enableBatching: true,
        batchDelay: 50
      })
      
      dataSync.attachToChannel(channel)
      
      // 데이터 로드 이벤트 리스너
      dataSync.on('dataLoaded', ({ interviews, notes }) => {
        const transformedInterviews = interviews.map(transformInterview)
        const transformedNotes = notes.reduce((acc: Record<string, InterviewNote[]>, note: any) => {
          const transformed = transformNote(note)
          if (!acc[transformed.interview_id]) {
            acc[transformed.interview_id] = []
          }
          acc[transformed.interview_id].push(transformed)
          return acc
        }, {})
        
        setState(prev => ({
          ...prev,
          interviews: transformedInterviews,
          notes: transformedNotes,
          isLoading: false,
          connectionState: 'connected'
        }))
      })
      
      // 배치 업데이트 핸들러
      dataSync.on('interviews:batchInsert', (payloads) => {
        // TODO: Implement batch insert logic
      })
      
      dataSync.on('interviews:batchUpdate', (payloads) => {
        // TODO: Implement batch update logic
      })
      
      dataSync.on('interviews:batchDelete', (payloads) => {
        // TODO: Implement batch delete logic
      })
      
      // Presence 매니저 설정
      const presence = new PresenceManager({
        updateInterval: 30000,
        staleTimeout: 90000
      })
      
      presence.attachToChannel(channel)
      
      presence.on('presenceSync', (presenceMap) => {
        const presenceObj: Record<string, any[]> = {}
        presenceMap.forEach((users, interviewId) => {
          presenceObj[interviewId] = users
        })
        setState(prev => ({ ...prev, presence: presenceObj }))
      })
      
      // 초기 데이터 로드
      await dataSync.loadInitialData()
      
      // refs 저장
      dataSyncRef.current = dataSync
      presenceRef.current = presence
      
      // 토큰 갱신 시작
      startTokenRefresh()
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false,
        connectionState: 'error'
      }))
      console.error('Failed to subscribe to project:', error)
    }
  }, [profile?.company_id, state.connectionState, transformInterview, transformNote])
  
  // 구독 해제
  const unsubscribe = useCallback(async () => {
    if (currentProjectRef.current && profile?.company_id) {
      // 매니저 정리
      if (dataSyncRef.current) {
        dataSyncRef.current.destroy()
        dataSyncRef.current = null
      }
      
      if (presenceRef.current) {
        presenceRef.current.destroy()
        presenceRef.current = null
      }
      
      // 채널 참조 해제 (채널은 유지됨)
      channelRegistry.releaseChannel(profile.company_id, currentProjectRef.current)
      
      currentProjectRef.current = null
      
      // 토큰 갱신 정리
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current)
        tokenRefreshIntervalRef.current = null
      }
      
      setState({
        interviews: [],
        notes: {},
        presence: {},
        connectionState: 'disconnected',
        isLoading: false,
        error: null
      })
    }
  }, [profile?.company_id])
  
  // Presence 추적
  const trackPresence = useCallback(async (interviewId: string) => {
    if (!presenceRef.current || !user || !profile) return
    
    await presenceRef.current.trackUser({
      userId: user.id,
      userName: profile.name || undefined,
      email: user.email || undefined,
      interviewId,
      onlineAt: new Date()
    })
  }, [user, profile])
  
  const untrackPresence = useCallback(async () => {
    if (!presenceRef.current) return
    await presenceRef.current.untrackUser()
  }, [])
  
  // 데이터 새로고침
  const refresh = useCallback(async () => {
    if (!dataSyncRef.current) return
    await dataSyncRef.current.forceSync()
  }, [])
  
  // 토큰 갱신 시작
  const startTokenRefresh = useCallback(() => {
    // 기존 interval 정리
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current)
    }
    
    // 50분마다 토큰 갱신 (1시간 만료 전에 갱신)
    tokenRefreshIntervalRef.current = setInterval(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        
        if (session) {
          // 세션 갱신
          const { data, error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError) throw refreshError
          
          // Realtime 연결에 새 토큰 적용
          if (data.session) {
            supabase.realtime.setAuth(data.session.access_token)
          }
        }
      } catch (error) {
        console.error('Token refresh failed:', error)
      }
    }, 50 * 60 * 1000) // 50분
  }, [])
  
  // 컴포넌트 언마운트시 정리
  useEffect(() => {
    return () => {
      unsubscribe()
      // 토큰 갱신 정리
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current)
      }
    }
  }, [unsubscribe])
  
  // Context value 메모이제이션
  const contextValue = useMemo<RealtimeContextValue>(() => ({
    ...state,
    subscribeToProject,
    unsubscribe,
    trackPresence,
    untrackPresence,
    refresh
  }), [state, subscribeToProject, unsubscribe, trackPresence, untrackPresence, refresh])
  
  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  )
}

// Hook exports
export function useImprovedRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error('useImprovedRealtime must be used within ImprovedRealtimeProvider')
  }
  return context
}

export function useRealtimeInterviews() {
  const { interviews } = useImprovedRealtime()
  return interviews
}

export function useRealtimeInterview(interviewId: string) {
  const { interviews } = useImprovedRealtime()
  return interviews.find(i => i.id === interviewId)
}

export function useRealtimeInterviewNotes(interviewId: string) {
  const { notes } = useImprovedRealtime()
  return notes[interviewId] || []
}

export function useRealtimePresence(interviewId: string) {
  const { presence } = useImprovedRealtime()
  return presence[interviewId] || []
}