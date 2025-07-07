import { 
  RealtimeStrategy, 
  FeatureConfig, 
  StrategyManager as IStrategyManager,
  StrategyTransition,
  TransitionReason,
  NetworkQuality,
  PerformanceMetrics,
  AdaptiveRealtimeOptions
} from './types'
import { NetworkMonitor } from './network-monitor'
import { PerformanceMonitor } from './performance-monitor'

/**
 * 적응형 실시간 전략 관리자
 * 네트워크와 성능 상태에 따라 최적의 실시간 전략을 선택하고 전환
 */
export class StrategyManager implements IStrategyManager {
  private features: Map<string, FeatureConfig>
  private currentStrategies: Map<string, RealtimeStrategy> = new Map()
  private networkMonitor: NetworkMonitor
  private performanceMonitor: PerformanceMonitor
  private transitions: StrategyTransition[] = []
  private isDisposed = false
  
  constructor(private options: AdaptiveRealtimeOptions) {
    // 기능별 설정 맵 생성
    this.features = new Map(
      options.features.map(feature => [feature.feature, feature])
    )
    
    // 모니터 초기화
    this.networkMonitor = new NetworkMonitor(options.networkCheckInterval)
    this.performanceMonitor = new PerformanceMonitor(options.monitoringInterval)
    
    // 초기 전략 설정
    this.initializeStrategies()
    
    // 모니터링 시작
    this.startMonitoring()
  }
  
  private initializeStrategies() {
    this.features.forEach((config, feature) => {
      this.currentStrategies.set(feature, config.strategy.primary)
      
      // 초기 설정 전환 기록
      this.recordTransition({
        from: 'none',
        to: config.strategy.primary,
        reason: 'initial_setup',
        startTime: Date.now(),
        endTime: Date.now(),
        success: true
      })
    })
  }
  
  private startMonitoring() {
    // 네트워크 품질 변경 감지
    this.networkMonitor.onQualityChange((quality) => {
      this.evaluateStrategies('network_quality', quality)
    })
    
    // 성능 메트릭 변경 감지
    this.performanceMonitor.onMetricsUpdate((metrics) => {
      this.evaluateStrategies('performance', metrics)
      
      // 메트릭 콜백 호출
      if (this.options.onMetricsUpdate) {
        this.options.onMetricsUpdate(metrics)
      }
    })
  }
  
  private evaluateStrategies(trigger: 'network_quality' | 'performance', data: any) {
    if (this.isDisposed) return
    
    const networkQuality = this.networkMonitor.getCurrentQuality()
    const performanceMetrics = this.performanceMonitor.getMetrics()
    
    this.features.forEach((config, feature) => {
      if (!config.strategy.autoSwitch) return
      
      const currentStrategy = this.currentStrategies.get(feature)!
      const recommendedStrategy = this.recommendStrategy(
        config,
        networkQuality,
        performanceMetrics
      )
      
      if (currentStrategy !== recommendedStrategy) {
        const reason = this.determineTransitionReason(
          trigger,
          networkQuality,
          performanceMetrics
        )
        
        this.switchStrategy(feature, recommendedStrategy, reason)
      }
    })
  }
  
  private recommendStrategy(
    config: FeatureConfig,
    networkQuality: NetworkQuality,
    metrics: PerformanceMetrics
  ): RealtimeStrategy {
    const conditions = config.switchConditions
    if (!conditions) return config.strategy.primary
    
    // 오프라인이면 none
    if (networkQuality === 'offline') {
      return 'none'
    }
    
    // 메모리 사용량 체크
    if (conditions.maxMemoryUsage && metrics.memoryUsage > conditions.maxMemoryUsage) {
      return this.downgradeStrategy(config.strategy.primary)
    }
    
    // 에러율 체크
    if (conditions.errorRateThreshold && metrics.errorRate > conditions.errorRateThreshold) {
      return config.strategy.fallback
    }
    
    // 지연 시간 체크
    if (conditions.maxLatency && metrics.avgLatency > conditions.maxLatency) {
      return this.downgradeStrategy(config.strategy.primary)
    }
    
    // 동시 사용자 수 체크
    if (conditions.maxConcurrentUsers && metrics.activeConnections > conditions.maxConcurrentUsers) {
      return this.downgradeStrategy(config.strategy.primary)
    }
    
    // 네트워크 품질에 따른 전략 선택
    switch (networkQuality) {
      case 'excellent':
        return config.strategy.primary
      case 'good':
        return config.strategy.primary === 'websocket' ? 'websocket' : config.strategy.primary
      case 'fair':
        return config.strategy.primary === 'websocket' ? 'sse' : config.strategy.primary
      case 'poor':
        return 'polling'
      default:
        return config.strategy.fallback
    }
  }
  
  private downgradeStrategy(strategy: RealtimeStrategy): RealtimeStrategy {
    // 전략 다운그레이드 순서: websocket -> sse -> polling -> none
    switch (strategy) {
      case 'websocket':
        return 'sse'
      case 'sse':
        return 'polling'
      case 'polling':
        return 'none'
      default:
        return 'none'
    }
  }
  
  private determineTransitionReason(
    trigger: string,
    networkQuality: NetworkQuality,
    metrics: PerformanceMetrics
  ): TransitionReason {
    if (trigger === 'network_quality') {
      if (networkQuality === 'poor' || networkQuality === 'offline') {
        return 'network_quality_degraded'
      } else {
        return 'network_quality_improved'
      }
    }
    
    // 성능 기반 이유 판단
    if (metrics.memoryUsage > 100) { // 100MB 이상
      return 'high_memory_usage'
    }
    if (metrics.errorRate > 5) { // 5% 이상
      return 'high_error_rate'
    }
    if (metrics.avgLatency > 1000) { // 1초 이상
      return 'high_latency'
    }
    if (metrics.activeConnections > 50) { // 50개 이상
      return 'user_count_exceeded'
    }
    
    return 'manual_override'
  }
  
  private recordTransition(transition: StrategyTransition) {
    this.transitions.push(transition)
    
    // 최근 100개의 전환만 유지
    if (this.transitions.length > 100) {
      this.transitions = this.transitions.slice(-100)
    }
    
    // 전환 콜백 호출
    if (this.options.onTransition) {
      this.options.onTransition(transition)
    }
    
    // 디버그 모드에서 로그 출력
    if (this.options.debug && process.env.NODE_ENV === 'development') {
      console.log('[StrategyManager] Transition:', transition)
    }
  }
  
  // Public API Implementation
  
  getCurrentStrategy(feature: string): RealtimeStrategy {
    return this.currentStrategies.get(feature) || 'none'
  }
  
  async switchStrategy(
    feature: string, 
    newStrategy: RealtimeStrategy, 
    reason: TransitionReason
  ): Promise<void> {
    const currentStrategy = this.currentStrategies.get(feature)
    if (!currentStrategy || currentStrategy === newStrategy) return
    
    const transition: StrategyTransition = {
      from: currentStrategy,
      to: newStrategy,
      reason,
      startTime: Date.now()
    }
    
    try {
      // 실제 전환 로직은 각 기능에서 구현
      // 여기서는 전략만 업데이트
      this.currentStrategies.set(feature, newStrategy)
      
      transition.endTime = Date.now()
      transition.success = true
      
      this.recordTransition(transition)
    } catch (error) {
      transition.endTime = Date.now()
      transition.success = false
      transition.error = error instanceof Error ? error.message : 'Unknown error'
      
      this.recordTransition(transition)
      
      // 폴백 전략으로 전환
      const config = this.features.get(feature)
      if (config) {
        this.currentStrategies.set(feature, config.strategy.fallback)
      }
    }
  }
  
  updateMetrics(metrics: Partial<PerformanceMetrics>): void {
    // 개별 메트릭 업데이트는 PerformanceMonitor에 위임
    if (metrics.activeConnections !== undefined) {
      // PerformanceMonitor의 연결 추적은 별도로 관리
    }
    if (metrics.messageRate !== undefined) {
      // 메시지 추적
    }
    if (metrics.avgLatency !== undefined) {
      this.performanceMonitor.trackLatency(metrics.avgLatency)
    }
    if (metrics.errorRate !== undefined) {
      // 에러 추적
    }
  }
  
  updateNetworkQuality(quality: NetworkQuality): void {
    // NetworkMonitor가 자동으로 감지하므로 수동 업데이트는 필요 없음
    // 필요시 강제 평가 트리거
    this.evaluateStrategies('network_quality', quality)
  }
  
  dispose(): void {
    this.isDisposed = true
    this.networkMonitor.dispose()
    this.performanceMonitor.dispose()
    this.currentStrategies.clear()
    this.features.clear()
    this.transitions = []
  }
  
  // 추가 유틸리티 메서드
  
  getTransitionHistory(): StrategyTransition[] {
    return [...this.transitions]
  }
  
  getFeatureConfig(feature: string): FeatureConfig | undefined {
    return this.features.get(feature)
  }
  
  trackConnection(connectionId: string, type: string) {
    this.performanceMonitor.trackConnection(connectionId, type)
  }
  
  untrackConnection(connectionId: string) {
    this.performanceMonitor.untrackConnection(connectionId)
  }
  
  trackMessage() {
    this.performanceMonitor.trackMessage()
  }
  
  trackError() {
    this.performanceMonitor.trackError()
  }
}