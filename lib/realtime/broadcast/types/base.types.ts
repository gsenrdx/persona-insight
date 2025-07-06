/**
 * Base types for the Broadcast realtime system
 */

import type { RealtimeChannel } from '@supabase/supabase-js'

// Generic broadcast message structure
export interface BroadcastMessage<T = any> {
  id: string
  type: string
  action: BroadcastAction
  payload: T
  metadata: BroadcastMetadata
}

export interface BroadcastMetadata {
  userId: string
  timestamp: number
  version?: number
  clientId?: string
}

export enum BroadcastAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  SYNC = 'sync',
  PRESENCE = 'presence'
}

// Channel configuration
export interface ChannelConfig {
  name: string
  presence?: boolean
  ack?: boolean
  selfBroadcast?: boolean
}

// Handler types
export type MessageHandler<T = any> = (message: BroadcastMessage<T>) => void | Promise<void>
export type ErrorHandler = (error: Error) => void

// Channel state
export interface ChannelState {
  isConnected: boolean
  isSubscribed: boolean
  error?: Error
}

// Optimistic update tracking
export interface OptimisticUpdate<T = any> {
  tempId: string
  realId?: string
  data: T
  timestamp: number
  status: 'pending' | 'confirmed' | 'failed'
}

// Base channel interface
export interface BroadcastChannel {
  channel: RealtimeChannel
  state: ChannelState
  send<T>(type: string, action: BroadcastAction, payload: T): Promise<void>
  subscribe(): Promise<void>
  unsubscribe(): Promise<void>
}

// Presence types
export interface PresenceState {
  [key: string]: any
}

export interface PresenceUser {
  userId: string
  onlineAt: string
  presence: PresenceState
}