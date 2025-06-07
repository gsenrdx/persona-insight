import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function SkeletonCardGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index} className="overflow-hidden border rounded-xl border-border/40">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <CardContent className="p-4">
            <Skeleton className="h-6 w-3/4 mb-3 mt-2" />
            <div className="flex flex-wrap gap-2 mb-4">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
