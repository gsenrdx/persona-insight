/**
 * Factory functions for creating broadcast messages
 */

import { v4 as uuidv4 } from 'uuid'
import { BroadcastAction } from '../types'
import type { 
  BroadcastMessage, 
  BroadcastMetadata 
} from '../types'

export class MessageFactory {
  /**
   * Create a broadcast message
   */
  static create<T>(
    type: string,
    action: BroadcastAction,
    payload: T,
    userId: string,
    additionalMetadata?: Partial<BroadcastMetadata>
  ): BroadcastMessage<T> {
    return {
      id: uuidv4(),
      type,
      action,
      payload,
      metadata: {
        userId,
        timestamp: Date.now(),
        ...additionalMetadata
      }
    }
  }
  
  /**
   * Create a CREATE action message
   */
  static createAction<T>(
    type: string,
    payload: T,
    userId: string,
    metadata?: Partial<BroadcastMetadata>
  ): BroadcastMessage<T> {
    return this.create(type, BroadcastAction.CREATE, payload, userId, metadata)
  }
  
  /**
   * Create an UPDATE action message
   */
  static updateAction<T>(
    type: string,
    payload: T,
    userId: string,
    metadata?: Partial<BroadcastMetadata>
  ): BroadcastMessage<T> {
    return this.create(type, BroadcastAction.UPDATE, payload, userId, metadata)
  }
  
  /**
   * Create a DELETE action message
   */
  static deleteAction<T>(
    type: string,
    payload: T,
    userId: string,
    metadata?: Partial<BroadcastMetadata>
  ): BroadcastMessage<T> {
    return this.create(type, BroadcastAction.DELETE, payload, userId, metadata)
  }
  
  /**
   * Create a SYNC action message
   */
  static syncAction<T>(
    type: string,
    payload: T,
    userId: string,
    metadata?: Partial<BroadcastMetadata>
  ): BroadcastMessage<T> {
    return this.create(type, BroadcastAction.SYNC, payload, userId, metadata)
  }
  
  /**
   * Create a PRESENCE action message
   */
  static presenceAction<T>(
    type: string,
    payload: T,
    userId: string,
    metadata?: Partial<BroadcastMetadata>
  ): BroadcastMessage<T> {
    return this.create(type, BroadcastAction.PRESENCE, payload, userId, metadata)
  }
}