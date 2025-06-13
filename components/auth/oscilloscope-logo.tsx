'use client'

import { useState, useEffect, useMemo, useRef } from 'react'

interface OscilloscopeLogoProps {
  isLoading?: boolean
}

export default function OscilloscopeLogo({ isLoading = false }: OscilloscopeLogoProps) {
  const [isClient, setIsClient] = useState(false)
  const [noiseUpdate, setNoiseUpdate] = useState(0)
  const [mouseProximity, setMouseProximity] = useState(1) // 1 = 멀리, 0 = 가까이
  const logoRef = useRef<HTMLDivElement>(null)

  // 클라이언트 사이드에서만 실행
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 마우스 위치 추적
  useEffect(() => {
    if (!isClient) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!logoRef.current) return

      const rect = logoRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      // 로고 중심으로부터의 거리 계산
      const distance = Math.sqrt(
        Math.pow(e.clientX - centerX, 2) + 
        Math.pow(e.clientY - centerY, 2)
      )

      // 거리를 0-1 범위로 정규화 (100px 이내에서 효과)
      const normalizedDistance = Math.min(distance / 100, 1)
      setMouseProximity(normalizedDistance)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isClient])

  // 노이즈 업데이트
  useEffect(() => {
    if (!isClient) return
    
    // 로딩 중이면 더 빠르게 업데이트, 아니면 마우스 근접도에 따라
    const updateInterval = isLoading ? 50 : (100 - (1 - mouseProximity) * 80) // 20ms ~ 100ms
    
    const interval = setInterval(() => {
      setNoiseUpdate(prev => prev + 1)
    }, updateInterval)
    
    return () => clearInterval(interval)
  }, [isClient, mouseProximity, isLoading])

  // 오실로스코프 신호 생성
  const generateSignalPath = useMemo(() => {
    // 서버에서는 기본 직선 반환
    if (!isClient) {
      return 'M -100,40 L 400,40'
    }
    
    let path = ''
    const totalWidth = 400
    
    // 로딩 중이면 평평한 직선
    if (isLoading) {
      return 'M -100,40 L 400,40'
    }
    
    // 마우스가 가까울수록 노이즈 강도 증가
    const noiseMultiplier = 1 + (1 - mouseProximity) * 3 // 1x ~ 4x
    
    for (let x = -100; x < totalWidth; x += 0.5) {
      let y = 40
      
      const noiseChance = Math.random()
      
      if (noiseChance < 0.03 * noiseMultiplier) { // 큰 노이즈
        const noiseAmplitude = (3 + Math.random() * 5) * noiseMultiplier
        y += (Math.random() - 0.5) * noiseAmplitude * 2
      } else if (noiseChance < 0.1 * noiseMultiplier) { // 작은 노이즈
        const noiseAmplitude = (1 + Math.random() * 2) * noiseMultiplier
        y += (Math.random() - 0.5) * noiseAmplitude * 2
      } else if (noiseChance < 0.15 * noiseMultiplier) { // 미세한 떨림
        y += (Math.random() - 0.5) * 0.5 * noiseMultiplier
      }
      
      if (x === -100) {
        path += `M ${x},${y} `
      } else {
        path += `L ${x},${y} `
      }
    }
    
    return path
  }, [noiseUpdate, isClient, mouseProximity, isLoading])

  // 로딩 중 정현파 생성
  const generateSineWave = useMemo(() => {
    if (!isClient || !isLoading) return ''
    
    let path = ''
    const totalWidth = 400
    const amplitude = 4
    const frequency = 0.05
    
    for (let x = -100; x < totalWidth; x += 1) {
      const y = 40 + amplitude * Math.sin((x + noiseUpdate * 2) * frequency)
      
      if (x === -100) {
        path += `M ${x},${y} `
      } else {
        path += `L ${x},${y} `
      }
    }
    
    return path
  }, [noiseUpdate, isClient, isLoading])

  return (
    <div 
      ref={logoRef}
      className="w-20 h-20 mx-auto mb-6 relative overflow-hidden rounded-2xl"
    >
      <img 
        src="/logo.svg" 
        alt="Persona Insight Logo" 
        className="w-full h-full drop-shadow-lg relative z-10"
      />
      {/* 심전도 효과 오버레이 */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <svg 
          className="absolute w-full h-full"
          viewBox="0 0 80 80"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 마스크 정의 - 흰색 부분만 보이게 */}
          <defs>
            <mask id="signal-mask">
              <rect x="0" y="0" width="80" height="80" fill="black" />
              <rect x="20" y="0" width="40" height="80" fill="white" />
            </mask>
          </defs>
          
          {/* 연속적인 오실로스코프 신호 */}
          <g mask="url(#signal-mask)">
            {!isLoading ? (
              <g className="animate-signal-scroll">
                <path
                  d={generateSignalPath}
                  fill="none"
                  stroke={`rgba(59, 130, 246, ${0.9 + (1 - mouseProximity) * 0.1})`}
                  strokeWidth={1 + (1 - mouseProximity) * 0.5}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                />
                {/* 두 번째 패스로 연속성 보장 */}
                <path
                  d={generateSignalPath}
                  fill="none"
                  stroke={`rgba(59, 130, 246, ${0.9 + (1 - mouseProximity) * 0.1})`}
                  strokeWidth={1 + (1 - mouseProximity) * 0.5}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  transform="translate(400, 0)"
                />
              </g>
            ) : (
              <>
                {/* 로딩 중 평평한 기준선 */}
                <g className="animate-signal-scroll">
                  <path
                    d="M -100,40 L 400,40"
                    fill="none"
                    stroke="rgba(156, 163, 175, 0.3)"
                    strokeWidth="0.5"
                    strokeLinecap="square"
                  />
                  <path
                    d="M -100,40 L 400,40"
                    fill="none"
                    stroke="rgba(156, 163, 175, 0.3)"
                    strokeWidth="0.5"
                    strokeLinecap="square"
                    transform="translate(400, 0)"
                  />
                </g>
                {/* 로딩 중 주황색 정현파 */}
                <g className="animate-signal-scroll">
                  <path
                    d={generateSineWave}
                    fill="none"
                    stroke="rgba(249, 115, 22, 0.9)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={generateSineWave}
                    fill="none"
                    stroke="rgba(249, 115, 22, 0.9)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    transform="translate(400, 0)"
                  />
                </g>
              </>
            )}
          </g>
        </svg>
      </div>
    </div>
  )
}