/**
 * WebSocket 연결 관리를 담당하는 핵심 모듈
 * 단일 책임 원칙에 따라 연결 생명주기만 관리
 */

import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { EventEmitter } from 'events'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface ConnectionConfig {
  channelName: string
  maxReconnectAttempts?: number
  reconnectDelay?: number
  heartbeatInterval?: number
  enableAutoReconnect?: boolean
}

export interface ConnectionStats {
  connectedAt?: Date
  disconnectedAt?: Date
  reconnectAttempts: number
  lastError?: Error
  latency: number
}

export class ConnectionManager extends EventEmitter {
  private channel: RealtimeChannel | null = null
  private state: ConnectionState = 'disconnected'
  private config: Required<ConnectionConfig>
  private stats: ConnectionStats = {
    reconnectAttempts: 0,
    latency: 0
  }
  
  private reconnectTimer?: NodeJS.Timeout
  private heartbeatTimer?: NodeJS.Timeout
  private isDestroyed = false
  
  constructor(config: ConnectionConfig) {
    super()
    
    this.config = {
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      enableAutoReconnect: true,
      ...config
    }
  }
  
  /**
   * 연결 시작
   */
  async connect(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('ConnectionManager is destroyed')
    }
    
    if (this.state === 'connecting' || this.state === 'connected') {
      return
    }
    
    this.setState('connecting')
    
    try {
      // 기존 채널 정리
      if (this.channel) {
        await this.cleanup()
      }
      
      // Supabase에서 기존 채널 확인
      const existingChannels = supabase.getChannels()
      const existingChannel = existingChannels.find(ch => 
        ch.topic === `realtime:${this.config.channelName}` || 
        ch.topic === this.config.channelName
      )
      
      if (existingChannel) {
        // 기존 채널이 이미 구독 중이거나 구독됨
        if (existingChannel.state === 'joined' || existingChannel.state === 'joining') {
          this.channel = existingChannel
          
          // 이미 joined 상태면 바로 성공
          if (existingChannel.state === 'joined') {
            this.onConnected()
            return
          }
          
          // joining 상태면 완료 대기
          await new Promise<void>((resolve, reject) => {
            const checkState = setInterval(() => {
              if (existingChannel.state === 'joined') {
                clearInterval(checkState)
                this.channel = existingChannel
                this.onConnected()
                resolve()
              } else if (existingChannel.state === 'closed' || existingChannel.state === 'errored') {
                clearInterval(checkState)
                reject(new Error(`Existing channel failed: ${existingChannel.state}`))
              }
            }, 100)
            
            // 10초 타임아웃
            setTimeout(() => {
              clearInterval(checkState)
              reject(new Error('Timeout waiting for existing channel'))
            }, 10000)
          })
          return
        } else {
          // 채널이 닫혀있으면 제거하고 새로 생성
          supabase.removeChannel(existingChannel)
        }
      }
      
      // 새 채널 생성
      this.channel = supabase.channel(this.config.channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: this.config.channelName }
        }
      })
      
      // 구독
      await new Promise<void>((resolve, reject) => {
        // Check if already subscribing or subscribed
        const currentState = this.channel!.state
        if (currentState === 'subscribed') {
          this.onConnected()
          resolve()
          return
        }
        
        if (currentState === 'subscribing') {
          // Wait for subscription to complete
          const checkInterval = setInterval(() => {
            const state = this.channel!.state
            if (state === 'subscribed') {
              clearInterval(checkInterval)
              this.onConnected()
              resolve()
            } else if (state === 'closed' || state === 'errored') {
              clearInterval(checkInterval)
              reject(new Error(`Connection failed: ${state}`))
            }
          }, 100)
          return
        }
        
        this.channel!.subscribe((status, error) => {
          if (status === 'SUBSCRIBED') {
            this.onConnected()
            resolve()
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            reject(new Error(error?.message || `Connection failed: ${status}`))
          }
        })
      })
      
    } catch (error) {
      this.onError(error as Error)
      throw error
    }
  }
  
  /**
   * 연결 종료
   */
  async disconnect(): Promise<void> {
    if (this.state === 'disconnected') return
    
    this.setState('disconnected')
    await this.cleanup()
  }
  
  /**
   * 연결 상태 반환
   */
  getState(): ConnectionState {
    return this.state
  }
  
  /**
   * 연결 통계 반환
   */
  getStats(): Readonly<ConnectionStats> {
    return { ...this.stats }
  }
  
  /**
   * 채널 반환 (상위 모듈에서 사용)
   */
  getChannel(): RealtimeChannel | null {
    return this.channel
  }
  
  /**
   * 완전 파괴
   */
  destroy(): void {
    this.isDestroyed = true
    this.disconnect()
    this.removeAllListeners()
  }
  
  private setState(state: ConnectionState): void {
    if (this.state === state) return
    
    const prevState = this.state
    this.state = state
    this.emit('stateChange', { from: prevState, to: state })
  }
  
  private onConnected(): void {
    this.setState('connected')
    this.stats.connectedAt = new Date()
    this.stats.reconnectAttempts = 0
    
    this.startHeartbeat()
    this.emit('connected')
  }
  
  private onError(error: Error): void {
    this.setState('error')
    this.stats.lastError = error
    this.emit('error', error)
    
    if (this.config.enableAutoReconnect && 
        this.stats.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect()
    }
  }
  
  private onDisconnected(): void {
    this.setState('disconnected')
    this.stats.disconnectedAt = new Date()
    this.stopHeartbeat()
    this.emit('disconnected')
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    
    // 이미 연결 중이면 재연결 시도하지 않음
    if (this.state === 'connecting') {
      return
    }
    
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.stats.reconnectAttempts),
      30000 // 최대 30초
    )
    
    this.stats.reconnectAttempts++
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isDestroyed && this.state !== 'connected' && this.state !== 'connecting') {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error.message)
          // 에러 발생시 다시 스케줄링하지 않음 (onError에서 처리)
        })
      }
    }, delay)
  }
  
  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      if (this.channel?.state !== 'joined') {
        this.onDisconnected()
        if (this.config.enableAutoReconnect) {
          this.connect()
        }
      } else {
        // 간단한 latency 체크
        const start = Date.now()
        this.channel.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { timestamp: start }
        }).then(() => {
          this.stats.latency = Date.now() - start
        }).catch(() => {
          // 하트비트 실패
          this.onDisconnected()
        })
      }
    }, this.config.heartbeatInterval)
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }
  
  private async cleanup(): Promise<void> {
    this.stopHeartbeat()
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
    
    if (this.channel) {
      try {
        // Only unsubscribe if we're actually subscribed
        if (this.channel.state === 'joined' || this.channel.state === 'joining') {
          await this.channel.unsubscribe()
        }
        
        // Remove channel from Supabase only if it's our channel
        const existingChannels = supabase.getChannels()
        const isOurChannel = existingChannels.some(ch => 
          ch === this.channel && 
          (ch.topic === `realtime:${this.config.channelName}` || 
           ch.topic === this.config.channelName)
        )
        
        if (isOurChannel) {
          supabase.removeChannel(this.channel)
        }
      } catch (error) {
        // 정리 중 오류 무시
        // 정리 중 오류는 조용히 무시
      }
      this.channel = null
    }
  }
}