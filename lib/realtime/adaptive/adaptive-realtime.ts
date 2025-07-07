import { 
  AdaptiveRealtimeOptions, 
  RealtimeStrategy,
  FeatureConfig,
  StrategyTransition,
  PerformanceMetrics
} from './types'
import { StrategyManager } from './strategy-manager'

/**
 * 적응형 실시간 시스템
 * UI 변경 없이 백엔드에서 최적의 실시간 전략을 자동 선택
 */
export class AdaptiveRealtime {
  private static instance: AdaptiveRealtime | null = null
  private strategyManager: StrategyManager
  private initialized = false
  
  private constructor(options: AdaptiveRealtimeOptions) {
    this.strategyManager = new StrategyManager(options)
    this.initialized = true
  }
  
  /**
   * 싱글톤 인스턴스 생성 또는 반환
   */
  static initialize(options: AdaptiveRealtimeOptions): AdaptiveRealtime {
    if (!AdaptiveRealtime.instance) {
      AdaptiveRealtime.instance = new AdaptiveRealtime(options)
    }
    return AdaptiveRealtime.instance
  }
  
  /**
   * 현재 인스턴스 반환 (초기화되지 않았으면 에러)
   */
  static getInstance(): AdaptiveRealtime {
    if (!AdaptiveRealtime.instance) {
      throw new Error('AdaptiveRealtime not initialized. Call initialize() first.')
    }
    return AdaptiveRealtime.instance
  }
  
  /**
   * 인스턴스 종료
   */
  static dispose() {
    if (AdaptiveRealtime.instance) {
      AdaptiveRealtime.instance.dispose()
      AdaptiveRealtime.instance = null
    }
  }
  
  /**
   * 특정 기능의 현재 전략 가져오기
   */
  getStrategy(feature: string): RealtimeStrategy {
    return this.strategyManager.getCurrentStrategy(feature)
  }
  
  /**
   * 수동으로 전략 전환
   */
  async switchStrategy(feature: string, strategy: RealtimeStrategy): Promise<void> {
    return this.strategyManager.switchStrategy(feature, strategy, 'manual_override')
  }
  
  /**
   * 연결 추적 시작
   */
  trackConnection(connectionId: string, type: string) {
    this.strategyManager.trackConnection(connectionId, type)
  }
  
  /**
   * 연결 추적 종료
   */
  untrackConnection(connectionId: string) {
    this.strategyManager.untrackConnection(connectionId)
  }
  
  /**
   * 메시지 처리 추적
   */
  trackMessage() {
    this.strategyManager.trackMessage()
  }
  
  /**
   * 에러 발생 추적
   */
  trackError() {
    this.strategyManager.trackError()
  }
  
  /**
   * 전환 이력 조회
   */
  getTransitionHistory(): StrategyTransition[] {
    return this.strategyManager.getTransitionHistory()
  }
  
  /**
   * 특정 기능의 설정 조회
   */
  getFeatureConfig(feature: string): FeatureConfig | undefined {
    return this.strategyManager.getFeatureConfig(feature)
  }
  
  /**
   * 시스템 종료
   */
  private dispose() {
    if (this.initialized) {
      this.strategyManager.dispose()
      this.initialized = false
    }
  }
}

// 기본 설정
export const defaultFeatureConfigs: FeatureConfig[] = [
  {
    feature: 'presence',
    priority: 'high',
    strategy: {
      primary: 'sse',
      fallback: 'polling',
      pollingInterval: 60000, // 1분
      maxRetries: 3,
      reconnectDelay: 1000,
      autoSwitch: true
    },
    switchConditions: {
      minNetworkQuality: 'fair',
      maxConcurrentUsers: 100,
      maxMemoryUsage: 50, // 50MB
      maxLatency: 2000, // 2초
      errorRateThreshold: 10 // 10%
    }
  },
  {
    feature: 'interview-list',
    priority: 'medium',
    strategy: {
      primary: 'polling',
      fallback: 'none',
      pollingInterval: 30000, // 30초
      autoSwitch: true
    },
    switchConditions: {
      minNetworkQuality: 'poor',
      maxMemoryUsage: 30, // 30MB
      errorRateThreshold: 20 // 20%
    }
  },
  {
    feature: 'interview-detail',
    priority: 'critical',
    strategy: {
      primary: 'websocket',
      fallback: 'sse',
      maxRetries: 5,
      reconnectDelay: 500,
      autoSwitch: true
    },
    switchConditions: {
      minNetworkQuality: 'good',
      maxConcurrentUsers: 50,
      maxMemoryUsage: 100, // 100MB
      maxLatency: 500, // 500ms
      errorRateThreshold: 5 // 5%
    }
  },
  {
    feature: 'comments',
    priority: 'medium',
    strategy: {
      primary: 'polling',
      fallback: 'none',
      pollingInterval: 60000, // 1분
      autoSwitch: true
    },
    switchConditions: {
      minNetworkQuality: 'fair',
      maxMemoryUsage: 40, // 40MB
      errorRateThreshold: 15 // 15%
    }
  }
]

// 개발 환경용 디버그 설정
export const debugOptions: Partial<AdaptiveRealtimeOptions> = {
  debug: true,
  monitoringInterval: 2000, // 2초
  networkCheckInterval: 5000, // 5초
  onTransition: (transition: StrategyTransition) => {
    console.log(`[AdaptiveRealtime] Strategy transition:`, {
      feature: `${transition.from} → ${transition.to}`,
      reason: transition.reason,
      duration: transition.endTime ? transition.endTime - transition.startTime : 'ongoing',
      success: transition.success
    })
  },
  onMetricsUpdate: (metrics: PerformanceMetrics) => {
    console.log(`[AdaptiveRealtime] Metrics:`, {
      connections: metrics.activeConnections,
      messageRate: `${metrics.messageRate}/s`,
      memory: `${metrics.memoryUsage}MB`,
      latency: `${metrics.avgLatency}ms`,
      errorRate: `${metrics.errorRate}%`
    })
  }
}