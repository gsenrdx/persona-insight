'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Database, CheckCircle, XCircle, AlertCircle, RefreshCw, Edit3, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

interface PersonaKnowledgeStatus {
  persona_id: string
  persona_type: string
  persona_title: string
  miso_dataset_id: string | null
  dataset_status: 'connected' | 'not_found' | 'no_dataset' | 'error'
  error_message?: string
}

interface MisoKnowledgeStatusModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  projectId?: string
  criteriaConfigurationId?: string
}

export function MisoKnowledgeStatusModal({
  open,
  onOpenChange,
  companyId,
  projectId,
  criteriaConfigurationId
}: MisoKnowledgeStatusModalProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  
  console.log('현재 사용자 프로필:', profile)
  
  // 권한 체크: company_user는 읽기 전용
  const canEdit = profile?.role !== 'company_user'

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['personas-knowledge-status', companyId, projectId, criteriaConfigurationId],
    queryFn: async () => {
      const response = await fetch('/api/knowledge/personas-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_id: companyId,
          project_id: projectId,
          criteria_configuration_id: criteriaConfigurationId
        })
      })

      if (!response.ok) {
        throw new Error('연동 상태 조회에 실패했습니다')
      }

      return response.json()
    },
    enabled: open
  })

  // 데이터셋 ID 업데이트 mutation
  const updateDatasetMutation = useMutation({
    mutationFn: async ({ personaId, datasetId }: { personaId: string, datasetId: string | null }) => {
      console.log('클라이언트에서 보내는 데이터:', { personaId, datasetId, userId: profile?.id })
      
      const response = await fetch('/api/personas/update-dataset', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          persona_id: personaId, 
          miso_dataset_id: datasetId,
          user_id: profile?.id
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '업데이트에 실패했습니다')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas-knowledge-status'] })
      toast.success('데이터셋 ID가 업데이트되었습니다')
    },
    onError: (error: any) => {
      toast.error(error.message || '업데이트에 실패했습니다')
    }
  })

  const handleDatasetIdUpdate = (personaId: string, datasetId: string | null) => {
    return updateDatasetMutation.mutateAsync({ personaId, datasetId })
  }


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge 
            variant="default" 
            className="bg-green-100 text-green-700 text-xs border-green-200 gap-1.5"
            title="데이터셋이 성공적으로 연결되었습니다"
          >
            <CheckCircle className="h-3 w-3" />
            연결됨
          </Badge>
        )
      case 'not_found':
        return (
          <Badge 
            variant="destructive" 
            className="text-xs gap-1.5"
            title="설정된 데이터셋 ID를 찾을 수 없습니다"
          >
            <XCircle className="h-3 w-3" />
            없음
          </Badge>
        )
      case 'no_dataset':
        return (
          <Badge 
            variant="secondary" 
            className="text-xs gap-1.5 text-gray-500"
            title="데이터셋 ID가 설정되지 않았습니다"
          >
            <AlertCircle className="h-3 w-3" />
            미설정
          </Badge>
        )
      case 'error':
        return (
          <Badge 
            variant="destructive" 
            className="text-xs gap-1.5"
            title="데이터셋 상태 확인 중 오류가 발생했습니다"
          >
            <XCircle className="h-3 w-3" />
            오류
          </Badge>
        )
      default:
        return (
          <Badge 
            variant="secondary" 
            className="text-xs gap-1.5 text-gray-500"
            title="알 수 없는 상태입니다"
          >
            <AlertCircle className="h-3 w-3" />
            알 수 없음
          </Badge>
        )
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(parseInt(dateString) * 1000).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 데이터셋 ID 편집 컴포넌트
  const DatasetIdEditCell = ({ persona }: { persona: PersonaKnowledgeStatus }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [value, setValue] = useState(persona.miso_dataset_id || '')
    const [isLoading, setIsLoading] = useState(false)

    const handleSave = async () => {
      const trimmedValue = value.trim()
      if (trimmedValue === (persona.miso_dataset_id || '')) {
        setIsEditing(false)
        return
      }

      try {
        setIsLoading(true)
        await handleDatasetIdUpdate(persona.persona_id, trimmedValue || null)
        setIsEditing(false)
      } catch (error) {
        // 에러는 mutation에서 이미 토스트로 처리됨
      } finally {
        setIsLoading(false)
      }
    }

    const handleCancel = () => {
      setValue(persona.miso_dataset_id || '')
      setIsEditing(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    }

    const getDisplayText = () => {
      return persona.miso_dataset_id || '미설정'
    }

    const getTooltipText = () => {
      return persona.miso_dataset_id ? `${persona.miso_dataset_id} (클릭하여 편집)` : '클릭하여 데이터셋 ID 추가'
    }

    const getDisplayStyle = () => {
      if (persona.dataset_status === 'connected') {
        return "text-blue-700 bg-blue-50 border-blue-200"
      }
      return "text-gray-700 bg-white border-gray-300"
    }

    if (!canEdit) {
      return (
        <div 
          className={`w-full text-sm px-3 py-2 rounded-lg border ${getDisplayStyle()}`}
          title={getTooltipText()}
        >
          {getDisplayText() === '미설정' ? (
            <span className="text-gray-400 italic">미설정</span>
          ) : (
            <span className="font-mono">
              {getDisplayText()}
            </span>
          )}
        </div>
      )
    }

    if (isEditing) {
      return (
        <div className="w-full flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="데이터셋 ID 입력"
            className="font-mono text-sm h-9 flex-1 min-w-0"
            disabled={isLoading}
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isLoading}
            className="h-9 w-9 p-0 flex-shrink-0"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="h-9 w-9 p-0 flex-shrink-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )
    }

    return (
      <div 
        className={`w-full group text-sm px-3 py-2 rounded-md border cursor-pointer hover:bg-gray-100 transition-all flex items-center justify-between ${getDisplayStyle()}`}
        onClick={() => setIsEditing(true)}
        title={getTooltipText()}
      >
        <span className="truncate flex-1 min-w-0">
          {getDisplayText() === '미설정' ? (
            <span className="text-gray-400 italic">미설정</span>
          ) : (
            <span className="font-mono">
              {getDisplayText()}
            </span>
          )}
        </span>
        <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[80vh] flex flex-col p-0">
        <DialogTitle className="sr-only">MISO Knowledge 연동 상태</DialogTitle>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">MISO Knowledge 연동 상태</h2>
              <p className="text-sm text-gray-500">페르소나별 데이터셋 연동 상태 관리</p>
            </div>
          </div>
          {data?.summary && (
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>전체 <span className="font-medium">{data.summary.total}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>연결 <span className="font-medium text-green-600">{data.summary.connected}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>미연결 <span className="font-medium text-gray-600">{data.summary.not_connected}</span></span>
              </div>
            </div>
          )}
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-sm text-gray-500">연동 상태를 확인하는 중...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <p className="text-sm text-red-600 mb-4">연동 상태 조회에 실패했습니다</p>
                <Button variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  다시 시도
                </Button>
              </div>
            </div>
          ) : data?.personas_status?.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-500">조회된 페르소나가 없습니다</p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <div className="min-w-full">
                {/* 테이블 헤더 */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 grid grid-cols-12 gap-4 items-center text-sm font-medium text-gray-700">
                  <div className="col-span-2">상태</div>
                  <div className="col-span-4">페르소나</div>
                  <div className="col-span-1 text-center">타입</div>
                  <div className="col-span-5">데이터셋 ID</div>
                </div>
                
                {/* 테이블 바디 */}
                <div className="divide-y divide-gray-100">
                  {data?.personas_status?.sort((a: PersonaKnowledgeStatus, b: PersonaKnowledgeStatus) => a.persona_type.localeCompare(b.persona_type)).map((persona: PersonaKnowledgeStatus) => (
                    <div key={persona.persona_id} className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-gray-50 transition-colors">
                      {/* 상태 */}
                      <div className="col-span-2">
                        {getStatusBadge(persona.dataset_status)}
                      </div>
                      
                      {/* 페르소나 */}
                      <div className="col-span-4">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900 text-sm">
                            {persona.persona_title || persona.persona_type}
                          </div>
                          {persona.error_message && (
                            <div className="text-xs text-red-600 truncate" title={persona.error_message}>
                              {persona.error_message}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 타입 */}
                      <div className="col-span-1 flex justify-center">
                        <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-mono font-semibold text-xs">
                          {persona.persona_type}
                        </div>
                      </div>
                      
                      {/* 데이터셋 ID */}
                      <div className="col-span-5">
                        <DatasetIdEditCell persona={persona} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {canEdit ? '💡 데이터셋 ID를 클릭하여 편집할 수 있습니다' : '📖 읽기 전용 모드'}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}