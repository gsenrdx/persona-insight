/**
 * Presence 관리를 담당하는 매니저
 * 메모리 효율적인 presence 추적 및 정리
 */

import { RealtimeChannel } from '@supabase/supabase-js'
import { EventEmitter } from 'events'

export interface PresenceUser {
  userId: string
  userName?: string
  email?: string
  interviewId?: string
  onlineAt: Date
  metadata?: Record<string, any>
}

export interface PresenceConfig {
  updateInterval?: number
  staleTimeout?: number
  maxUsersPerInterview?: number
}

export class PresenceManager extends EventEmitter {
  private config: Required<PresenceConfig>
  private channel: RealtimeChannel | null = null
  private currentPresence: PresenceUser | null = null
  private presenceMap = new Map<string, Map<string, PresenceUser>>() // interviewId -> userId -> user
  private updateTimer?: NodeJS.Timeout
  
  constructor(config: PresenceConfig = {}) {
    super()
    
    this.config = {
      updateInterval: 30000, // 30초
      staleTimeout: 90000, // 90초
      maxUsersPerInterview: 50,
      ...config
    }
  }
  
  /**
   * 채널에 presence 설정
   */
  attachToChannel(channel: RealtimeChannel): void {
    this.channel = channel
    
    // Presence 이벤트 구독
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        this.handlePresenceSync(state)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        this.handlePresenceJoin(key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        this.handlePresenceLeave(key, leftPresences)
      })
  }
  
  /**
   * 사용자 presence 추적 시작
   */
  async trackUser(user: PresenceUser): Promise<void> {
    if (!this.channel || this.channel.state !== 'joined') {
      throw new Error('Channel not connected')
    }
    
    this.currentPresence = {
      ...user,
      onlineAt: new Date()
    }
    
    await this.channel.track(this.serializePresence(this.currentPresence))
    
    // 주기적 업데이트 시작
    this.startPeriodicUpdate()
  }
  
  /**
   * 사용자 presence 추적 중지
   */
  async untrackUser(): Promise<void> {
    this.stopPeriodicUpdate()
    
    if (this.channel && this.channel.state === 'joined') {
      await this.channel.untrack()
    }
    
    this.currentPresence = null
  }
  
  /**
   * 특정 인터뷰의 현재 사용자 목록
   */
  getInterviewPresence(interviewId: string): PresenceUser[] {
    const users = this.presenceMap.get(interviewId)
    if (!users) return []
    
    // stale 사용자 필터링
    const now = Date.now()
    const activeUsers: PresenceUser[] = []
    
    users.forEach(user => {
      if (now - user.onlineAt.getTime() < this.config.staleTimeout) {
        activeUsers.push(user)
      }
    })
    
    return activeUsers
  }
  
  /**
   * 모든 presence 데이터
   */
  getAllPresence(): Map<string, PresenceUser[]> {
    const result = new Map<string, PresenceUser[]>()
    
    this.presenceMap.forEach((users, interviewId) => {
      const activeUsers = this.getInterviewPresence(interviewId)
      if (activeUsers.length > 0) {
        result.set(interviewId, activeUsers)
      }
    })
    
    return result
  }
  
  /**
   * 정리
   */
  destroy(): void {
    this.stopPeriodicUpdate()
    this.untrackUser()
    this.presenceMap.clear()
    this.removeAllListeners()
  }
  
  private handlePresenceSync(state: Record<string, any[]>): void {
    // 전체 presence 상태 재구성
    const newPresenceMap = new Map<string, Map<string, PresenceUser>>()
    
    Object.entries(state).forEach(([key, presences]) => {
      presences.forEach(presence => {
        const user = this.deserializePresence(presence)
        if (user && user.interviewId) {
          if (!newPresenceMap.has(user.interviewId)) {
            newPresenceMap.set(user.interviewId, new Map())
          }
          
          const interviewUsers = newPresenceMap.get(user.interviewId)!
          
          // 최대 사용자 수 제한
          if (interviewUsers.size < this.config.maxUsersPerInterview) {
            interviewUsers.set(user.userId, user)
          }
        }
      })
    })
    
    this.presenceMap = newPresenceMap
    this.emit('presenceSync', this.getAllPresence())
  }
  
  private handlePresenceJoin(key: string, newPresences: any[]): void {
    newPresences.forEach(presence => {
      const user = this.deserializePresence(presence)
      if (user && user.interviewId) {
        if (!this.presenceMap.has(user.interviewId)) {
          this.presenceMap.set(user.interviewId, new Map())
        }
        
        const interviewUsers = this.presenceMap.get(user.interviewId)!
        interviewUsers.set(user.userId, user)
        
        this.emit('userJoined', { interviewId: user.interviewId, user })
      }
    })
  }
  
  private handlePresenceLeave(key: string, leftPresences: any[]): void {
    leftPresences.forEach(presence => {
      const user = this.deserializePresence(presence)
      if (user && user.interviewId) {
        const interviewUsers = this.presenceMap.get(user.interviewId)
        if (interviewUsers) {
          interviewUsers.delete(user.userId)
          
          if (interviewUsers.size === 0) {
            this.presenceMap.delete(user.interviewId)
          }
          
          this.emit('userLeft', { interviewId: user.interviewId, user })
        }
      }
    })
  }
  
  private startPeriodicUpdate(): void {
    this.stopPeriodicUpdate()
    
    this.updateTimer = setInterval(async () => {
      if (this.currentPresence && this.channel?.state === 'joined') {
        this.currentPresence.onlineAt = new Date()
        
        try {
          await this.channel.track(this.serializePresence(this.currentPresence))
        } catch (error) {
          console.error('Failed to update presence:', error)
        }
      }
    }, this.config.updateInterval)
  }
  
  private stopPeriodicUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = undefined
    }
  }
  
  private serializePresence(user: PresenceUser): Record<string, any> {
    return {
      user_id: user.userId,
      user_name: user.userName,
      email: user.email,
      interview_id: user.interviewId,
      online_at: user.onlineAt.toISOString(),
      ...user.metadata
    }
  }
  
  private deserializePresence(data: any): PresenceUser | null {
    if (!data.user_id) return null
    
    return {
      userId: data.user_id,
      userName: data.user_name,
      email: data.email,
      interviewId: data.interview_id,
      onlineAt: new Date(data.online_at || Date.now()),
      metadata: Object.keys(data).reduce((acc, key) => {
        if (!['user_id', 'user_name', 'email', 'interview_id', 'online_at'].includes(key)) {
          acc[key] = data[key]
        }
        return acc
      }, {} as Record<string, any>)
    }
  }
}