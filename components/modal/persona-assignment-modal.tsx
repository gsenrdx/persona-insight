"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { getPersonaCombinationDisplayName } from "@/lib/utils/persona-combination"
import { usePersonas } from "@/hooks/use-personas"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

interface PersonaAssignmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  interviewId: string
  currentPersonaCombinationId?: string | null
  recommendedPersona?: string
  onAssign: (combinationId: string) => Promise<void>
}

export function PersonaAssignmentModal({
  open,
  onOpenChange,
  interviewId,
  currentPersonaCombinationId,
  recommendedPersona,
  onAssign,
}: PersonaAssignmentModalProps) {
  const [selectedCombinationId, setSelectedCombinationId] = useState<string | null>(currentPersonaCombinationId || null)
  const [isAssigning, setIsAssigning] = useState(false)
  const { toast } = useToast()

  // 페르소나 조합 목록 가져오기
  const { profile } = useAuth()
  const { data: personaCombinations = [], isLoading } = usePersonas({
    companyId: profile?.company_id
  })

  // 모달이 열릴 때 AI 추천 자동 선택
  useEffect(() => {
    if (open) {
      if (currentPersonaCombinationId) {
        setSelectedCombinationId(currentPersonaCombinationId)
      } else if (recommendedPersona && personaCombinations) {
        const recommended = personaCombinations.find(combo => combo.persona_code === recommendedPersona)
        if (recommended) {
          setSelectedCombinationId(recommended.id)
        }
      }
    }
  }, [open, recommendedPersona, personaCombinations, currentPersonaCombinationId])

  const handleAssign = async () => {
    if (!selectedCombinationId) return

    setIsAssigning(true)
    try {
      await onAssign(selectedCombinationId)
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
            ) : personaCombinations && personaCombinations.length > 0 ? (
              <div className="space-y-1">
                {/* AI 추천을 맨 위에 배치 */}
                {personaCombinations
                  .sort((a, b) => {
                    const aIsRecommended = recommendedPersona ? (
                      getPersonaCombinationDisplayName(a).includes(recommendedPersona) || a.persona_code === recommendedPersona
                    ) : false
                    const bIsRecommended = recommendedPersona ? (
                      getPersonaCombinationDisplayName(b).includes(recommendedPersona) || b.persona_code === recommendedPersona
                    ) : false
                    if (aIsRecommended && !bIsRecommended) return -1
                    if (!aIsRecommended && bIsRecommended) return 1
                    return 0
                  })
                  .map((combination) => {
                  const isSelected = selectedCombinationId === combination.id
                  const isRecommended = recommendedPersona ? (
                    getPersonaCombinationDisplayName(combination).includes(recommendedPersona) || combination.persona_code === recommendedPersona
                  ) : false
                  
                  return (
                    <button
                      key={combination.id}
                      onClick={() => setSelectedCombinationId(combination.id)}
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
                              {getPersonaCombinationDisplayName(combination)}
                            </h4>
                            {isRecommended && (
                              <div className="flex items-center gap-1 text-blue-600">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">AI 추천</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                            {combination.persona_code} 유형
                          </p>
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
            disabled={!selectedCombinationId || isAssigning}
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