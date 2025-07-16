import React from 'react'
import { Button } from "@/components/ui/button"
import { Plus, LayoutGrid } from "lucide-react"

interface ProjectHeaderProps {
  projectCount: number
  onCreateProject: () => void
}

export function ProjectHeader({ 
  projectCount, 
  onCreateProject 
}: ProjectHeaderProps) {
  return (
    <div className="mb-6">
      {/* 헤더 배경 카드 */}
      <div className="relative bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 rounded-2xl p-6 overflow-hidden">
        {/* 메인 콘텐츠 - 좌측 영역 */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* 핀 캐릭터 - 좌측에 배치 */}
            <div className="w-24 h-24 flex-shrink-0">
              <img 
                src="/assets/pin/pin-project.png" 
                alt="Pin character with projects"
                className="w-full h-full object-contain drop-shadow-lg"
              />
            </div>
            
            {/* 텍스트 콘텐츠 */}
            <div>
              <div className="flex items-baseline gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  {projectCount > 0 ? (
                    <>
                      <span className="text-3xl text-blue-600">{projectCount}개</span>의 프로젝트가 있어요!
                    </>
                  ) : (
                    '아직 프로젝트가 없어요'
                  )}
                </h2>
              </div>
              
              <p className="text-sm text-gray-600">
                {projectCount > 0 
                  ? '팀원들과 함께 고객의 목소리를 들어보세요'
                  : '첫 번째 프로젝트를 만들어보세요'
                }
              </p>
            </div>
          </div>
          
          {/* 우측 액션 버튼 */}
          <Button
            onClick={onCreateProject}
            size="default"
            className="bg-white/90 hover:bg-white text-gray-800 hover:text-gray-900 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200/60 backdrop-blur-sm px-4 py-2.5 h-10 rounded-xl font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="text-sm">새 프로젝트</span>
          </Button>
        </div>
        
        {/* 장식용 배경 요소 - 브랜드 컬러로 통일 */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-200/25 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-200/25 rounded-full blur-2xl" />
      </div>
    </div>
  )
}