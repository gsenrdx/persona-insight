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
    <div className={showHeader ? "space-y-3" : ""}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">다른 페르소나와 대화하기</h3>
        </div>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost"
            className={`w-full justify-between text-left h-auto px-3 py-2 bg-white hover:bg-gray-50 text-gray-800 text-sm font-medium border border-gray-200 hover:border-gray-300 shadow-sm transition-all duration-200 rounded-lg ${
              showHeader ? '' : 'max-w-sm'
            }`}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {currentPersona.image ? (
                <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm">
                  <Image
                    src={currentPersona.image}
                    alt={currentPersona.name}
                    fill
                    className="object-cover"
                    sizes="28px"
                  />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full flex-shrink-0 bg-gray-100 flex items-center justify-center text-gray-800 border border-gray-200 text-xs font-medium">
                  {currentPersona.name.substring(0, 2)}
                </div>
              )}
              <span className="truncate flex-1 font-medium text-gray-900">{currentPersona.name}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400 ml-2 transition-transform duration-200" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-[--radix-dropdown-menu-trigger-width] max-h-80 overflow-y-auto shadow-lg border-gray-200 bg-white rounded-lg"
          align="start"
        >
          <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">페르소나 선택</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-100 mx-2"/>
          <div className="p-1">
            {allPersonas.map((persona) => (
              <Link key={persona.id} href={`/chat/${persona.id}`} passHref legacyBehavior>
                <DropdownMenuItem
                  className={`flex justify-between items-center cursor-pointer px-3 py-2 rounded-md hover:!bg-gray-50 focus:!bg-gray-50 transition-colors duration-150
                    ${currentPersonaId === persona.id ? "bg-gray-50 font-medium" : "text-gray-800"}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {persona.image ? (
                      <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
                        <Image
                          src={persona.image}
                          alt={persona.name}
                          fill
                          className="object-cover"
                          sizes="24px"
                        />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full flex-shrink-0 bg-gray-100 flex items-center justify-center text-gray-800 text-xs border border-gray-200 font-medium">
                        {persona.name.substring(0, 2)}
                      </div>
                    )}
                    <div className="truncate flex-1">
                      <p className="text-sm font-medium leading-tight truncate text-gray-900">{persona.name}</p>
                      {persona.summary && (
                        <p className="text-xs text-gray-500 truncate leading-relaxed">{persona.summary}</p>
                      )}
                    </div>
                  </div>
                  {currentPersonaId === persona.id && <Check className="h-3.5 w-3.5 text-gray-600 ml-2 flex-shrink-0" />}
                </DropdownMenuItem>
              </Link>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 