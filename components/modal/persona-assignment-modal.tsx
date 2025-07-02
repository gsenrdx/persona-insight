"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePersonaDefinitions } from "@/hooks/use-persona-definitions"
import { useToast } from "@/hooks/use-toast"

interface PersonaAssignmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  interviewId: string
  currentPersonaDefinitionId?: string | null
  recommendedPersona?: string
  onAssign: (definitionId: string) => Promise<void>
}

export function PersonaAssignmentModal({
  open,
  onOpenChange,
  interviewId,
  currentPersonaDefinitionId,
  recommendedPersona,
  onAssign,
}: PersonaAssignmentModalProps) {
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<string | null>(currentPersonaDefinitionId || null)
  const [isAssigning, setIsAssigning] = useState(false)
  const { toast } = useToast()

  // 페르소나 정의 목록 가져오기
  const { data: personaDefinitions, isLoading } = usePersonaDefinitions()

  // 모달이 열릴 때 AI 추천 자동 선택
  useEffect(() => {
    if (open) {
      if (currentPersonaDefinitionId) {
        setSelectedDefinitionId(currentPersonaDefinitionId)
      } else if (recommendedPersona && personaDefinitions) {
        const recommended = personaDefinitions.find(def => def.name_ko === recommendedPersona)
        if (recommended) {
          setSelectedDefinitionId(recommended.id)
        }
      }
    }
  }, [open, recommendedPersona, personaDefinitions, currentPersonaDefinitionId])

  const handleAssign = async () => {
    if (!selectedDefinitionId) return

    setIsAssigning(true)
    try {
      await onAssign(selectedDefinitionId)
      toast({
        title: "페르소나가 반영되었습니다",
        description: "인터뷰 내용이 회사 페르소나에 반영되었습니다."
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "반영 실패",
        description: "페르소나 반영 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <div className="p-6 pb-0">
          <DialogTitle className="text-xl font-normal">페르소나 반영</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">반영 시, 회사 페르소나 대화에 반영됩니다</p>
        </div>

        <div className="px-6 pb-6">
          <ScrollArea className="h-[500px] -mx-2 px-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : personaDefinitions && personaDefinitions.length > 0 ? (
              <div className="space-y-1">
                {/* AI 추천을 맨 위에 배치 */}
                {personaDefinitions
                  .sort((a, b) => {
                    const aIsRecommended = a.name_ko === recommendedPersona
                    const bIsRecommended = b.name_ko === recommendedPersona
                    if (aIsRecommended && !bIsRecommended) return -1
                    if (!aIsRecommended && bIsRecommended) return 1
                    return 0
                  })
                  .map((definition) => {
                  const isSelected = selectedDefinitionId === definition.id
                  const isRecommended = definition.name_ko === recommendedPersona
                  
                  return (
                    <button
                      key={definition.id}
                      onClick={() => setSelectedDefinitionId(definition.id)}
                      className={cn(
                        "w-full px-6 py-4 rounded-lg transition-all text-left group",
                        "hover:bg-gray-50",
                        isSelected ? "bg-gray-100" : "bg-white",
                        isRecommended && "bg-blue-50 hover:bg-blue-100"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={cn(
                              "font-medium transition-colors text-base",
                              isSelected ? "text-gray-900" : "text-gray-700"
                            )}>
                              {definition.name_ko}
                            </h4>
                            {isRecommended && (
                              <div className="flex items-center gap-1 text-blue-600">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">AI 추천</span>
                              </div>
                            )}
                          </div>
                          {definition.description && (
                            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                              {definition.description}
                            </p>
                          )}
                        </div>
                        <div className={cn(
                          "flex-shrink-0 ml-4 w-5 h-5 rounded-full transition-all",
                          "flex items-center justify-center",
                          isSelected 
                            ? "bg-blue-600" 
                            : "bg-gray-200 group-hover:bg-gray-300"
                        )}>
                          {isSelected && (
                            <Check className="h-3 w-3 text-white" strokeWidth={3} />
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                <p>페르소나 분류 기준이 없습니다.</p>
                <p className="text-sm mt-2">관리자에게 문의해주세요.</p>
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isAssigning}
            className="text-gray-600 hover:text-gray-900"
          >
            취소
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedDefinitionId || isAssigning}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isAssigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                적용 중...
              </>
            ) : (
              "반영하기"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}