/**
 * 데이터 동기화를 담당하는 매니저
 * 채널과 데이터 로직을 분리하여 관리
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { EventEmitter } from 'events'
import { supabase } from '@/lib/supabase'

export interface SyncConfig {
  projectId: string
  companyId: string
  enableBatching?: boolean
  batchDelay?: number
  maxRetries?: number
}

export interface SyncState {
  lastSyncedAt?: Date
  pendingChanges: number
  isSyncing: boolean
  errors: Error[]
}

interface BatchedChange {
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  payload: any
  timestamp: number
}

export class DataSyncManager extends EventEmitter {
  private config: Required<SyncConfig>
  private state: SyncState = {
    pendingChanges: 0,
    isSyncing: false,
    errors: []
  }
  
  private batchedChanges: BatchedChange[] = []
  private batchTimer?: NodeJS.Timeout
  private channel: RealtimeChannel | null = null
  
  constructor(config: SyncConfig) {
    super()
    
    this.config = {
      enableBatching: true,
      batchDelay: 100, // 100ms 배치 지연
      maxRetries: 3,
      ...config
    }
  }
  
  /**
   * 채널에 동기화 설정
   */
  attachToChannel(channel: RealtimeChannel): void {
    this.channel = channel
    
    // 테이블별 변경사항 구독
    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'interviews',
        filter: `project_id=eq.${this.config.projectId}`
      }, (payload) => this.handleChange('interviews', payload))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'interview_notes'
      }, (payload) => this.handleChange('interview_notes', payload))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'interview_note_replies'
      }, (payload) => this.handleChange('interview_note_replies', payload))
  }
  
  /**
   * 초기 데이터 로드
   */
  async loadInitialData(): Promise<void> {
    this.state.isSyncing = true
    this.emit('syncStart')
    
    try {
      // 병렬로 데이터 로드
      const [interviews, notes] = await Promise.all([
        this.loadInterviews(),
        this.loadNotes()
      ])
      
      this.state.lastSyncedAt = new Date()
      this.emit('dataLoaded', { interviews, notes })
    } catch (error) {
      this.state.errors.push(error as Error)
      this.emit('syncError', error)
      throw error
    } finally {
      this.state.isSyncing = false
      this.emit('syncEnd')
    }
  }
  
  /**
   * 변경사항 강제 동기화
   */
  async forceSync(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = undefined
    }
    
    await this.processBatchedChanges()
    await this.loadInitialData()
  }
  
  /**
   * 동기화 상태 조회
   */
  getSyncState(): Readonly<SyncState> {
    return { ...this.state }
  }
  
  /**
   * 정리
   */
  destroy(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }
    this.batchedChanges = []
    this.removeAllListeners()
  }
  
  private handleChange(table: string, payload: RealtimePostgresChangesPayload<any>): void {
    const change: BatchedChange = {
      table,
      eventType: payload.eventType,
      payload,
      timestamp: Date.now()
    }
    
    if (this.config.enableBatching) {
      this.batchedChanges.push(change)
      this.scheduleBatchProcess()
    } else {
      this.processChange(change)
    }
  }
  
  private scheduleBatchProcess(): void {
    if (this.batchTimer) return
    
    this.batchTimer = setTimeout(() => {
      this.batchTimer = undefined
      this.processBatchedChanges()
    }, this.config.batchDelay)
  }
  
  private async processBatchedChanges(): Promise<void> {
    if (this.batchedChanges.length === 0) return
    
    const changes = [...this.batchedChanges]
    this.batchedChanges = []
    
    // 테이블별로 그룹화
    const grouped = changes.reduce((acc, change) => {
      if (!acc[change.table]) acc[change.table] = []
      acc[change.table].push(change)
      return acc
    }, {} as Record<string, BatchedChange[]>)
    
    // 각 테이블별로 처리
    for (const [table, tableChanges] of Object.entries(grouped)) {
      const inserts = tableChanges.filter(c => c.eventType === 'INSERT')
      const updates = tableChanges.filter(c => c.eventType === 'UPDATE')
      const deletes = tableChanges.filter(c => c.eventType === 'DELETE')
      
      // 배치로 emit
      if (inserts.length > 0) {
        this.emit(`${table}:batchInsert`, inserts.map(c => c.payload))
      }
      if (updates.length > 0) {
        this.emit(`${table}:batchUpdate`, updates.map(c => c.payload))
      }
      if (deletes.length > 0) {
        this.emit(`${table}:batchDelete`, deletes.map(c => c.payload))
      }
    }
  }
  
  private processChange(change: BatchedChange): void {
    const { table, eventType, payload } = change
    this.emit(`${table}:${eventType.toLowerCase()}`, payload)
  }
  
  private async loadInterviews() {
    const { data, error } = await supabase
      .from('interviews')
      .select(`
        *,
        created_by_profile:profiles!interviews_created_by_fkey(id, name),
        interview_notes(count),
        ai_persona_definition:persona_definitions!ai_persona_match(*),
        confirmed_persona_definition:persona_definitions!interviews_confirmed_persona_definition_id_fkey(*)
      `)
      .eq('project_id', this.config.projectId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }
  
  private async loadNotes() {
    const { data: interviews } = await supabase
      .from('interviews')
      .select('id')
      .eq('project_id', this.config.projectId)
    
    if (!interviews || interviews.length === 0) return []
    
    const interviewIds = interviews.map(i => i.id)
    
    const { data, error } = await supabase
      .from('interview_notes')
      .select(`
        *,
        created_by_profile:profiles!created_by(id, name, avatar_url),
        replies:interview_note_replies(
          *,
          created_by_profile:profiles!created_by(id, name, avatar_url)
        )
      `)
      .in('interview_id', interviewIds)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }
}