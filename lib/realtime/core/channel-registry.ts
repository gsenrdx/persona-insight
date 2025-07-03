/**
 * 회사별 채널을 중앙에서 관리하는 레지스트리
 * 싱글톤 패턴으로 전역에서 단일 인스턴스 사용
 */

import { ConnectionManager } from './connection-manager'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface ChannelInfo {
  companyId: string
  projectId?: string
  connectionManager: ConnectionManager
  createdAt: Date
  lastAccessedAt: Date
  referenceCount: number
}

export class ChannelRegistry {
  private static instance: ChannelRegistry
  private channels = new Map<string, ChannelInfo>()
  
  // 채널 정리를 위한 설정
  private readonly MAX_IDLE_TIME = 30 * 60 * 1000 // 30분
  private readonly MAX_CHANNELS = 50 // 최대 채널 수
  private cleanupTimer?: NodeJS.Timeout
  
  private constructor() {
    // 주기적 정리 시작
    this.startPeriodicCleanup()
  }
  
  static getInstance(): ChannelRegistry {
    if (!ChannelRegistry.instance) {
      ChannelRegistry.instance = new ChannelRegistry()
    }
    return ChannelRegistry.instance
  }
  
  /**
   * 채널 가져오기 또는 생성
   */
  async getOrCreateChannel(companyId: string, projectId?: string): Promise<RealtimeChannel> {
    const channelKey = this.getChannelKey(companyId, projectId)
    
    // 기존 채널 확인
    const existing = this.channels.get(channelKey)
    if (existing) {
      existing.lastAccessedAt = new Date()
      existing.referenceCount++
      
      const state = existing.connectionManager.getState()
      const channel = existing.connectionManager.getChannel()
      
      // 이미 연결되어 있으면 바로 반환
      if (state === 'connected' && channel) {
        return channel
      }
      
      // 연결 중이면 기다림
      if (state === 'connecting') {
        // 연결 완료까지 대기
        let attempts = 0
        while (existing.connectionManager.getState() === 'connecting' && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
        
        if (existing.connectionManager.getState() === 'connected') {
          return existing.connectionManager.getChannel()!
        }
      }
      
      // 연결되어 있지 않으면 재연결
      if (existing.connectionManager.getState() !== 'connected') {
        await existing.connectionManager.connect()
      }
      
      return existing.connectionManager.getChannel()!
    }
    
    // 채널 수 제한 확인
    if (this.channels.size >= this.MAX_CHANNELS) {
      this.cleanupIdleChannels()
    }
    
    // 새 채널 생성
    const connectionManager = new ConnectionManager({
      channelName: channelKey,
      maxReconnectAttempts: 3,
      heartbeatInterval: 45000, // 45초 (브라우저 백그라운드 고려)
      enableAutoReconnect: true
    })
    
    // 연결 상태 이벤트 리스닝
    connectionManager.on('disconnected', () => {
      console.log(`Channel ${channelKey} disconnected`)
    })
    
    connectionManager.on('error', (error) => {
      console.error(`Channel ${channelKey} error:`, error)
    })
    
    // 연결
    await connectionManager.connect()
    
    // 레지스트리에 등록
    this.channels.set(channelKey, {
      companyId,
      projectId,
      connectionManager,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      referenceCount: 1
    })
    
    return connectionManager.getChannel()!
  }
  
  /**
   * 채널 참조 해제
   */
  releaseChannel(companyId: string, projectId?: string): void {
    const channelKey = this.getChannelKey(companyId, projectId)
    const channelInfo = this.channels.get(channelKey)
    
    if (channelInfo) {
      channelInfo.referenceCount--
      
      // 참조가 0이 되어도 바로 삭제하지 않음 (재사용 가능성)
      if (channelInfo.referenceCount <= 0) {
        channelInfo.lastAccessedAt = new Date()
      }
    }
  }
  
  /**
   * 특정 채널 강제 종료
   */
  async closeChannel(companyId: string, projectId?: string): Promise<void> {
    const channelKey = this.getChannelKey(companyId, projectId)
    const channelInfo = this.channels.get(channelKey)
    
    if (channelInfo) {
      await channelInfo.connectionManager.disconnect()
      channelInfo.connectionManager.destroy()
      this.channels.delete(channelKey)
    }
  }
  
  /**
   * 모든 채널 종료
   */
  async closeAllChannels(): Promise<void> {
    const promises = Array.from(this.channels.values()).map(info => 
      info.connectionManager.disconnect()
    )
    
    await Promise.all(promises)
    
    this.channels.forEach(info => info.connectionManager.destroy())
    this.channels.clear()
  }
  
  /**
   * 채널 상태 조회
   */
  getChannelStats() {
    const stats = Array.from(this.channels.entries()).map(([key, info]) => ({
      key,
      companyId: info.companyId,
      projectId: info.projectId,
      state: info.connectionManager.getState(),
      stats: info.connectionManager.getStats(),
      createdAt: info.createdAt,
      lastAccessedAt: info.lastAccessedAt,
      referenceCount: info.referenceCount
    }))
    
    return {
      totalChannels: this.channels.size,
      channels: stats
    }
  }
  
  private getChannelKey(companyId: string, projectId?: string): string {
    return projectId ? `company-${companyId}-project-${projectId}` : `company-${companyId}`
  }
  
  private cleanupIdleChannels(): void {
    const now = Date.now()
    const toRemove: string[] = []
    
    this.channels.forEach((info, key) => {
      // 참조가 없고 유휴 시간이 초과된 채널
      if (info.referenceCount <= 0 && 
          now - info.lastAccessedAt.getTime() > this.MAX_IDLE_TIME) {
        toRemove.push(key)
      }
    })
    
    // 가장 오래된 것부터 제거
    toRemove.sort((a, b) => {
      const aTime = this.channels.get(a)!.lastAccessedAt.getTime()
      const bTime = this.channels.get(b)!.lastAccessedAt.getTime()
      return aTime - bTime
    })
    
    // 최대 채널 수의 20% 정리
    const removeCount = Math.max(1, Math.floor(this.MAX_CHANNELS * 0.2))
    toRemove.slice(0, removeCount).forEach(key => {
      const info = this.channels.get(key)!
      info.connectionManager.disconnect()
      info.connectionManager.destroy()
      this.channels.delete(key)
    })
  }
  
  private startPeriodicCleanup(): void {
    // 10분마다 정리
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleChannels()
    }, 10 * 60 * 1000)
  }
  
  /**
   * 레지스트리 종료 (앱 종료시)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.closeAllChannels()
  }
}

// 전역 인스턴스 export
export const channelRegistry = ChannelRegistry.getInstance()

// 브라우저 환경에서 페이지 언로드시 정리
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    channelRegistry.destroy()
  })
}