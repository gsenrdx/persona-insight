/**
 * Base message handler with optimistic update support
 */

import type { 
  BroadcastMessage, 
  OptimisticUpdate,
  BroadcastAction 
} from '../types'

export abstract class BaseMessageHandler<T> {
  protected optimisticUpdates: Map<string, OptimisticUpdate<T>> = new Map()
  protected idMapping: Map<string, string> = new Map() // tempId -> realId
  
  /**
   * Handle incoming broadcast message
   */
  abstract handleMessage(message: BroadcastMessage<T>): void | Promise<void>
  
  /**
   * Add optimistic update
   */
  addOptimisticUpdate(tempId: string, data: T): void {
    this.optimisticUpdates.set(tempId, {
      tempId,
      data,
      timestamp: Date.now(),
      status: 'pending'
    })
  }
  
  /**
   * Confirm optimistic update with real ID
   */
  confirmOptimisticUpdate(tempId: string, realId: string): void {
    const update = this.optimisticUpdates.get(tempId)
    if (update) {
      update.realId = realId
      update.status = 'confirmed'
      this.idMapping.set(realId, tempId)
      
      // Clean up after a delay
      setTimeout(() => {
        this.optimisticUpdates.delete(tempId)
        this.idMapping.delete(realId)
      }, 5000)
    }
  }
  
  /**
   * Mark optimistic update as failed
   */
  failOptimisticUpdate(tempId: string): void {
    const update = this.optimisticUpdates.get(tempId)
    if (update) {
      update.status = 'failed'
      // Remove immediately
      this.optimisticUpdates.delete(tempId)
    }
  }
  
  /**
   * Check if an update is duplicate
   */
  isDuplicate(message: BroadcastMessage<T>): boolean {
    // Check if this is our own optimistic update
    const tempId = this.idMapping.get(message.payload.id || '')
    if (tempId && this.optimisticUpdates.has(tempId)) {
      return true
    }
    
    // Check by content similarity (override in subclasses)
    return false
  }
  
  /**
   * Clean up old optimistic updates
   */
  cleanupOptimisticUpdates(maxAge: number = 10000): void {
    const now = Date.now()
    const toDelete: string[] = []
    
    this.optimisticUpdates.forEach((update, tempId) => {
      if (now - update.timestamp > maxAge) {
        toDelete.push(tempId)
      }
    })
    
    toDelete.forEach(tempId => {
      this.optimisticUpdates.delete(tempId)
    })
  }
  
  /**
   * Get all optimistic updates
   */
  getOptimisticUpdates(): OptimisticUpdate<T>[] {
    return Array.from(this.optimisticUpdates.values())
  }
  
  /**
   * Clear all optimistic updates
   */
  clearOptimisticUpdates(): void {
    this.optimisticUpdates.clear()
    this.idMapping.clear()
  }
}