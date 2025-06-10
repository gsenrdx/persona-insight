"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navigationItems = [
  {
    name: "페르소나 대화",
    href: "/",
    description: "고객과 실시간 대화"
  },
  {
    name: "연간 인사이트 분석", 
    href: "/insights",
    description: "종합 데이터 분석"
  },
  {
    name: "프로젝트 관리",
    href: "/projects",
    description: "프로젝트 및 인터뷰 관리"
  }
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center">
      {navigationItems.map((item) => {
        const isActive = pathname === item.href || 
          (item.href !== "/" && pathname.startsWith(item.href))
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-4 py-3 text-sm font-medium transition-colors",
              isActive 
                ? "text-foreground font-semibold" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className={cn(
              isActive && "underline decoration-2 decoration-foreground underline-offset-4"
            )}>{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
} 