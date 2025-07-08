'use client'

interface Project {
  id: string
  name: string
  description: string
  company_id: string
}

interface ProjectInsightsProps {
  project: Project
}

export default function ProjectInsights({ project }: ProjectInsightsProps) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <img 
          src="/assets/pin/pin-insight.png" 
          alt="Pin Character" 
          className="w-32 h-32 mx-auto mb-8 object-contain"
        />
        <h2 className="text-3xl font-bold text-gray-900 mb-4">준비중입니다</h2>
        <p className="text-gray-600 text-lg leading-relaxed mb-6">
          상세한 인사이트 분석 기능을 준비 중입니다.
        </p>
        <p className="text-gray-500 text-sm">
          곧 더 나은 서비스로 찾아뵙겠습니다!
        </p>
      </div>
    </div>
  )
}