/**
 * Centralized channel manager for all broadcast communications
 */

import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { 
  ChannelConfig, 
  ChannelState, 
  BroadcastMessage,
  MessageHandler,
  ErrorHandler
} from '../types'

export class BroadcastChannelManager {
  private static instance: BroadcastChannelManager
  private channels: Map<string, ManagedChannel> = new Map()
  
  private constructor() {}
  
  static getInstance(): BroadcastChannelManager {
    if (!BroadcastChannelManager.instance) {
      BroadcastChannelManager.instance = new BroadcastChannelManager()
    }
    return BroadcastChannelManager.instance
  }
  
  /**
   * Get or create a broadcast channel
   */
  getChannel(config: ChannelConfig): ManagedChannel {
    const existing = this.channels.get(config.name)
    if (existing) {
      // If channel exists but is not connected, return it for reuse
      const state = existing.getState()
      if (state.isSubscribed || state.isConnected) {
        return existing
      }
      // Remove disconnected channel and create new one
      this.channels.delete(config.name)
    }
    
    const channel = new ManagedChannel(config)
    this.channels.set(config.name, channel)
    return channel
  }
  
  /**
   * Remove a channel
   */
  async removeChannel(name: string): Promise<void> {
    const channel = this.channels.get(name)
    if (channel) {
      await channel.unsubscribe()
      this.channels.delete(name)
    }
  }
  
  /**
   * Clean up all channels
   */
  async cleanup(): Promise<void> {
    const promises = Array.from(this.channels.values()).map(channel => 
      channel.unsubscribe()
    )
    await Promise.all(promises)
    this.channels.clear()
  }
}

/**
 * Managed broadcast channel with automatic reconnection and error handling
 */
export class ManagedChannel {
  private channel: RealtimeChannel | null = null
  private config: ChannelConfig
  private state: ChannelState & { isSubscribing?: boolean } = {
    isConnected: false,
    isSubscribed: false,
    isSubscribing: false
  }
  private handlers: Map<string, Set<MessageHandler>> = new Map()
  private errorHandlers: Set<ErrorHandler> = new Set()
  private reconnectTimer?: NodeJS.Timeout
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private channelPromise: Promise<RealtimeChannel> | null = null
  
  constructor(config: ChannelConfig) {
    this.config = config
  }
  
  private async createChannel(): Promise<RealtimeChannel> {
    // Get current session for auth
    const { data: { session } } = await supabase.auth.getSession()
    
    const channel = supabase.channel(this.config.name, {
      config: {
        broadcast: {
          self: this.config.selfBroadcast ?? false,
          ack: this.config.ack ?? false
        },
        presence: {
          key: this.config.presence ? 'presence' : undefined
        }
      },
      params: session?.access_token ? {
        // Add JWT token for authentication if available
        access_token: session.access_token
      } : {}
    })
    
    // Set up broadcast listener
    channel.on('broadcast', { event: '*' }, (payload) => {
      this.handleBroadcast(payload)
    })
    
    return channel
  }
  
  /**
   * Get or create the channel
   */
  private async getChannel(): Promise<RealtimeChannel> {
    if (this.channel) {
      return this.channel
    }
    
    if (!this.channelPromise) {
      this.channelPromise = this.createChannel()
    }
    
    this.channel = await this.channelPromise
    return this.channel
  }
  
  /**
   * Subscribe to the channel
   */
  async subscribe(): Promise<void> {
    // Check if already subscribed or subscribing
    if (this.state.isSubscribed || this.state.isSubscribing) {
      return Promise.resolve()
    }
    
    this.state.isSubscribing = true
    
    const channel = await this.getChannel()
    
    return new Promise((resolve, reject) => {
      channel.subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          this.state.isConnected = true
          this.state.isSubscribed = true
          this.state.isSubscribing = false
          this.reconnectAttempts = 0
          resolve()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.state.isConnected = false
          this.state.isSubscribing = false
          this.state.error = error || new Error('Channel subscription failed')
          this.handleError(this.state.error)
          this.scheduleReconnect()
          reject(this.state.error)
        } else if (status === 'CLOSED') {
          this.state.isConnected = false
          this.state.isSubscribed = false
          this.state.isSubscribing = false
        }
      })
    })
  }
  
  /**
   * Unsubscribe from the channel
   */
  async unsubscribe(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
    
    if (this.channel) {
      await supabase.removeChannel(this.channel)
    }
    
    this.state.isConnected = false
    this.state.isSubscribed = false
    this.state.isSubscribing = false
    this.handlers.clear()
    this.errorHandlers.clear()
  }
  
  /**
   * Send a broadcast message
   */
  async send<T>(message: BroadcastMessage<T>): Promise<void> {
    if (!this.state.isConnected) {
      throw new Error('Channel is not connected')
    }
    
    const channel = await this.getChannel()
    const result = await channel.send({
      type: 'broadcast',
      event: message.type,
      payload: message
    })
    
    if (result !== 'ok') {
      throw new Error(`Failed to send message: ${result}`)
    }
  }
  
  /**
   * Add a message handler
   */
  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    
    this.handlers.get(type)!.add(handler)
    
    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          this.handlers.delete(type)
        }
      }
    }
  }
  
  /**
   * Add an error handler
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler)
    return () => {
      this.errorHandlers.delete(handler)
    }
  }
  
  /**
   * Get channel state
   */
  getState(): ChannelState {
    return { ...this.state }
  }
  
  /**
   * Get the underlying Supabase channel (for presence)
   */
  async getSupabaseChannel(): Promise<RealtimeChannel> {
    return this.getChannel()
  }
  
  private handleBroadcast(payload: any): void {
    const message = payload.payload as BroadcastMessage
    const handlers = this.handlers.get(message.type)
    
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message)
        } catch (error) {
          this.handleError(error as Error)
        }
      })
    }
  }
  
  private handleError(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error)
      } catch (e) {
        console.error('Error in error handler:', e)
      }
    })
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    this.reconnectAttempts++
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = undefined
      try {
        await this.subscribe()
      } catch (error) {
        // Will retry again
      }
    }, delay)
  }
}

// Export singleton instance
export const channelManager = BroadcastChannelManager.getInstance()