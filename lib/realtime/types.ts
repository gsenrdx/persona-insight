/**
 * Legacy type definitions for backward compatibility
 * These types are re-exported from the old provider
 */

export interface ConnectionQuality {
  lastSuccessfulPing: number
  failedPings: number
  averageLatency: number
  isStable: boolean
}