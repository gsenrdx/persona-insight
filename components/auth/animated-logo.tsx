'use client'

import { useState, useEffect, useRef } from 'react'

interface ShapeState {
  id: number
  type: string
  x: number
  y: number
  targetX: number
  targetY: number
  scale: number
  rotation: number
  opacity: number
  size: number
  convergenceProgress: number // 0-1, 로고로 수렴하는 정도
  randomMovementPhase: number // 0-1, 랜덤 움직임 강도
}

const LOGO_SHAPES = [
  { id: 1, type: 'insight-orb-blue', targetX: 45, targetY: 35, size: 87.9 },
  { id: 2, type: 'insight-orb-indigo', targetX: 55, targetY: 30, size: 121.02 },
  { id: 3, type: 'insight-orb-sky', targetX: 35, targetY: 45, size: 190.83 },
  { id: 4, type: 'insight-orb-cyan', targetX: 65, targetY: 40, size: 186.8 },
  { id: 5, type: 'insight-orb-violet', targetX: 50, targetY: 25, size: 204.02 },
  { id: 6, type: 'insight-orb-slate', targetX: 40, targetY: 55, size: 198 }
]

export default function AnimatedLogo() {
  const [shapes, setShapes] = useState<ShapeState[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeRef = useRef(0)

  // 랜덤 초기 위치 생성
  const generateRandomPosition = () => ({
    x: Math.random() * 120 - 10, // -10vw to 110vw
    y: Math.random() * 120 - 10, // -10vh to 110vh
  })

  // 초기 설정
  useEffect(() => {
    const initialShapes = LOGO_SHAPES.map((shape, index) => {
      const randomPos = generateRandomPosition()
      return {
        ...shape,
        x: randomPos.x,
        y: randomPos.y,
        scale: 0.5 + Math.random() * 1.0,
        rotation: Math.random() * 360,
        opacity: 0.4 + Math.random() * 0.3,
        convergenceProgress: 0,
        randomMovementPhase: Math.random() * Math.PI * 2, // 각 도형마다 다른 위상
      }
    })
    setShapes(initialShapes)

    // 연속적인 애니메이션 루프 시작
    startContinuousAnimation()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const startContinuousAnimation = () => {
    intervalRef.current = setInterval(() => {
      timeRef.current += 0.05
      
      setShapes(prev => prev.map((shape, index) => {
        const time = timeRef.current + shape.randomMovementPhase
        
        // 주기적으로 로고 형성 강도 변화 (20-30초 주기)
        const convergenceCycle = Math.sin(time * 0.03) * 0.5 + 0.5 // 0-1 사이
        const convergenceStrength = Math.pow(convergenceCycle, 2) // 더 급격한 변화를 위해 제곱
        
        // 랜덤 움직임 강도 (convergence와 반대)
        const randomStrength = 1 - convergenceStrength * 0.8
        
        // 랜덤 베이스 위치 (느린 변화)
        const baseX = Math.sin(time * 0.02 + index) * 40 + 50
        const baseY = Math.cos(time * 0.015 + index) * 40 + 50
        
        // 빠른 랜덤 진동
        const quickRandomX = Math.sin(time * 0.8 + index * 1.5) * 15 * randomStrength
        const quickRandomY = Math.cos(time * 0.7 + index * 2) * 15 * randomStrength
        
        // 최종 위치 계산 (랜덤 움직임 + 로고 위치로의 수렴)
        const finalX = (baseX + quickRandomX) * (1 - convergenceStrength) + 
                      shape.targetX * convergenceStrength
        const finalY = (baseY + quickRandomY) * (1 - convergenceStrength) + 
                      shape.targetY * convergenceStrength
        
        // 회전과 스케일도 시간에 따라 변화
        const rotationSpeed = 0.5 * randomStrength
        const newRotation = shape.rotation + rotationSpeed
        
        const scaleBase = 0.7 + Math.sin(time * 0.4 + index) * 0.3 * randomStrength
        const scaleConverged = 1.0 + Math.sin(time * 0.6) * 0.1 * convergenceStrength
        const finalScale = scaleBase * (1 - convergenceStrength) + scaleConverged * convergenceStrength
        
        // 투명도
        const opacityRandom = 0.4 + Math.sin(time * 0.5 + index) * 0.2 * randomStrength
        const opacityConverged = 0.8 + Math.sin(time * 0.3) * 0.2 * convergenceStrength
        const finalOpacity = opacityRandom * (1 - convergenceStrength) + opacityConverged * convergenceStrength
        
        return {
          ...shape,
          x: finalX,
          y: finalY,
          scale: finalScale,
          rotation: newRotation,
          opacity: Math.max(0.3, Math.min(1, finalOpacity)),
          convergenceProgress: convergenceStrength,
          randomMovementPhase: shape.randomMovementPhase
        }
      }))
    }, 50) // 20fps로 부드러운 애니메이션
  }

  const getShapeStyle = (shape: ShapeState) => {
    // 블러 효과 - 수렴할 때 더 선명해짐
    const blurAmount = 6 - shape.convergenceProgress * 4
    
    return {
      position: 'absolute' as const,
      width: `${shape.size * 0.8}px`,
      height: `${shape.size * 0.8}px`,
      transform: `translate(${shape.x}vw, ${shape.y}vh) scale(${shape.scale}) rotate(${shape.rotation}deg)`,
      opacity: shape.opacity,
      filter: `blur(${Math.max(1, blurAmount)}px)`,
      transition: 'none', // 자연스러운 애니메이션을 위해 transition 제거
      willChange: 'transform, opacity',
      zIndex: Math.round(shape.convergenceProgress * 10)
    }
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* 동적 도형들 */}
      {shapes.map((shape) => (
        <div
          key={shape.id}
          className={`insight-orb ${shape.type}`}
          style={getShapeStyle(shape)}
        />
      ))}

      {/* 배경 효과 - 수렴 정도에 따라 변화 */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-white/95"
        style={{ 
          opacity: 0.5 + (shapes[0]?.convergenceProgress || 0) * 0.3,
          transition: 'opacity 2s ease-in-out'
        }} 
      />
    </div>
  )
}