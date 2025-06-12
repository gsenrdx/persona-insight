'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sparkles, User, Loader2 } from "lucide-react"
import { useAuth } from '@/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import { fetchPersonas } from '@/lib/persona-data'

interface PersonaOption {
  id: string
  persona_type: string
  persona_title: string | null
  persona_description: string
  persona_reflected?: boolean
  thumbnail: string | null
}

interface PersonaSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedPersonaId: string) => void
  recommendedPersonaId?: string | null
  isLoading?: boolean
}

export default function PersonaSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  recommendedPersonaId,
  isLoading = false
}: PersonaSelectionModalProps) {
  const { profile } = useAuth()
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('')

  // React Query로 페르소나 목록 조회 (fetchPersonas 사용)
  const { 
    data: personaCardList = [], 
    isLoading: loading 
  } = useQuery({
    queryKey: ['personas', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return []
      return await fetchPersonas(profile?.company_id)
    },
    enabled: !!profile?.company_id && isOpen,
    staleTime: 5 * 60 * 1000,
  })

  // PersonaCardData를 PersonaOption으로 변환
  const personaList: PersonaOption[] = personaCardList.map(persona => ({
    id: persona.id,
    persona_type: persona.persona_type,
    persona_title: persona.name,
    persona_description: persona.summary,
    thumbnail: persona.image && persona.image.includes('placeholder.svg') ? null : persona.image
  }))

  // AI 추천 페르소나가 있으면 맨 위로 정렬
  const personas = useMemo(() => {
    if (recommendedPersonaId) {
      return [...personaList].sort((a: PersonaOption, b: PersonaOption) => {
        if (a.id === recommendedPersonaId) return -1
        if (b.id === recommendedPersonaId) return 1
        return 0
      })
    }
    return personaList
  }, [personaList, recommendedPersonaId])

  // 추천 페르소나 처리
  useEffect(() => {
    if (recommendedPersonaId) {
      setSelectedPersonaId(recommendedPersonaId)
    }
  }, [recommendedPersonaId])

  // 초기 선택 설정 (personas가 로드되었을 때만)
  useEffect(() => {
    if (personas.length > 0 && !selectedPersonaId && !recommendedPersonaId) {
      setSelectedPersonaId(personas[0].id)
    }
  }, [personas.length, selectedPersonaId, recommendedPersonaId])

  const handleConfirm = () => {
    if (selectedPersonaId) {
      onConfirm(selectedPersonaId)
    }
  }

  const handleClose = () => {
    if (recommendedPersonaId) {
      setSelectedPersonaId(recommendedPersonaId)
    } else if (personas.length > 0) {
      setSelectedPersonaId(personas[0].id)
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            페르소나 선택
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            인터뷰 데이터를 반영할 페르소나를 선택해주세요
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">페르소나 목록을 불러오는 중...</span>
            </div>
          ) : personas.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">생성된 페르소나가 없습니다</h3>
              <p className="text-gray-500">먼저 페르소나를 생성해주세요</p>
            </div>
          ) : (
            <RadioGroup 
              value={selectedPersonaId} 
              onValueChange={setSelectedPersonaId}
              className="space-y-3"
            >
              {personas.map((persona) => (
                <div
                  key={persona.id}
                  className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPersonaId === persona.id
                      ? 'border-purple-200 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPersonaId(persona.id)}
                >
                  <RadioGroupItem 
                    value={persona.id} 
                    id={persona.id}
                    className="mt-1" 
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={persona.thumbnail || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700">
                            {persona.persona_type.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Label 
                              htmlFor={persona.id}
                              className="font-medium text-gray-900 cursor-pointer"
                            >
                              {persona.persona_title || persona.persona_type}
                            </Label>
                            {persona.id === recommendedPersonaId && (
                              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                                AI 추천
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                            {persona.persona_description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedPersonaId || isLoading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                반영 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                페르소나 반영하기
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}