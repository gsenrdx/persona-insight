import { PerformanceMetrics } from './types'

/**
 * 성능 모니터
 * 애플리케이션의 실시간 성능 메트릭을 추적
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    activeConnections: 0,
    messageRate: 0,
    memoryUsage: 0,
    avgLatency: 0,
    errorRate: 0,
    cpuUsage: 0,
    timestamp: Date.now()
  }
  
  private messageCount = 0
  private errorCount = 0
  private latencies: number[] = []
  private startTime = Date.now()
  private updateInterval: NodeJS.Timer | null = null
  private memoryInterval: NodeJS.Timer | null = null
  private listeners: Set<(metrics: PerformanceMetrics) => void> = new Set()
  
  // 연결 추적을 위한 Map
  private connections = new Map<string, { type: string; startTime: number }>()
  
  constructor(private monitoringInterval: number = 5000) {
    this.startMonitoring()
  }
  
  private startMonitoring() {
    this.updateInterval = setInterval(() => {
      this.updateMetrics()
    }, this.monitoringInterval)
    
    // Performance Observer API를 사용한 메모리 모니터링
    if ('memory' in performance) {
      this.monitorMemory()
    }
  }
  
  private monitorMemory() {
    const updateMemory = () => {
      const memory = (performance as any).memory
      if (memory) {
        this.metrics.memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024)
      }
    }
    
    // 메모리는 더 자주 업데이트
    this.memoryInterval = setInterval(updateMemory, 2000)
  }
  
  private updateMetrics() {
    const now = Date.now()
    const duration = (now - this.startTime) / 1000 // seconds
    
    // 메시지 처리율 계산
    const messageRate = duration > 0 ? this.messageCount / duration : 0
    
    // 에러율 계산
    const totalRequests = this.messageCount + this.errorCount
    const errorRate = totalRequests > 0 ? (this.errorCount / totalRequests) * 100 : 0
    
    // 평균 지연 시간 계산
    const avgLatency = this.latencies.length > 0
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0
    
    // CPU 사용률 추정 (정확한 측정은 불가능하므로 추정치 사용)
    const cpuUsage = this.estimateCPUUsage()
    
    this.metrics = {
      activeConnections: this.connections.size,
      messageRate: Math.round(messageRate * 100) / 100,
      memoryUsage: this.metrics.memoryUsage, // 별도로 업데이트됨
      avgLatency: Math.round(avgLatency),
      errorRate: Math.round(errorRate * 100) / 100,
      cpuUsage: Math.round(cpuUsage * 100) / 100,
      timestamp: now
    }
    
    this.notifyListeners()
    
    // 오래된 지연 시간 데이터 정리 (최근 100개만 유지)
    if (this.latencies.length > 100) {
      this.latencies = this.latencies.slice(-100)
    }
  }
  
  private estimateCPUUsage(): number {
    // 메시지 처리율과 활성 연결 수를 기반으로 CPU 사용률 추정
    const baseUsage = 5 // 기본 사용률
    const connectionUsage = this.connections.size * 2
    const messageUsage = this.metrics.messageRate * 0.5
    
    return Math.min(baseUsage + connectionUsage + messageUsage, 100)
  }
  
  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.metrics }))
  }
  
  // Public API
  
  public trackConnection(id: string, type: string) {
    this.connections.set(id, { type, startTime: Date.now() })
  }
  
  public untrackConnection(id: string) {
    this.connections.delete(id)
  }
  
  public trackMessage() {
    this.messageCount++
  }
  
  public trackError() {
    this.errorCount++
  }
  
  public trackLatency(latency: number) {
    this.latencies.push(latency)
  }
  
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }
  
  public getActiveConnections(): number {
    return this.connections.size
  }
  
  public onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void) {
    this.listeners.add(callback)
    
    return () => {
      this.listeners.delete(callback)
    }
  }
  
  public reset() {
    this.messageCount = 0
    this.errorCount = 0
    this.latencies = []
    this.startTime = Date.now()
  }
  
  public dispose() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
    
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval)
      this.memoryInterval = null
    }
    
    this.listeners.clear()
    this.connections.clear()
  }
}