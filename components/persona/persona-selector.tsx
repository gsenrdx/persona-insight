"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { PersonaSwitcherPersona } from "@/types/components"

interface PersonaSelectorProps {
  currentPersona: PersonaSwitcherPersona
  allPersonas: PersonaSwitcherPersona[]
  currentPersonaId: string
}

export default function PersonaSelector({ currentPersona, allPersonas, currentPersonaId }: PersonaSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  const filteredPersonas = allPersonas.filter(persona =>
    persona.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    persona.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <h1 className="text-lg font-semibold text-gray-900 truncate flex-1">
        {currentPersona.persona_title || currentPersona.name}
      </h1>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="text-gray-700 hover:text-gray-900 border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 font-medium text-xs px-3 py-2 rounded-lg transition-all duration-200"
          >
            변경
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">페르소나 선택</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 검색 입력 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="페르소나 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 focus:border-gray-300 rounded-lg"
              />
            </div>
            
            {/* 페르소나 그리드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {filteredPersonas.map((persona) => (
                <Link 
                  key={persona.id} 
                  href={`/chat/${persona.id}`}
                  onClick={() => setIsOpen(false)}
                  className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md ${
                    currentPersonaId === persona.id 
                      ? "border-gray-300 bg-gray-50 shadow-sm" 
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {persona.image ? (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm">
                        <Image
                          src={persona.image}
                          alt={persona.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full flex-shrink-0 bg-gray-100 flex items-center justify-center text-gray-800 border border-gray-200 font-medium">
                        {persona.name.substring(0, 2)}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {persona.persona_title || persona.name}
                      </h3>
                      {persona.summary && (
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                          {persona.summary}
                        </p>
                      )}
                    </div>
                    
                    {currentPersonaId === persona.id && (
                      <div className="w-2 h-2 bg-gray-600 rounded-full flex-shrink-0"></div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            
            {filteredPersonas.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}