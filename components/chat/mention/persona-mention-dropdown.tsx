"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Command, CommandGroup, CommandList } from "@/components/ui/command"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MentionData } from "@/lib/utils/mention"

interface PersonaMentionDropdownProps {
  open: boolean
  onSelect: (mention: MentionData) => void
  onOpenChange: (open: boolean) => void
  searchText: string
  personas: Array<{
    id: string
    persona_title?: string
    name: string
    image?: string
    persona_summary?: string
  }>
}

export function PersonaMentionDropdown({
  open,
  onSelect,
  onOpenChange,
  searchText,
  personas
}: PersonaMentionDropdownProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // 검색 텍스트로 필터링된 페르소나들
  const filteredPersonas = useMemo(() => {
    if (!searchText) return personas
    
    const lowercaseSearch = searchText.toLowerCase()
    return personas.filter(persona => {
      const name = (persona.persona_title || persona.name).toLowerCase()
      return name.includes(lowercaseSearch)
    })
  }, [personas, searchText])

  // 선택된 인덱스 초기화
  useEffect(() => {
    setSelectedIndex(0)
    itemRefs.current = []
  }, [filteredPersonas])

  // 선택된 항목을 뷰포트에 스크롤
  useEffect(() => {
    if (open && scrollContainerRef.current && itemRefs.current[selectedIndex]) {
      const container = scrollContainerRef.current
      const selectedItem = itemRefs.current[selectedIndex]
      
      if (selectedItem) {
        const containerScrollTop = container.scrollTop
        
        const itemTop = selectedItem.offsetTop
        const itemBottom = itemTop + selectedItem.offsetHeight
        const containerTop = containerScrollTop
        const containerBottom = containerScrollTop + container.clientHeight
        
        if (itemTop < containerTop) {
          // 선택된 항목이 위쪽으로 벗어나면 위로 스크롤
          container.scrollTo({
            top: itemTop - 8,
            behavior: 'smooth'
          })
        } else if (itemBottom > containerBottom) {
          // 선택된 항목이 아래쪽으로 벗어나면 아래로 스크롤
          container.scrollTo({
            top: itemBottom - container.clientHeight + 8,
            behavior: 'smooth'
          })
        }
      }
    }
  }, [selectedIndex, open])

  // 키보드 이벤트 처리
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < filteredPersonas.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredPersonas.length - 1
          )
          break
        case 'Enter':
        case 'Tab':
          e.preventDefault()
          if (filteredPersonas[selectedIndex]) {
            handleSelect(filteredPersonas[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onOpenChange(false)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, filteredPersonas, selectedIndex, onOpenChange])

  const handleSelect = (persona: any) => {
    const mentionData: MentionData = {
      id: persona.id,
      name: persona.persona_title || persona.name,
      avatar: persona.image
    }
    onSelect(mentionData)
    onOpenChange(false)
  }

  if (!open) {
    return null
  }

  return (
    <div className={`absolute bottom-full left-0 right-0 mb-2 z-50 ${open ? 'block' : 'hidden'}`}>
      <div className="w-full p-0 border border-zinc-200 dark:border-zinc-700 shadow-xl rounded-xl bg-white dark:bg-zinc-900 backdrop-blur-sm">
        <Command className="rounded-xl border-0">
          <CommandList className="max-h-[240px] overflow-hidden">
            <CommandGroup className="p-2">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-2 py-1.5 mb-1">
                페르소나 멘션
              </div>
              {filteredPersonas.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  검색 결과가 없습니다.
                </div>
              ) : (
                <div 
                  ref={scrollContainerRef}
                  className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600 scrollbar-track-transparent"
                >
                  {filteredPersonas.map((persona, index) => (
                    <div
                      key={persona.id}
                      ref={(el) => {
                        itemRefs.current[index] = el
                      }}
                      onClick={() => handleSelect(persona)}
                      className={`
                        flex items-center gap-3 px-3 py-3 cursor-pointer rounded-lg transition-all duration-150
                        ${index === selectedIndex 
                          ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 shadow-sm ring-1 ring-blue-200 dark:ring-blue-800/50' 
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        }
                      `}
                    >
                      <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-transparent transition-all duration-150">
                        <AvatarImage 
                          src={persona.image} 
                          alt={persona.persona_title || persona.name}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium">
                          {(persona.persona_title || persona.name).substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate text-zinc-900 dark:text-zinc-100">
                            {persona.persona_title || persona.name}
                          </span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs px-2 py-0.5 rounded-md font-medium transition-colors ${
                              index === selectedIndex
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            @{(persona.persona_title || persona.name).toLowerCase().replace(/\s+/g, '')}
                          </Badge>
                        </div>
                        
                        {persona.persona_summary && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 leading-relaxed">
                            {persona.persona_summary}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  )
}