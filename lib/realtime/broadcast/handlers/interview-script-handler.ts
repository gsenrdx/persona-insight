/**
 * Interview script message handler for collaborative editing
 */

import { BaseMessageHandler } from './base-handler'
import { BroadcastAction } from '../types'
import type { 
  ScriptItemPayload,
  ScriptPresencePayload,
  InterviewScriptBroadcastMessage,
  InterviewScriptPresenceBroadcastMessage
} from '../types'

export interface InterviewScriptState {
  scripts: Map<string, ScriptItemPayload> // scriptId -> script item
  presence: Map<string, ScriptPresencePayload> // userId -> presence info
  localChanges: Map<string, string> // scriptId -> local text (for conflict resolution)
}

export class InterviewScriptHandler extends BaseMessageHandler<ScriptItemPayload> {
  private state: InterviewScriptState = {
    scripts: new Map(),
    presence: new Map(),
    localChanges: new Map()
  }
  
  private listeners: Set<(state: InterviewScriptState) => void> = new Set()
  private presenceListeners: Set<(presence: Map<string, ScriptPresencePayload>) => void> = new Set()
  private currentUserId: string | null = null
  
  constructor(userId?: string) {
    super()
    this.currentUserId = userId || null
  }
  
  /**
   * Handle incoming script message
   */
  async handleMessage(message: InterviewScriptBroadcastMessage): Promise<void> {
    // Skip if duplicate
    if (this.isDuplicate(message)) {
      return
    }
    
    const { action, payload, metadata } = message
    
    switch (action) {
      case BroadcastAction.UPDATE:
        this.handleScriptUpdate(payload, metadata.userId)
        break
      case BroadcastAction.SYNC:
        this.handleScriptSync(payload)
        break
    }
    
    // Notify listeners
    this.notifyListeners()
  }
  
  /**
   * Handle presence updates
   */
  handlePresenceMessage(message: InterviewScriptPresenceBroadcastMessage): void {
    const { action, payload } = message
    
    console.log('Handling presence message:', { action, payload })
    
    if (action === BroadcastAction.PRESENCE) {
      // Update or add presence
      this.state.presence.set(payload.userId, payload)
    } else if (action === BroadcastAction.DELETE) {
      // Remove presence
      this.state.presence.delete(payload.userId)
    }
    
    // Clean up stale presence (older than 30 seconds)
    const now = Date.now()
    const staleThreshold = 30000 // 30 seconds
    
    this.state.presence.forEach((presence, userId) => {
      const lastActive = new Date(presence.lastActiveAt || 0).getTime()
      if (now - lastActive > staleThreshold) {
        this.state.presence.delete(userId)
      }
    })
    
    console.log('Current presence state:', Array.from(this.state.presence.entries()))
    this.notifyPresenceListeners()
  }
  
  /**
   * Update script item with conflict resolution
   */
  updateScript(scriptId: string, text: string, version?: number): ScriptItemPayload | null {
    const existing = this.state.scripts.get(scriptId)
    
    // Conflict detection
    if (existing && version && existing.version && existing.version > version) {
      // Remote version is newer, need to resolve conflict
      return null // Let the UI handle conflict resolution
    }
    
    const updated: ScriptItemPayload = {
      ...existing,
      interview_id: existing?.interview_id || '',
      script_id: scriptId,
      cleaned_sentence: text,
      version: (existing?.version || 0) + 1,
      last_edited_by: this.currentUserId || undefined,
      last_edited_at: new Date().toISOString()
    }
    
    // Store local change for conflict resolution
    this.state.localChanges.set(scriptId, text)
    
    // Update state
    this.state.scripts.set(scriptId, updated)
    this.notifyListeners()
    
    return updated
  }
  
  /**
   * Update presence (cursor position, selection)
   */
  updatePresence(presence: Partial<ScriptPresencePayload>): void {
    if (!this.currentUserId) return
    
    const current = this.state.presence.get(this.currentUserId) || {
      userId: this.currentUserId,
      lastActiveAt: new Date().toISOString()
    }
    
    const updated: ScriptPresencePayload = {
      ...current,
      ...presence,
      userId: presence.userId || this.currentUserId,
      lastActiveAt: new Date().toISOString()
    }
    
    this.state.presence.set(updated.userId, updated)
    this.notifyPresenceListeners()
  }
  
  /**
   * Get other users' presence for a script item
   */
  getPresenceForScript(scriptId: string): ScriptPresencePayload[] {
    const presences: ScriptPresencePayload[] = []
    
    console.log('[ScriptHandler] Getting presence for script:', scriptId)
    console.log('[ScriptHandler] Current presence state:', Array.from(this.state.presence.entries()))
    console.log('[ScriptHandler] Current user ID:', this.currentUserId)
    
    this.state.presence.forEach((presence, userId) => {
      if (userId !== this.currentUserId && presence.scriptId === scriptId) {
        presences.push(presence)
      }
    })
    
    console.log('[ScriptHandler] Found presences for script:', presences.length)
    
    return presences
  }
  
  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: InterviewScriptState) => void): () => void {
    this.listeners.add(listener)
    // Immediately call with current state
    listener(this.getState())
    
    return () => {
      this.listeners.delete(listener)
    }
  }
  
  /**
   * Subscribe to presence changes
   */
  subscribeToPresence(listener: (presence: Map<string, ScriptPresencePayload>) => void): () => void {
    this.presenceListeners.add(listener)
    // Immediately call with current presence
    listener(new Map(this.state.presence))
    
    return () => {
      this.presenceListeners.delete(listener)
    }
  }
  
  /**
   * Get current state
   */
  getState(): InterviewScriptState {
    return {
      scripts: new Map(this.state.scripts),
      presence: new Map(this.state.presence),
      localChanges: new Map(this.state.localChanges)
    }
  }
  
  /**
   * Load initial script data
   */
  loadInitialScripts(scripts: ScriptItemPayload[]): void {
    scripts.forEach(script => {
      this.state.scripts.set(script.script_id, script)
    })
    this.notifyListeners()
  }
  
  /**
   * Clear all data
   */
  clear(): void {
    this.state.scripts.clear()
    this.state.presence.clear()
    this.state.localChanges.clear()
    this.notifyListeners()
    this.notifyPresenceListeners()
  }
  
  private handleScriptUpdate(payload: ScriptItemPayload, senderId: string): void {
    const { script_id, version } = payload
    if (!script_id) return
    
    const existing = this.state.scripts.get(script_id)
    const localChange = this.state.localChanges.get(script_id)
    
    // Check for conflict
    if (localChange && existing && senderId !== this.currentUserId) {
      // We have a local change that conflicts with remote update
      if (!version || !existing.version || version >= existing.version) {
        // Remote wins, but keep local change for potential merge
        console.warn('Script conflict detected:', script_id)
      }
    }
    
    // Update script
    this.state.scripts.set(script_id, payload)
  }
  
  private handleScriptSync(payload: ScriptItemPayload): void {
    // Full sync - used for initial load or recovery
    if (Array.isArray((payload as any).scripts)) {
      const scripts = (payload as any).scripts as ScriptItemPayload[]
      this.state.scripts.clear()
      scripts.forEach(script => {
        this.state.scripts.set(script.script_id, script)
      })
    }
  }
  
  private notifyListeners(): void {
    const state = this.getState()
    this.listeners.forEach(listener => {
      try {
        listener(state)
      } catch (error) {
        console.error('Error in script handler listener:', error)
      }
    })
  }
  
  private notifyPresenceListeners(): void {
    const presence = new Map(this.state.presence)
    this.presenceListeners.forEach(listener => {
      try {
        listener(presence)
      } catch (error) {
        console.error('Error in presence listener:', error)
      }
    })
  }
  
  /**
   * Generate a consistent color for user based on their ID
   */
  static generateUserColor(userId?: string): string {
    const colors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#F7DC6F', // Yellow
      '#BB8FCE', // Purple
      '#52C9B0', // Green
      '#F8B739', // Orange
      '#6C84E0', // Indigo
      '#FF8A65', // Deep Orange
      '#81C784', // Light Green
      '#64B5F6', // Light Blue
      '#FFB74D', // Orange
    ]
    
    if (!userId) {
      return colors[Math.floor(Math.random() * colors.length)]
    }
    
    // Generate consistent color based on user ID hash
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return colors[Math.abs(hash) % colors.length]
  }
}