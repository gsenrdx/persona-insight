'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAdaptiveRealtime } from '@/hooks/use-adaptive-realtime'
import { Wifi, WifiOff, Activity, Monitor, ChevronDown, ChevronRight } from 'lucide-react'

interface AdaptiveRealtimeDebuggerProps {
  features?: string[]
  className?: string
}

/**
 * 적응형 실시간 시스템 디버거
 * 개발 환경에서만 표시되며, 현재 전략과 성능 메트릭을 보여줌
 */
export function AdaptiveRealtimeDebugger({ 
  features = ['presence', 'interview-list', 'interview-detail'],
  className 
}: AdaptiveRealtimeDebuggerProps) {
  const [expanded, setExpanded] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState(features[0])
  
  // 선택된 기능의 적응형 실시간 상태
  const { strategy, transitions, isInitialized } = useAdaptiveRealtime(selectedFeature)
  
  // 개발 환경에서만 표시
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  
  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'websocket':
        return <Wifi className="w-3 h-3 text-green-500" />
      case 'sse':
        return <Activity className="w-3 h-3 text-blue-500" />
      case 'polling':
        return <Monitor className="w-3 h-3 text-yellow-500" />
      case 'none':
        return <WifiOff className="w-3 h-3 text-gray-400" />
      default:
        return null
    }
  }
  
  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'websocket':
        return 'bg-green-100 text-green-800'
      case 'sse':
        return 'bg-blue-100 text-blue-800'
      case 'polling':
        return 'bg-yellow-100 text-yellow-800'
      case 'none':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }
  
  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50",
      className
    )}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Adaptive Realtime
            </span>
            {!expanded && (
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full flex items-center gap-1",
                getStrategyColor(strategy)
              )}>
                {getStrategyIcon(strategy)}
                {strategy}
              </span>
            )}
          </div>
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        
        {/* Content */}
        {expanded && (
          <div className="px-4 py-3 space-y-3 border-t">
            {/* Feature selector */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Feature</label>
              <select
                value={selectedFeature}
                onChange={(e) => setSelectedFeature(e.target.value)}
                className="w-full text-sm border rounded px-2 py-1"
              >
                {features.map(feature => (
                  <option key={feature} value={feature}>
                    {feature}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Current strategy */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Current Strategy</label>
              <div className={cn(
                "px-3 py-1.5 rounded flex items-center gap-2",
                getStrategyColor(strategy)
              )}>
                {getStrategyIcon(strategy)}
                <span className="text-sm font-medium">{strategy}</span>
              </div>
            </div>
            
            {/* Recent transitions */}
            {transitions.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Recent Transitions</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {transitions.slice(-3).reverse().map((transition, idx) => (
                    <div key={idx} className="text-xs bg-gray-50 rounded px-2 py-1">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{transition.from}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium">{transition.to}</span>
                      </div>
                      <div className="text-gray-500">
                        {transition.reason.replace(/_/g, ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Status */}
            <div className="flex items-center gap-2 text-xs">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isInitialized ? "bg-green-500" : "bg-gray-400"
              )} />
              <span className="text-gray-600">
                {isInitialized ? 'System Active' : 'Initializing...'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}