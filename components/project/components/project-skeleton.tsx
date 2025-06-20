import React from 'react'

export function ProjectSkeleton() {
  return (
    <>
      {/* 헤더 스켈레톤 */}
      <header className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-9 w-9 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 스켈레톤 */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* 헤더 섹션 스켈레톤 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="h-9 w-48 bg-gray-200 rounded mb-2 animate-pulse" />
            <div className="h-5 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="flex gap-4">
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-36 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* 검색바 스켈레톤 */}
        <div className="mb-6">
          <div className="h-10 w-full max-w-md bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* 프로젝트 카드 스켈레톤 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="flex items-start justify-between mb-2">
                {/* 프로젝트 이름 */}
                <div className="h-6 w-3/4 bg-gray-200 rounded" />
                {/* 더보기 버튼 */}
                <div className="h-6 w-6 bg-gray-200 rounded" />
              </div>
              
              {/* 설명 */}
              <div className="space-y-2 mb-3">
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-2/3 bg-gray-200 rounded" />
              </div>
              
              {/* 인터뷰 수 */}
              <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
              
              {/* 하단 멤버 아바타와 아이콘 */}
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {Array.from({ length: 3 }, (_, j) => (
                    <div key={j} className="w-7 h-7 bg-gray-200 rounded-full border-2 border-white" />
                  ))}
                </div>
                <div className="flex gap-1">
                  <div className="h-4 w-4 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}