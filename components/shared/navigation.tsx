"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils/index"

const navigationItems = [
  {
    name: "페르소나",
    href: "/",
    description: "고객과 실시간 대화"
  },
  // {
  //   name: "인사이트", 
  //   href: "/insights",
  //   description: "연간 데이터 분석"
  // },
  {
    name: "프로젝트",
    href: "/projects",
    description: "프로젝트 및 인터뷰 관리"
  }
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {navigationItems.map((item) => {
        const isActive = pathname === item.href || 
          (item.href !== "/" && pathname.startsWith(item.href))
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              "hover:bg-gray-100",
              isActive 
                ? "text-gray-900" 
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {item.name}
            {isActive && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-600 rounded-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}