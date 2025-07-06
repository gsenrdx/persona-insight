/**
 * Connection manager to handle React StrictMode and prevent duplicate subscriptions
 */

import { channelManager } from '../channels/channel-manager'

class ConnectionManager {
  private static instance: ConnectionManager
  private activeSubscriptions = new Map<string, Promise<void>>()
  private subscriptionTimers = new Map<string, NodeJS.Timeout>()
  
  private constructor() {}
  
  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager()
    }
    return ConnectionManager.instance
  }
  
  /**
   * Subscribe to a channel with deduplication
   */
  async subscribe(channelName: string, setupFn: () => Promise<void>): Promise<void> {
    // Clear any pending cleanup
    const cleanupTimer = this.subscriptionTimers.get(channelName)
    if (cleanupTimer) {
      clearTimeout(cleanupTimer)
      this.subscriptionTimers.delete(channelName)
    }
    
    // Check if already subscribing
    const existing = this.activeSubscriptions.get(channelName)
    if (existing) {
      return existing
    }
    
    // Create new subscription
    const subscriptionPromise = setupFn().finally(() => {
      // Remove from active subscriptions after completion
      this.activeSubscriptions.delete(channelName)
    })
    
    this.activeSubscriptions.set(channelName, subscriptionPromise)
    return subscriptionPromise
  }
  
  /**
   * Schedule cleanup with delay to handle React StrictMode
   */
  scheduleCleanup(channelName: string, cleanupFn: () => Promise<void>, delay = 500): void {
    // Clear any existing timer
    const existingTimer = this.subscriptionTimers.get(channelName)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }
    
    // Schedule new cleanup
    const timer = setTimeout(async () => {
      this.subscriptionTimers.delete(channelName)
      this.activeSubscriptions.delete(channelName)
      await cleanupFn()
    }, delay)
    
    this.subscriptionTimers.set(channelName, timer)
  }
  
  /**
   * Immediate cleanup (for unmounting)
   */
  async cleanup(channelName: string): Promise<void> {
    // Clear timer
    const timer = this.subscriptionTimers.get(channelName)
    if (timer) {
      clearTimeout(timer)
      this.subscriptionTimers.delete(channelName)
    }
    
    // Remove active subscription
    this.activeSubscriptions.delete(channelName)
    
    // Remove channel
    await channelManager.removeChannel(channelName)
  }
  
  /**
   * Cleanup all connections
   */
  async cleanupAll(): Promise<void> {
    // Clear all timers
    for (const timer of this.subscriptionTimers.values()) {
      clearTimeout(timer)
    }
    this.subscriptionTimers.clear()
    this.activeSubscriptions.clear()
    
    // Cleanup all channels
    await channelManager.cleanup()
  }
}

export const connectionManager = ConnectionManager.getInstance()