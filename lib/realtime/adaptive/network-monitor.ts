import { NetworkQuality, NetworkMetrics } from './types'

/**
 * 네트워크 품질 모니터
 * 실시간으로 네트워크 상태를 감지하고 품질을 평가
 */
export class NetworkMonitor {
  private metrics: NetworkMetrics = {
    rtt: 0,
    downlink: 0,
    packetLoss: 0,
    effectiveType: '4g',
    timestamp: Date.now()
  }
  
  private connection: any // Navigator.connection 타입
  private pingInterval: NodeJS.Timer | null = null
  private listeners: Set<(quality: NetworkQuality) => void> = new Set()
  private lastQuality: NetworkQuality = 'good'
  
  constructor(private checkInterval: number = 10000) {
    this.initializeConnection()
    this.startMonitoring()
  }
  
  private initializeConnection() {
    // Network Information API 확인
    if ('connection' in navigator) {
      this.connection = (navigator as any).connection
      
      // 연결 변경 이벤트 리스너
      if (this.connection) {
        this.connection.addEventListener('change', () => {
          this.updateMetricsFromConnection()
          this.evaluateQuality()
        })
        
        // 초기 메트릭 업데이트
        this.updateMetricsFromConnection()
      }
    }
  }
  
  private updateMetricsFromConnection() {
    if (!this.connection) return
    
    this.metrics = {
      ...this.metrics,
      rtt: this.connection.rtt || 0,
      downlink: this.connection.downlink || 0,
      effectiveType: this.connection.effectiveType || '4g',
      timestamp: Date.now()
    }
  }
  
  private async measureLatency(): Promise<number> {
    const startTime = performance.now()
    
    try {
      // 작은 이미지나 API 엔드포인트로 핑 테스트
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      })
      
      if (response.ok) {
        return performance.now() - startTime
      }
    } catch (error) {
      // 네트워크 에러는 높은 지연으로 간주
      return 999999
    }
    
    return performance.now() - startTime
  }
  
  private async measurePacketLoss(): Promise<number> {
    const attempts = 5
    let failures = 0
    
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(3000)
        })
        
        if (!response.ok) failures++
      } catch {
        failures++
      }
    }
    
    return (failures / attempts) * 100
  }
  
  private startMonitoring() {
    // 주기적으로 네트워크 품질 측정
    this.pingInterval = setInterval(async () => {
      const [latency, packetLoss] = await Promise.all([
        this.measureLatency(),
        this.measurePacketLoss()
      ])
      
      this.metrics = {
        ...this.metrics,
        rtt: Math.round(latency),
        packetLoss,
        timestamp: Date.now()
      }
      
      this.evaluateQuality()
    }, this.checkInterval)
  }
  
  private evaluateQuality() {
    const quality = this.calculateQuality()
    
    if (quality !== this.lastQuality) {
      this.lastQuality = quality
      this.notifyListeners(quality)
    }
  }
  
  private calculateQuality(): NetworkQuality {
    const { rtt, downlink, packetLoss, effectiveType } = this.metrics
    
    // 오프라인 체크
    if (!navigator.onLine) {
      return 'offline'
    }
    
    // 패킷 손실률이 높으면 poor
    if (packetLoss > 10) {
      return 'poor'
    }
    
    // RTT와 연결 타입 기반 품질 평가
    if (effectiveType === '4g' && rtt < 100 && downlink > 10) {
      return 'excellent'
    } else if (effectiveType === '4g' && rtt < 200 && downlink > 5) {
      return 'good'
    } else if ((effectiveType === '3g' || effectiveType === '4g') && rtt < 400) {
      return 'fair'
    } else {
      return 'poor'
    }
  }
  
  private notifyListeners(quality: NetworkQuality) {
    this.listeners.forEach(listener => listener(quality))
  }
  
  public getCurrentQuality(): NetworkQuality {
    return this.lastQuality
  }
  
  public getMetrics(): NetworkMetrics {
    return { ...this.metrics }
  }
  
  public onQualityChange(callback: (quality: NetworkQuality) => void) {
    this.listeners.add(callback)
    
    return () => {
      this.listeners.delete(callback)
    }
  }
  
  public dispose() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    
    if (this.connection) {
      this.connection.removeEventListener('change', this.updateMetricsFromConnection)
    }
    
    this.listeners.clear()
  }
}