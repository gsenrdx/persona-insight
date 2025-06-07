"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface PersonaHeaderProps {
  name: string
  image?: string
  keywords: string[]
  insight: string
  painPoint: string
  hiddenNeeds: string
}

export default function PersonaHeader({ name, image, keywords, insight, painPoint, hiddenNeeds }: PersonaHeaderProps) {
  return (
    <div className="space-y-5">
      {/* 프로필 섹션 */}
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-primary/15 shadow-md">
          <Image
            src={image || `/placeholder.svg?height=128&width=128&query=${encodeURIComponent(name)}`}
            alt={name}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>

        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground truncate bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">{name}</h2>
          <p className="text-sm text-muted-foreground line-clamp-1">{insight}</p>
        </div>
      </div>

      {/* 키워드 섹션 */}
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((keyword, index) => (
          <Badge key={index} variant="outline" className="text-xs rounded-md py-0.5 h-6 px-2 bg-primary/5 border-primary/10 hover:bg-primary/10 transition-colors">
            {keyword}
          </Badge>
        ))}
      </div>

      {/* 페르소나 정보 - 항상 표시 */}
      <div className="bg-background/50 backdrop-blur-sm rounded-lg border border-muted/50 shadow-sm p-4">
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="text-xs font-medium text-primary/90 mb-1.5 flex items-center">
              <span className="inline-block w-1.5 h-1.5 bg-primary/80 rounded-full mr-1.5"></span>
              인사이트
            </h3>
            <p className="text-sm leading-relaxed">{insight}</p>
          </div>
          
          <Separator className="bg-muted/50" />
          
          <div>
            <h3 className="text-xs font-medium text-primary/90 mb-1.5 flex items-center">
              <span className="inline-block w-1.5 h-1.5 bg-primary/80 rounded-full mr-1.5"></span>
              페인 포인트
            </h3>
            <p className="text-sm leading-relaxed">{painPoint}</p>
          </div>
          
          <Separator className="bg-muted/50" />
          
          <div>
            <h3 className="text-xs font-medium text-primary/90 mb-1.5 flex items-center">
              <span className="inline-block w-1.5 h-1.5 bg-primary/80 rounded-full mr-1.5"></span>
              숨겨진 니즈
            </h3>
            <p className="text-sm leading-relaxed">{hiddenNeeds}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
