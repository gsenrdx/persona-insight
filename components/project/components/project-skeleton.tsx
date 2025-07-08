import React from 'react'
import { AppLayout } from "@/components/layout/app-layout"

export function ProjectSkeleton() {
  return (
    <AppLayout>
      <div className="flex flex-col h-full min-h-0">
        {/* 헤더 - container와 일치하는 패딩 */}
        <div className="container mx-auto px-4">
          <div className="mb-6">
            {/* 헤더 배경 카드 스켈레톤 */}
            <div className="relative bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 rounded-2xl p-6 overflow-hidden animate-pulse">
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-8">
                  {/* 핀 캐릭터 위치 */}
                  <div className="w-24 h-24 bg-white/40 rounded-xl animate-pulse" />
                  
                  {/* 텍스트 콘텐츠 */}
                  <div>
                    <div className="h-8 w-64 bg-white/40 rounded-lg mb-2 animate-pulse" />
                    <div className="h-4 w-48 bg-white/30 rounded animate-pulse" />
                  </div>
                </div>
                
                {/* 버튼 위치 */}
                <div className="h-10 w-32 bg-white/40 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="container mx-auto px-4">
            {/* 검색바 스켈레톤 */}
            <div className="mb-8">
            <div className="h-10 w-full max-w-lg bg-gray-200 rounded-xl animate-pulse" />
          </div>

          {/* 프로젝트 카드 스켈레톤 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 animate-pulse">
                {/* 헤더 */}
                <div className="flex items-start justify-between mb-2">
                  <div className="h-6 w-3/4 bg-gray-200 rounded" />
                  <div className="p-1 bg-gray-100 rounded">
                    <div className="h-3.5 w-3.5 bg-gray-200 rounded" />
                  </div>
                </div>
                
                {/* 설명 */}
                <div className="space-y-2 mb-4">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-2/3 bg-gray-200 rounded" />
                </div>
                
                {/* 통계 */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 bg-gray-200 rounded" />
                    <div className="h-4 w-16 bg-gray-200 rounded" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 bg-gray-200 rounded" />
                    <div className="h-4 w-16 bg-gray-200 rounded" />
                  </div>
                </div>
                
                {/* Footer */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="h-6 w-20 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}