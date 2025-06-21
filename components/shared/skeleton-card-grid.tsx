import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils/index"
import { useTheme } from "next-themes"

export default function SkeletonCardGrid() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4 py-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div 
          key={index} 
          className={cn(
            "relative h-full overflow-hidden rounded-xl border shadow-sm",
            isDark 
              ? "bg-zinc-900 border-zinc-800" 
              : "bg-white border-slate-200"
          )}
        >
          {/* 카드 내용 */}
          <div className="relative p-4 h-full flex flex-col z-10">
            {/* 헤더 영역 - 이름 + 타입 배지 */}
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            
            {/* 설명 영역 */}
            <div className="mb-4">
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-5/6 mb-2" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            
            {/* 구분선 (투명) */}
            <div className="h-px w-full my-3 bg-transparent" />
            
            {/* 빈 공간 */}
            <div className="flex-grow min-h-[20px]" />
            
            {/* 하단 채팅 버튼 영역 */}
            <div className={cn(
              "self-stretch flex items-center justify-between pt-3",
              isDark
                ? "border-t border-zinc-800" 
                : "border-t border-zinc-100"
            )}>
              <div className="flex items-center">
                <Skeleton className="h-3 w-3 rounded-full mr-2" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          </div>
          
          {/* 배경 그라데이션 원형 */}
          <div className={cn(
            "absolute bottom-0 right-0 w-32 h-32 rounded-full -mr-10 -mb-10 z-0",
            isDark
              ? "bg-gradient-to-br from-indigo-600/10 to-indigo-900/5" 
              : "bg-gradient-to-br from-indigo-100/50 to-indigo-300/20"
          )} />
          
          {/* 페르소나 이미지 스켈레톤 */}
          <div className="absolute -bottom-2 -right-2 w-32 h-32 z-10">
            <Skeleton className="w-full h-full rounded-full opacity-60" />
          </div>
        </div>
      ))}
    </div>
  )
}
