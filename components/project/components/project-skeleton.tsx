import React from 'react'
import { AppLayout } from "@/components/layout/app-layout"

export function ProjectSkeleton() {
  return (
    <AppLayout>

      <div className="container mx-auto px-4 py-8">
        {/* 헤더 섹션 스켈레톤 */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg animate-pulse">
              <div className="h-6 w-6 bg-gray-200 rounded" />
            </div>
            <div>
              <div className="h-9 w-32 bg-gray-200 rounded mb-1 animate-pulse" />
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-11 w-32 bg-gray-200 rounded-md animate-pulse" />
        </div>

        {/* 검색바 스켈레톤 */}
        <div className="mb-8">
          <div className="h-12 w-full max-w-lg bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* 프로젝트 카드 스켈레톤 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              {/* 헤더 */}
              <div className="flex items-start justify-between mb-3">
                <div className="h-6 w-3/4 bg-gray-200 rounded" />
                <div className="p-1.5 bg-gray-100 rounded-full">
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
    </AppLayout>
  )
}