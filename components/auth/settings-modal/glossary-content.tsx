'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit3, 
  Trash2,
  AlertCircle,
  Info,
  Loader2,
  Check,
  X
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { GlossaryTerm, GlossaryFormData } from '@/types/glossary'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface GlossaryContentProps {
  companyId: string
}

export function GlossaryContent({ companyId }: GlossaryContentProps) {
  const { profile, session } = useAuth()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingTerm, setEditingTerm] = useState<GlossaryTerm | null>(null)
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null)
  
  const canEdit = !!profile?.company_id // 회사에 속한 모든 사용자가 편집 가능

  // 용어 목록 조회
  const { data: terms = [], isLoading, error } = useQuery({
    queryKey: ['glossary', companyId],
    queryFn: async () => {
      if (!session?.access_token) {
        throw new Error('인증 정보가 없습니다')
      }
      const response = await fetch('/api/glossary', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '용어 목록을 불러올 수 없습니다')
      }
      const result = await response.json()
      return result.data as GlossaryTerm[]
    },
    enabled: !!session?.access_token
  })

  // 용어 추가
  const addMutation = useMutation({
    mutationFn: async (data: GlossaryFormData) => {
      if (!session?.access_token) {
        throw new Error('인증 정보가 없습니다')
      }
      const response = await fetch('/api/glossary', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '용어 추가에 실패했습니다')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glossary'] })
      toast.success('용어가 추가되었습니다')
      setIsAddModalOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  // 용어 수정
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: GlossaryFormData & { id: string }) => {
      if (!session?.access_token) {
        throw new Error('인증 정보가 없습니다')
      }
      const response = await fetch(`/api/glossary/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '용어 수정에 실패했습니다')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glossary'] })
      toast.success('용어가 수정되었습니다')
      setEditingTerm(null)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  // 용어 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!session?.access_token) {
        throw new Error('인증 정보가 없습니다')
      }
      const response = await fetch(`/api/glossary/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '용어 삭제에 실패했습니다')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glossary'] })
      toast.success('용어가 삭제되었습니다')
      setSelectedTermId(null)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const filteredTerms = terms.filter(term => 
    term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
    term.definition.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDeleteTerm = (termId: string) => {
    if (confirm('이 용어를 삭제하시겠습니까?')) {
      deleteMutation.mutate(termId)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <motion.div 
            className="p-2 bg-blue-50 rounded-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <BookOpen className="h-5 w-5 text-blue-600" />
          </motion.div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">용어 사전</h3>
            <p className="text-sm text-gray-500">회사 전용 용어와 정의를 관리합니다</p>
          </div>
        </div>
      </div>

      {/* 검색 및 추가 버튼 */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-blue-50 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="용어 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/80 backdrop-blur-sm border-gray-200 focus:border-blue-300 transition-colors"
            />
          </div>
          <div className="flex items-center gap-4">
            <motion.div 
              className="flex items-center gap-2 text-sm text-gray-600"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <span>전체 <span className="font-medium text-gray-900">{terms.length}</span>개</span>
            </motion.div>
            {canEdit && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  용어 추가
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* 용어 목록 */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-sm text-gray-500">용어를 불러오는 중...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
              <p className="text-sm text-red-600">용어를 불러올 수 없습니다</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['glossary'] })}
              >
                다시 시도
              </Button>
            </div>
          </div>
        ) : filteredTerms.length === 0 ? (
          <motion.div 
            className="flex items-center justify-center h-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500">
                {searchQuery ? '검색 결과가 없습니다' : '등록된 용어가 없습니다'}
              </p>
              {!searchQuery && canEdit && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  첫 용어 추가하기
                </Button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            className="flex flex-wrap gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.05 }}
          >
            <AnimatePresence mode="popLayout">
              {filteredTerms.map((term, index) => (
                <motion.div
                  key={term.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <motion.button
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-medium transition-all",
                          "bg-white text-blue-700 hover:bg-blue-50",
                          "border border-blue-200 hover:border-blue-300",
                          "shadow-sm hover:shadow-md",
                          selectedTermId === term.id && "bg-blue-50 border-blue-300 shadow-md"
                        )}
                        onClick={() => setSelectedTermId(term.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {term.term}
                      </motion.button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 shadow-lg" align="start">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-900">{term.term}</h4>
                          {canEdit && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-gray-100"
                                onClick={() => {
                                  setEditingTerm(term)
                                  document.body.click()
                                }}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  handleDeleteTerm(term.id)
                                  document.body.click()
                                }}
                                disabled={deleteMutation.isPending}
                              >
                                {deleteMutation.isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{term.definition}</p>
                        <div className="text-xs text-gray-400 pt-2 border-t space-y-1">
                          <div>최종 수정: {new Date(term.updated_at).toLocaleDateString('ko-KR')}</div>
                          {term.updater && (
                            <div>수정자: {term.updater.name}</div>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* 푸터 */}
      <div className="px-6 py-4 border-t bg-white flex-shrink-0">
        <motion.div 
          className="text-sm text-gray-500 flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Info className="h-4 w-4" />
          {canEdit 
            ? '용어를 클릭하여 설명을 보거나 편집할 수 있습니다' 
            : '용어를 클릭하여 설명을 볼 수 있습니다'}
        </motion.div>
      </div>

      {/* 용어 추가/편집 모달 */}
      {(isAddModalOpen || !!editingTerm) && (
        <TermModal
          isOpen={isAddModalOpen || !!editingTerm}
          onClose={() => {
            setIsAddModalOpen(false)
            setEditingTerm(null)
          }}
          onSave={(data) => {
            if (editingTerm) {
              updateMutation.mutate({ id: editingTerm.id, ...data })
            } else {
              addMutation.mutate(data)
            }
          }}
          initialData={editingTerm}
          isLoading={addMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  )
}

interface TermModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: GlossaryFormData) => void
  initialData?: GlossaryTerm | null
  isLoading?: boolean
}

function TermModal({ isOpen, onClose, onSave, initialData, isLoading }: TermModalProps) {
  const [term, setTerm] = useState('')
  const [definition, setDefinition] = useState('')

  useEffect(() => {
    if (initialData) {
      setTerm(initialData.term)
      setDefinition(initialData.definition)
    } else {
      setTerm('')
      setDefinition('')
    }
  }, [initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!term.trim() || !definition.trim()) return
    
    onSave({
      term: term.trim(),
      definition: definition.trim()
    })
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      setTimeout(() => {
        setTerm('')
        setDefinition('')
      }, 200)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? '용어 편집' : '새 용어 추가'}</DialogTitle>
          <DialogDescription>
            용어와 정의를 입력하세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="term">용어 <span className="text-red-500">*</span></Label>
            <Input
              id="term"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="예: LLM"
              className="mt-1"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="definition">정의 <span className="text-red-500">*</span></Label>
            <Textarea
              id="definition"
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="용어에 대한 설명을 입력하세요"
              className="mt-1 min-h-[100px] resize-none"
              required
              disabled={isLoading}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button 
              type="submit"
              disabled={isLoading || !term.trim() || !definition.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {initialData ? '수정 중...' : '추가 중...'}
                </>
              ) : (
                <>
                  {initialData ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      수정
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      추가
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}