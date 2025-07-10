'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

interface EvidenceModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  type: 'pain' | 'need'
  evidences: Array<{
    speaker: string
    cleaned_sentence: string
    scriptId: number[]
  }>
  onNavigateToScript?: (scriptId: number[]) => void
}

export function EvidenceModal({ isOpen, onClose, title, type, evidences, onNavigateToScript }: EvidenceModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 border-0 flex flex-col">
        <VisuallyHidden>
          <DialogTitle>인터뷰 근거</DialogTitle>
        </VisuallyHidden>
        
        {/* 헤더 - 깔끔한 미니멀 디자인 */}
        <div className="px-8 py-6 bg-white border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              type === 'pain' 
                ? "bg-red-100 text-red-600" 
                : "bg-emerald-100 text-emerald-600"
            )}>
              <span className="text-lg">{type === 'pain' ? '🚨' : '💡'}</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              인터뷰 근거
            </h2>
          </div>
          <p className={cn(
            "text-base font-medium pl-13",
            type === 'pain' ? "text-gray-700" : "text-gray-700"
          )}>
            "{title}"
          </p>
        </div>

        {/* 근거 목록 - 카드 스타일 */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-8 min-h-0">
          <div className="max-w-3xl mx-auto space-y-4">
            {evidences.map((evidence, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-lg border border-gray-200 p-5"
              >
                <div className="flex items-start gap-4">
                  {/* 번호 표시 */}
                  <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm",
                    evidence.speaker === 'question' 
                      ? "bg-blue-100 text-blue-700" 
                      : "bg-gray-100 text-gray-700"
                  )}>
                    {idx + 1}
                  </div>
                  
                  {/* 내용 */}
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 leading-relaxed mb-2">
                      {evidence.cleaned_sentence}
                    </p>
                    
                    {/* 스크립트로 이동 버튼 */}
                    {onNavigateToScript && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            onNavigateToScript(evidence.scriptId)
                            onClose()
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        >
                          <span>스크립트로 이동</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 정보 바 */}
        <div className="px-8 py-4 bg-white border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>인터뷰 대화 내용</span>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-medium",
              type === 'pain' 
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700"
            )}>
              {evidences.length}개 근거
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}