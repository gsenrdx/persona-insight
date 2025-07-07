/**
 * 적응형 실시간 전략 시스템 타입 정의
 * UI 변경 없이 백엔드에서만 동작하는 최적화 시스템
 */

export type RealtimeStrategy = 'websocket' | 'sse' | 'polling' | 'none'

export interface StrategyConfig {
  /** 기본 전략 */
  primary: RealtimeStrategy
  /** 폴백 전략 (실패 시) */
  fallback: RealtimeStrategy
  /** 폴링 간격 (ms) - polling 전략일 때만 사용 */
  pollingInterval?: number
  /** 최대 재시도 횟수 */
  maxRetries?: number
  /** 재연결 지연 시간 (ms) */
  reconnectDelay?: number
  /** 자동 전환 활성화 여부 */
  autoSwitch?: boolean
}

export interface FeatureConfig {
  /** 기능 식별자 */
  feature: string
  /** 중요도 */
  priority: 'critical' | 'high' | 'medium' | 'low'
  /** 전략 설정 */
  strategy: StrategyConfig
  /** 전환 조건 */
  switchConditions?: SwitchConditions
}

export interface SwitchConditions {
  /** 최소 네트워크 품질 */
  minNetworkQuality?: NetworkQuality
  /** 최대 동시 사용자 수 */
  maxConcurrentUsers?: number
  /** 최대 메모리 사용량 (MB) */
  maxMemoryUsage?: number
  /** 최대 지연 시간 (ms) */
  maxLatency?: number
  /** 에러율 임계값 (%) */
  errorRateThreshold?: number
}

export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline'

export interface NetworkMetrics {
  /** RTT (Round Trip Time) in ms */
  rtt: number
  /** 다운로드 속도 (Mbps) */
  downlink: number
  /** 패킷 손실률 (%) */
  packetLoss: number
  /** 연결 타입 */
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g'
  /** 측정 시간 */
  timestamp: number
}

export interface PerformanceMetrics {
  /** 활성 연결 수 */
  activeConnections: number
  /** 메시지 처리율 (messages/sec) */
  messageRate: number
  /** 메모리 사용량 (MB) */
  memoryUsage: number
  /** 평균 지연 시간 (ms) */
  avgLatency: number
  /** 에러율 (%) */
  errorRate: number
  /** CPU 사용률 (%) */
  cpuUsage: number
  /** 측정 시간 */
  timestamp: number
}

export interface StrategyTransition {
  /** 이전 전략 */
  from: RealtimeStrategy
  /** 새로운 전략 */
  to: RealtimeStrategy
  /** 전환 이유 */
  reason: TransitionReason
  /** 전환 시작 시간 */
  startTime: number
  /** 전환 완료 시간 */
  endTime?: number
  /** 전환 성공 여부 */
  success?: boolean
  /** 에러 메시지 */
  error?: string
}

export type TransitionReason = 
  | 'network_quality_degraded'
  | 'network_quality_improved'
  | 'high_memory_usage'
  | 'high_error_rate'
  | 'high_latency'
  | 'user_count_exceeded'
  | 'manual_override'
  | 'initial_setup'
  | 'connection_failed'
  | 'fallback_triggered'

export interface AdaptiveRealtimeOptions {
  /** 기능별 설정 */
  features: FeatureConfig[]
  /** 전역 폴백 전략 */
  globalFallback?: RealtimeStrategy
  /** 성능 측정 간격 (ms) */
  monitoringInterval?: number
  /** 네트워크 품질 체크 간격 (ms) */
  networkCheckInterval?: number
  /** 디버그 모드 (개발 환경에서만) */
  debug?: boolean
  /** 전환 이벤트 콜백 */
  onTransition?: (transition: StrategyTransition) => void
  /** 메트릭 업데이트 콜백 */
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void
}

export interface StrategyManager {
  /** 현재 전략 가져오기 */
  getCurrentStrategy(feature: string): RealtimeStrategy
  /** 전략 전환 */
  switchStrategy(feature: string, newStrategy: RealtimeStrategy, reason: TransitionReason): Promise<void>
  /** 성능 메트릭 업데이트 */
  updateMetrics(metrics: Partial<PerformanceMetrics>): void
  /** 네트워크 품질 업데이트 */
  updateNetworkQuality(quality: NetworkQuality): void
  /** 전략 관리자 종료 */
  dispose(): void
}