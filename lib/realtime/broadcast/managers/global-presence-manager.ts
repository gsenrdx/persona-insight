/**
 * Global presence manager for Notion-style collaboration
 */

import { channelManager } from '../channels/channel-manager'
import type { ManagedChannel } from '../channels/channel-manager'
import { MessageFactory } from '../utils/message-factory'
import type {
  GlobalPresenceData,
  GlobalPresenceState,
  PresenceSummary,
  PresenceConfig,
  PresenceFilter,
  ActivityNotification,
  ActivityType,
  LocationType,
  GlobalPresenceBroadcastType,
  getGlobalPresenceChannelName
} from '../types/global-presence.types'

// Default configuration
const DEFAULT_CONFIG: PresenceConfig = {
  heartbeatInterval: 30000, // 30 seconds
  inactiveTimeout: 90000, // 90 seconds
  maxUsersPerScope: 100,
  trackCursor: true,
  trackScroll: false,
  trackDevice: true,
  trackActivity: true
}

export class GlobalPresenceManager {
  private static instance: GlobalPresenceManager
  private config: PresenceConfig = DEFAULT_CONFIG
  private state: GlobalPresenceState = {
    company: new Map(),
    projects: new Map(),
    interviews: new Map(),
    recentActivity: []
  }
  
  private channels: Map<string, ManagedChannel> = new Map()
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map()
  private cleanupTimer?: NodeJS.Timeout
  private currentUser?: {
    id: string
    name?: string
    email?: string
    avatarUrl?: string
    companyId: string
  }
  
  private subscribers: Map<string, Set<(state: GlobalPresenceState) => void>> = new Map()
  
  private constructor() {
    this.startCleanupTimer()
  }
  
  static getInstance(): GlobalPresenceManager {
    if (!GlobalPresenceManager.instance) {
      GlobalPresenceManager.instance = new GlobalPresenceManager()
    }
    return GlobalPresenceManager.instance
  }
  
  /**
   * Initialize with user data and configuration
   */
  initialize(user: {
    id: string
    name?: string
    email?: string
    avatarUrl?: string
    companyId: string
  }, config?: Partial<PresenceConfig>) {
    this.currentUser = user
    this.config = { ...DEFAULT_CONFIG, ...config }
  }
  
  /**
   * Subscribe to company-wide presence
   */
  async subscribeToCompany(companyId: string): Promise<void> {
    const channelName = getGlobalPresenceChannelName('company', companyId)
    await this.subscribeToChannel(channelName, 'company')
  }
  
  /**
   * Subscribe to project-specific presence
   */
  async subscribeToProject(projectId: string): Promise<void> {
    const channelName = getGlobalPresenceChannelName('project', projectId)
    await this.subscribeToChannel(channelName, 'project')
  }
  
  /**
   * Subscribe to interview-specific presence
   */
  async subscribeToInterview(interviewId: string): Promise<void> {
    const channelName = getGlobalPresenceChannelName('interview', interviewId)
    await this.subscribeToChannel(channelName, 'interview')
  }
  
  /**
   * Update user's presence
   */
  async updatePresence(data: Partial<GlobalPresenceData>): Promise<void> {
    if (!this.currentUser) return
    
    const presence: GlobalPresenceData = {
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      email: this.currentUser.email,
      avatarUrl: this.currentUser.avatarUrl,
      companyId: this.currentUser.companyId,
      activity: ActivityType.VIEWING,
      location: LocationType.PROJECT_LIST,
      context: {},
      status: {
        isActive: true,
        lastActiveAt: new Date().toISOString()
      },
      ...data
    }
    
    // Update local state
    this.updateLocalPresence(presence)
    
    // Broadcast to relevant channels
    await this.broadcastPresence(presence)
    
    // Start heartbeat for this context
    this.startHeartbeat(presence)
  }
  
  /**
   * Track user activity
   */
  async trackActivity(
    activity: ActivityType,
    location: LocationType,
    context: GlobalPresenceData['context'],
    message?: string
  ): Promise<void> {
    if (!this.currentUser) return
    
    // Update presence
    await this.updatePresence({
      activity,
      location,
      context,
      status: {
        isActive: true,
        lastActiveAt: new Date().toISOString()
      }
    })
    
    // Add to recent activity
    const activityRecord = {
      userId: this.currentUser.id,
      activity,
      location,
      timestamp: new Date().toISOString(),
      context
    }
    
    this.state.recentActivity.unshift(activityRecord)
    if (this.state.recentActivity.length > 50) {
      this.state.recentActivity = this.state.recentActivity.slice(0, 50)
    }
    
    // Broadcast activity notification
    if (message) {
      const notification: ActivityNotification = {
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        activity,
        location,
        context,
        timestamp: new Date().toISOString(),
        message
      }
      
      await this.broadcastActivityNotification(notification)
    }
    
    this.notifySubscribers()
  }
  
  /**
   * Get presence summary for UI
   */
  getPresenceSummary(filter?: PresenceFilter): PresenceSummary[] {
    const summaries: PresenceSummary[] = []
    
    // Collect from all scopes
    const allUsers = new Map<string, GlobalPresenceData>()
    
    // Company-wide
    this.state.company.forEach((presence, userId) => {
      allUsers.set(userId, presence)
    })
    
    // Project-specific
    this.state.projects.forEach(projectUsers => {
      projectUsers.forEach((presence, userId) => {
        allUsers.set(userId, presence)
      })
    })
    
    // Interview-specific
    this.state.interviews.forEach(interviewUsers => {
      interviewUsers.forEach((presence, userId) => {
        allUsers.set(userId, presence)
      })
    })
    
    // Convert to summaries and apply filters
    allUsers.forEach(presence => {
      if (this.matchesFilter(presence, filter)) {
        summaries.push({
          userId: presence.userId,
          userName: presence.userName,
          avatarUrl: presence.avatarUrl,
          activity: presence.activity,
          location: presence.location,
          projectId: presence.context.projectId,
          interviewId: presence.context.interviewId,
          lastActiveAt: presence.status.lastActiveAt,
          color: this.getUserColor(presence.userId)
        })
      }
    })
    
    return summaries.sort((a, b) => 
      new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
    )
  }
  
  /**
   * Get users in specific location
   */
  getUsersInLocation(location: LocationType, context?: GlobalPresenceData['context']): PresenceSummary[] {
    return this.getPresenceSummary({
      locations: [location],
      projects: context?.projectId ? [context.projectId] : undefined,
      includeInactive: false
    })
  }
  
  /**
   * Subscribe to presence updates
   */
  subscribe(callback: (state: GlobalPresenceState) => void): () => void {
    const key = Math.random().toString(36)
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set())
    }
    this.subscribers.get(key)!.add(callback)
    
    return () => {
      this.subscribers.get(key)?.delete(callback)
    }
  }
  
  /**
   * Cleanup and disconnect
   */
  async cleanup(): Promise<void> {
    // Clear all timers
    this.heartbeatTimers.forEach(timer => clearTimeout(timer))
    this.heartbeatTimers.clear()
    
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
    }
    
    // Unsubscribe from all channels
    const promises = Array.from(this.channels.values()).map(channel => 
      channel.unsubscribe()
    )
    await Promise.all(promises)
    this.channels.clear()
    
    // Clear state
    this.state = {
      company: new Map(),
      projects: new Map(),
      interviews: new Map(),
      recentActivity: []
    }
    
    this.subscribers.clear()
  }
  
  // Private methods
  
  private async subscribeToChannel(channelName: string, scope: string): Promise<void> {
    if (this.channels.has(channelName)) {
      return // Already subscribed
    }
    
    const channel = channelManager.getChannel({
      name: channelName,
      presence: true,
      ack: false,
      selfBroadcast: false
    })
    
    this.channels.set(channelName, channel)
    
    // Set up message handlers
    channel.on(GlobalPresenceBroadcastType.PRESENCE_UPDATE, (message) => {
      this.handlePresenceUpdate(message.payload as GlobalPresenceData)
    })
    
    channel.on(GlobalPresenceBroadcastType.PRESENCE_BATCH, (message) => {
      this.handlePresenceBatch(message.payload as GlobalPresenceData[])
    })
    
    channel.on(GlobalPresenceBroadcastType.PRESENCE_CLEANUP, (message) => {
      this.handlePresenceCleanup(message.payload as { userIds: string[] })
    })
    
    channel.on(GlobalPresenceBroadcastType.ACTIVITY_NOTIFICATION, (message) => {
      this.handleActivityNotification(message.payload as ActivityNotification)
    })
    
    await channel.subscribe()
  }
  
  private updateLocalPresence(presence: GlobalPresenceData): void {
    // Update in appropriate scope
    if (presence.context.interviewId) {
      if (!this.state.interviews.has(presence.context.interviewId)) {
        this.state.interviews.set(presence.context.interviewId, new Map())
      }
      this.state.interviews.get(presence.context.interviewId)!.set(presence.userId, presence)
    } else if (presence.context.projectId) {
      if (!this.state.projects.has(presence.context.projectId)) {
        this.state.projects.set(presence.context.projectId, new Map())
      }
      this.state.projects.get(presence.context.projectId)!.set(presence.userId, presence)
    } else {
      this.state.company.set(presence.userId, presence)
    }
  }
  
  private async broadcastPresence(presence: GlobalPresenceData): Promise<void> {
    const message = MessageFactory.create(
      GlobalPresenceBroadcastType.PRESENCE_UPDATE,
      'presence',
      presence,
      this.currentUser!.id
    )
    
    // Broadcast to relevant channels
    const channelNames = this.getRelevantChannels(presence)
    const promises = channelNames.map(async channelName => {
      const channel = this.channels.get(channelName)
      if (channel) {
        try {
          await channel.send(message)
        } catch (error) {
          console.warn(`Failed to broadcast presence to ${channelName}:`, error)
        }
      }
    })
    
    await Promise.all(promises)
  }
  
  private async broadcastActivityNotification(notification: ActivityNotification): Promise<void> {
    const message = MessageFactory.create(
      GlobalPresenceBroadcastType.ACTIVITY_NOTIFICATION,
      'presence',
      notification,
      this.currentUser!.id
    )
    
    // Broadcast to company channel
    const companyChannel = getGlobalPresenceChannelName('company', this.currentUser!.companyId)
    const channel = this.channels.get(companyChannel)
    if (channel) {
      await channel.send(message)
    }
  }
  
  private getRelevantChannels(presence: GlobalPresenceData): string[] {
    const channels = []
    
    // Always include company channel
    channels.push(getGlobalPresenceChannelName('company', presence.companyId))
    
    // Include project channel if applicable
    if (presence.context.projectId) {
      channels.push(getGlobalPresenceChannelName('project', presence.context.projectId))
    }
    
    // Include interview channel if applicable
    if (presence.context.interviewId) {
      channels.push(getGlobalPresenceChannelName('interview', presence.context.interviewId))
    }
    
    return channels
  }
  
  private startHeartbeat(presence: GlobalPresenceData): void {
    const key = `${presence.userId}-${presence.context.projectId || 'company'}-${presence.context.interviewId || 'none'}`
    
    // Clear existing timer
    if (this.heartbeatTimers.has(key)) {
      clearTimeout(this.heartbeatTimers.get(key)!)
    }
    
    // Start new timer
    const timer = setTimeout(() => {
      this.updatePresence({
        ...presence,
        status: {
          ...presence.status,
          lastActiveAt: new Date().toISOString()
        }
      })
    }, this.config.heartbeatInterval)
    
    this.heartbeatTimers.set(key, timer)
  }
  
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupInactiveUsers()
    }, 30000) // Clean up every 30 seconds
  }
  
  private cleanupInactiveUsers(): void {
    const now = Date.now()
    const inactiveUserIds: string[] = []
    
    // Check all scopes for inactive users
    const checkMap = (map: Map<string, GlobalPresenceData>) => {
      map.forEach((presence, userId) => {
        const lastActive = new Date(presence.status.lastActiveAt).getTime()
        if (now - lastActive > this.config.inactiveTimeout) {
          inactiveUserIds.push(userId)
          map.delete(userId)
        }
      })
    }
    
    checkMap(this.state.company)
    this.state.projects.forEach(projectMap => checkMap(projectMap))
    this.state.interviews.forEach(interviewMap => checkMap(interviewMap))
    
    // Broadcast cleanup if needed
    if (inactiveUserIds.length > 0) {
      this.broadcastCleanup(inactiveUserIds)
      this.notifySubscribers()
    }
  }
  
  private async broadcastCleanup(userIds: string[]): Promise<void> {
    const message = MessageFactory.create(
      GlobalPresenceBroadcastType.PRESENCE_CLEANUP,
      'presence',
      { userIds },
      this.currentUser!.id
    )
    
    // Broadcast to all channels
    const promises = Array.from(this.channels.values()).map(channel => 
      channel.send(message)
    )
    
    await Promise.all(promises)
  }
  
  private handlePresenceUpdate(presence: GlobalPresenceData): void {
    this.updateLocalPresence(presence)
    this.notifySubscribers()
  }
  
  private handlePresenceBatch(presences: GlobalPresenceData[]): void {
    presences.forEach(presence => {
      this.updateLocalPresence(presence)
    })
    this.notifySubscribers()
  }
  
  private handlePresenceCleanup(payload: { userIds: string[] }): void {
    payload.userIds.forEach(userId => {
      this.state.company.delete(userId)
      this.state.projects.forEach(projectMap => projectMap.delete(userId))
      this.state.interviews.forEach(interviewMap => interviewMap.delete(userId))
    })
    this.notifySubscribers()
  }
  
  private handleActivityNotification(notification: ActivityNotification): void {
    // Add to recent activity
    this.state.recentActivity.unshift({
      userId: notification.userId,
      activity: notification.activity,
      location: notification.location,
      timestamp: notification.timestamp,
      context: notification.context
    })
    
    if (this.state.recentActivity.length > 50) {
      this.state.recentActivity = this.state.recentActivity.slice(0, 50)
    }
    
    this.notifySubscribers()
  }
  
  private matchesFilter(presence: GlobalPresenceData, filter?: PresenceFilter): boolean {
    if (!filter) return true
    
    if (filter.activities && !filter.activities.includes(presence.activity)) {
      return false
    }
    
    if (filter.locations && !filter.locations.includes(presence.location)) {
      return false
    }
    
    if (filter.projects && presence.context.projectId && 
        !filter.projects.includes(presence.context.projectId)) {
      return false
    }
    
    if (!filter.includeInactive && !presence.status.isActive) {
      return false
    }
    
    if (filter.timeWindow) {
      const lastActive = new Date(presence.status.lastActiveAt).getTime()
      const start = new Date(filter.timeWindow.start).getTime()
      const end = new Date(filter.timeWindow.end).getTime()
      
      if (lastActive < start || lastActive > end) {
        return false
      }
    }
    
    return true
  }
  
  private getUserColor(userId: string): string {
    // Generate consistent color for user
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ]
    
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    return colors[Math.abs(hash) % colors.length]
  }
  
  private notifySubscribers(): void {
    this.subscribers.forEach(subscriberSet => {
      subscriberSet.forEach(callback => {
        try {
          callback(this.state)
        } catch (error) {
          console.error('Error notifying presence subscriber:', error)
        }
      })
    })
  }
}

// Export singleton instance
export const globalPresenceManager = GlobalPresenceManager.getInstance()