import React from 'react'
import { cn } from '@/lib/utils'

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn("w-full py-4 border-t", className)}>
      <div className="container mx-auto px-4 flex justify-end items-center">
        <p className="text-xs text-muted-foreground">
          Prototype by MISO1004
        </p>
      </div>
    </footer>
  )
} 