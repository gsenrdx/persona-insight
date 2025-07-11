"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Check } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { PersonaSwitcherPersona, PersonaSwitcherProps } from "@/types/components"

export default function PersonaSwitcher({ currentPersona, allPersonas, currentPersonaId, showHeader = true }: PersonaSwitcherProps) {
  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-700">다른 페르소나와 대화하기</h3>
        </div>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline"
            className="w-full justify-between text-left h-auto px-3 py-2.5 bg-white hover:bg-zinc-50 text-zinc-800 text-base font-medium border-zinc-200 hover:border-zinc-300 shadow-sm transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {currentPersona.image ? (
                <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-zinc-200 shadow-sm">
                  <Image
                    src={currentPersona.image}
                    alt={currentPersona.name}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full flex-shrink-0 bg-zinc-100 flex items-center justify-center text-zinc-800 border border-zinc-200">
                  {currentPersona.name.substring(0, 2)}
                </div>
              )}
              <span className="truncate flex-1">{currentPersona.name}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-zinc-500 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-[--radix-dropdown-menu-trigger-width] max-h-96 overflow-y-auto shadow-lg border-zinc-200 bg-white"
          align="start"
        >
          <DropdownMenuLabel className="px-2 py-1.5 text-sm font-medium text-zinc-500">페르소나 선택</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-zinc-200"/>
          {allPersonas.map((persona) => (
            <Link key={persona.id} href={`/chat/${persona.id}`} passHref legacyBehavior>
              <DropdownMenuItem
                className={`flex justify-between items-center cursor-pointer m-1 px-2 py-2 rounded-md hover:!bg-zinc-100 focus:!bg-zinc-100 
                  ${currentPersonaId === persona.id ? "bg-zinc-100 font-medium" : "text-zinc-800"}`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {persona.image ? (
                    <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-zinc-200">
                      <Image
                        src={persona.image}
                        alt={persona.name}
                        fill
                        className="object-cover"
                        sizes="28px"
                      />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full flex-shrink-0 bg-zinc-100 flex items-center justify-center text-zinc-800 text-xs border border-zinc-200">
                      {persona.name.substring(0, 2)}
                    </div>
                  )}
                  <div className="truncate flex-1">
                    <p className="text-sm font-medium leading-snug truncate">{persona.name}</p>
                    {persona.summary && (
                      <p className="text-xs text-zinc-500 truncate">{persona.summary}</p>
                    )}
                  </div>
                </div>
                {currentPersonaId === persona.id && <Check className="h-4 w-4 text-blue-500 ml-2 flex-shrink-0" />}
              </DropdownMenuItem>
            </Link>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 