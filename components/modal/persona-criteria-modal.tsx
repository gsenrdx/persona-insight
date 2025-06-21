'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Plus, Eye, Image, Loader2, AlertTriangle, Upload, Database } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import {
  fetchPersonaCriteria,
  createPersonaCriteria,
  updatePersonaCriteria,
  generateOutputConfig,
  generatePersonaMatrixCoordinates,
  createSystemPrompt,
} from '@/lib/api/persona-criteria'
import {
  type Axis,
  type Segment,
  type UnclassifiedCell,
  type PersonaMatrixItem,
  type OutputConfig,
  type ScoringGuidelines,
  type CreatePersonaCriteriaData,
  type UpdatePersonaCriteriaData,
} from '@/types/persona-criteria'

interface PersonaCriteriaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string // 프로젝트별 설정인 경우
}

const createInitialSegments = (count: number, prefix: string): Segment[] =>
  Array.from({ length: count }, (_, i) => ({
    name: `${prefix} ${i + 1}`,
    description: '',
    is_unclassified: false,
  }))

const initialPersonaForm = { title: '', description: '', personaType: '', thumbnail: '' }

// 페르소나 타입 생성 함수 (A, B, C, D...)
const generatePersonaTypes = (maxCount: number): string[] => {
  const types: string[] = []
  for (let i = 0; i < maxCount; i++) {
    if (i < 26) {
      types.push(String.fromCharCode(65 + i)) // A-Z
    } else {
      // AA, AB, AC...
      const firstChar = String.fromCharCode(65 + Math.floor(i / 26) - 1)
      const secondChar = String.fromCharCode(65 + (i % 26))
      types.push(firstChar + secondChar)
    }
  }
  return types
}

export const PersonaCriteriaModal = ({
  open,
  onOpenChange,
  projectId,
}: PersonaCriteriaModalProps) => {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  // 읽기 모드 여부 판단 (company_user는 읽기 전용)
  const isReadOnly = profile?.role === 'company_user'

  // 프롬프트 미리보기 모달 상태
  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false)
  const [previewPrompt, setPreviewPrompt] = useState('')
  const [loadingPrompt, setLoadingPrompt] = useState(false)

  // DB에서 기존 설정 불러오기
  const { data: existingConfig, isLoading: configLoading } = useQuery({
    queryKey: ['persona-criteria', profile?.company_id, projectId],
    queryFn: () => fetchPersonaCriteria(profile?.company_id!, projectId),
    enabled: !!profile?.company_id && open,
    staleTime: 5 * 60 * 1000, // 5분
  })

  // 초기 축 설정
  const createInitialAxis = (name: string, description: string, lowLabel: string, highLabel: string): Axis => ({
    name,
    description,
    low_end_label: lowLabel,
    high_end_label: highLabel,
    segments: createInitialSegments(3, `${name} 구분`),
  })

  // 상태 관리
  const [xAxis, setXAxis] = useState<Axis>(createInitialAxis('X축', 'X축에 대한 설명을 입력하세요.', '좌측', '우측'))
  const [yAxis, setYAxis] = useState<Axis>(createInitialAxis('Y축', 'Y축에 대한 설명을 입력하세요.', '하단', '상단'))
  const [personaTypes, setPersonaTypes] = useState<PersonaMatrixItem[]>([])
  const [unclassifiedCells, setUnclassifiedCells] = useState<UnclassifiedCell[]>([])
  const [outputConfig, setOutputConfig] = useState<OutputConfig>(generateOutputConfig(xAxis, yAxis))
  const [scoringGuidelines, setScoringGuidelines] = useState<ScoringGuidelines>({
    x_axis_low_description: '',
    x_axis_high_description: '',
    y_axis_low_description: '',
    y_axis_high_description: '',
  })

  // 축 설정이 변경될 때마다 output_config 자동 업데이트
  useEffect(() => {
    const newOutputConfig = generateOutputConfig(xAxis, yAxis)
    setOutputConfig(newOutputConfig)
  }, [xAxis.name, xAxis.low_end_label, xAxis.high_end_label, yAxis.name, yAxis.low_end_label, yAxis.high_end_label])

  // DB에서 불러온 설정으로 상태 초기화
  useEffect(() => {
    if (existingConfig && open) {
      setXAxis(existingConfig.x_axis)
      setYAxis(existingConfig.y_axis)
      setUnclassifiedCells(existingConfig.unclassified_cells)
      setOutputConfig(existingConfig.output_config)
      setScoringGuidelines(existingConfig.scoring_guidelines)
      
      // persona_matrix를 배열로 변환
      const personaArray = Object.entries(existingConfig.persona_matrix).map(([key, persona]) => ({
        ...(persona as PersonaMatrixItem),
        // personaType이 없으면 빈 문자열로 처리
        personaType: (persona as any).personaType || ''
      }))
      setPersonaTypes(personaArray)
    } else if (open && !existingConfig) {
      // 기본값으로 초기화
      const defaultXAxis = createInitialAxis('X축', 'X축에 대한 설명을 입력하세요.', '좌측', '우측')
      const defaultYAxis = createInitialAxis('Y축', 'Y축에 대한 설명을 입력하세요.', '하단', '상단')
      
      setXAxis(defaultXAxis)
      setYAxis(defaultYAxis)
      setPersonaTypes([])
      setUnclassifiedCells([])
      setOutputConfig(generateOutputConfig(defaultXAxis, defaultYAxis))
      setScoringGuidelines({
        x_axis_low_description: '',
        x_axis_high_description: '',
        y_axis_low_description: '',
        y_axis_high_description: '',
      })
    }
  }, [existingConfig, open])

  // 프롬프트 미리보기 생성
  const handlePromptPreview = async () => {
    if (!profile?.company_id) {
      toast.error('사용자 인증 정보가 없습니다')
      return
    }

    setLoadingPrompt(true)
    try {
      // 현재 설정 임시 저장하여 프롬프트 생성
      const tempConfig = {
        x_axis: xAxis,
        y_axis: yAxis,
        output_config: outputConfig,
        scoring_guidelines: scoringGuidelines,
      }

      // 중앙화된 함수로 프롬프트 생성
      const prompt = createSystemPrompt(tempConfig)
      setPreviewPrompt(prompt)
      setPromptPreviewOpen(true)
    } catch (error) {
      toast.error('프롬프트 미리보기 생성에 실패했습니다')
    } finally {
      setLoadingPrompt(false)
    }
  }

  // 생성 Mutation
  const createMutation = useMutation({
    mutationFn: createPersonaCriteria,
    onSuccess: () => {
      toast.success('페르소나 분류 기준이 저장되었습니다')
      queryClient.invalidateQueries({ queryKey: ['persona-criteria'] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.message || '저장에 실패했습니다')
    },
  })

  // 업데이트 Mutation
  const updateMutation = useMutation({
    mutationFn: updatePersonaCriteria,
    onSuccess: () => {
      toast.success('페르소나 분류 기준이 업데이트되었습니다')
      queryClient.invalidateQueries({ queryKey: ['persona-criteria'] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.message || '업데이트에 실패했습니다')
    },
  })

  const handleCellUpdate = (
    xIndex: number,
    yIndex: number,
    update: {
      formData?: typeof initialPersonaForm
      isUnclassified?: boolean
      personaId?: string
    },
  ) => {
    const { formData, isUnclassified, personaId } = update

    if (isUnclassified) {
      setUnclassifiedCells(prev =>
        prev.some(c => c.xIndex === xIndex && c.yIndex === yIndex)
          ? prev
          : [...prev, { xIndex, yIndex }],
      )
      setPersonaTypes(prev => prev.filter(p => !(p.xIndex === xIndex && p.yIndex === yIndex)))
      return
    }

    setUnclassifiedCells(prev => prev.filter(c => !(c.xIndex === xIndex && c.yIndex === yIndex)))

    // 해당 좌표에 이미 있는 페르소나 찾기
    const existingPersonaAtCell = personaTypes.find(p => p.xIndex === xIndex && p.yIndex === yIndex)

    if (personaId && formData) {
      // ID로 업데이트
      setPersonaTypes(prev => prev.map(p => (p.id === personaId ? { 
        ...p, 
        title: formData.title,
        description: formData.description,
        personaType: formData.personaType,
        thumbnail: formData.thumbnail
      } : p)))
    } else if (existingPersonaAtCell && formData) {
      // 해당 좌표에 이미 페르소나가 있으면 업데이트
      setPersonaTypes(prev => prev.map(p => (p.id === existingPersonaAtCell.id ? { 
        ...p, 
        title: formData.title,
        description: formData.description,
        personaType: formData.personaType,
        thumbnail: formData.thumbnail
      } : p)))
    } else if (formData && (formData.title || formData.description)) {
      // 새로운 페르소나 생성
      const coordinates = generatePersonaMatrixCoordinates(xAxis.segments.length, yAxis.segments.length)
      const coordinate = coordinates.find(c => c.xIndex === xIndex && c.yIndex === yIndex)
      const coordinateLabel = coordinate?.label || `${String.fromCharCode(65 + yIndex)}${xIndex + 1}`
      
      setPersonaTypes(prev => [
        ...prev,
        { 
          title: formData.title || `${coordinateLabel}형 페르소나`,
          description: formData.description,
          personaType: formData.personaType,
          thumbnail: formData.thumbnail,
          id: crypto.randomUUID(), 
          xIndex, 
          yIndex,
        },
      ])
    }
  }

  const [personaDeleteConfirm, setPersonaDeleteConfirm] = useState<{
    show: boolean
    personaId: string
    personaTitle: string
  }>({ show: false, personaId: '', personaTitle: '' })

  const handleDeletePersona = (id: string) => {
    const persona = personaTypes.find(p => p.id === id)
    if (persona) {
      setPersonaDeleteConfirm({
        show: true,
        personaId: id,
        personaTitle: persona.title || persona.personaType || '페르소나'
      })
    }
  }

  const confirmDeletePersona = () => {
    const { personaId } = personaDeleteConfirm
    setPersonaTypes(personaTypes.filter(p => p.id !== personaId))
    setPersonaDeleteConfirm({ show: false, personaId: '', personaTitle: '' })
  }

  const handleSegmentUpdate = (axis: 'x' | 'y', index: number, data: Partial<Segment>) => {
    const setAxis = axis === 'x' ? setXAxis : setYAxis
    setAxis(prev => {
      const newSegments = [...prev.segments]
      newSegments[index] = { ...newSegments[index], ...data }
      return { ...prev, segments: newSegments }
    })
  }

  const handleDividerChange = (axis: 'x' | 'y', count: number) => {
    const setAxis = axis === 'x' ? setXAxis : setYAxis
    const prefix = axis === 'x' ? '가로 유형' : '세로 유형'
    setAxis(prev => ({ ...prev, segments: createInitialSegments(count, prefix) }))
    setPersonaTypes(prevPersonas =>
      prevPersonas.filter(p => (axis === 'x' ? p.xIndex < count : p.yIndex < count)),
    )
    setUnclassifiedCells(prevCells =>
      prevCells.filter(c => (axis === 'x' ? c.xIndex < count : c.yIndex < count)),
    )
  }

  const handleSave = async () => {
    if (!profile?.company_id || !profile?.id) {
      toast.error('사용자 인증 정보가 없습니다')
      return
    }

    try {
      // 1. 먼저 페르소나 분류 기준 저장
      const personaMatrix = personaTypes.reduce((acc, persona) => {
        acc[persona.id] = persona
        return acc
      }, {} as Record<string, PersonaMatrixItem>)

      const saveData = {
        project_id: projectId,
        company_id: profile.company_id,
        x_axis: xAxis,
        y_axis: yAxis,
        unclassified_cells: unclassifiedCells,
        persona_matrix: personaMatrix,
        output_config: outputConfig,
        scoring_guidelines: scoringGuidelines,
      }

      if (existingConfig) {
        const updateData: UpdatePersonaCriteriaData = {
          ...saveData,
          id: existingConfig.id,
          user_id: profile.id,
        }
        await updateMutation.mutateAsync(updateData)
      } else {
        const createData: CreatePersonaCriteriaData = {
          ...saveData,
          created_by: profile.id,
        }
        await createMutation.mutateAsync(createData)
      }

      // 2. personas 테이블 동기화
      await syncPersonasTable()
      
    } catch (error) {
      // 페르소나 분류 기준 저장 오류
      // 에러는 mutation에서 처리됨
    }
  }

  const syncPersonasTable = async () => {
    try {
      // persona_type이 비어있는 페르소나들 필터링
      const validPersonas = personaTypes.filter(p => p.personaType && p.personaType.trim() !== '')
      
      if (validPersonas.length === 0) {
        return
      }

      // 1. 기존 페르소나 데이터 조회
      let existingPersonasMap: Map<string, any> = new Map()
      
      try {
        const existingResponse = await fetch(`/api/supabase/personas?company_id=${profile?.company_id}&active=true`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
        if (existingResponse.ok) {
          const existingData = await existingResponse.json()
          if (existingData.success && existingData.data) {
            // persona_type을 키로 하는 Map 생성
            existingPersonasMap = new Map(
              existingData.data.map((p: any) => [p.persona_type, p])
            )
          }
        }
      } catch (error) {
        // 기존 페르소나 조회 실패, 새로 생성
      }

      const syncData = {
        company_id: profile?.company_id,
        project_id: projectId,
        x_segments_count: xAxis.segments.length,
        y_segments_count: yAxis.segments.length,
        criteria_configuration_id: existingConfig?.id, // 기준 설정 ID 추가
        personas: validPersonas.map(p => {
          const existingPersona = existingPersonasMap.get(p.personaType)
          
          return {
            id: existingPersona?.id, // 기존 페르소나 ID 포함
            persona_type: p.personaType,
            persona_title: p.title,
            persona_description: p.description,
            thumbnail: (p as any).thumbnail || null,
            matrix_position: {
              xIndex: p.xIndex,
              yIndex: p.yIndex,
              coordinate: generatePersonaMatrixCoordinates(xAxis.segments.length, yAxis.segments.length)
                .find(c => c.xIndex === p.xIndex && c.yIndex === p.yIndex)?.label || ''
            }
          }
        })
      }

      const response = await fetch('/api/personas/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(syncData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '페르소나 동기화에 실패했습니다')
      }

      const { success, error, message } = await response.json()
      if (!success) {
        throw new Error(error || '페르소나 동기화에 실패했습니다')
      }
      
      if (message) {
        toast.success(message)
      }
    } catch (error) {
      // 페르소나 테이블 동기화 오류
      toast.error('페르소나 동기화 중 오류가 발생했습니다')
    }
  }

  const EditPopover = ({
    trigger,
    onSave,
    initialValue,
  }: {
    trigger: React.ReactNode
    onSave: (data: Omit<Segment, 'is_unclassified'> & { is_unclassified: boolean }) => void
    initialValue: Segment
  }) => {
    const [name, setName] = useState(initialValue.name)
    const [description, setDescription] = useState(initialValue.description)
    const [isUnclassified, setIsUnclassified] = useState(initialValue.is_unclassified)

    // 읽기 모드일 때는 Popover를 비활성화
    if (isReadOnly) {
      return <>{trigger}</>
    }

    return (
      <Popover>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">구분 수정</h4>
              <p className="text-sm text-muted-foreground">
                구분의 이름, 설명을 수정하거나 축 전체를 미분류 처리합니다.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="unclassify-segment"
                checked={isUnclassified}
                onCheckedChange={checked => setIsUnclassified(Boolean(checked))}
              />
              <Label htmlFor="unclassify-segment">이 축 미분류 처리</Label>
            </div>

            <hr />

            <div className="grid gap-2" style={{ opacity: isUnclassified ? 0.5 : 1 }}>
              <div className="space-y-1">
                <Label htmlFor="seg-name">이름</Label>
                <Input
                  id="seg-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={isUnclassified}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="seg-desc">설명</Label>
                <Textarea
                  id="seg-desc"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={isUnclassified}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => onSave({ name, description, is_unclassified: isUnclassified })}
              >
                저장
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  const PersonaEditDialog = ({
    persona,
    onCellUpdate,
    onDelete,
    children,
    disabled,
    xIndex,
    yIndex,
    isCurrentlyUnclassified,
  }: {
    persona: Omit<PersonaMatrixItem, 'xIndex' | 'yIndex'> | null
    onCellUpdate: (
      xIndex: number,
      yIndex: number,
      update: {
        formData?: typeof initialPersonaForm
        isUnclassified?: boolean
        personaId?: string
      },
    ) => void
    onDelete: (id: string) => void
    children: React.ReactNode
    disabled?: boolean
    xIndex: number
    yIndex: number
    isCurrentlyUnclassified: boolean
  }) => {
    const [formData, setFormData] = useState(initialPersonaForm)
    const [markAsUnclassified, setMarkAsUnclassified] = useState(isCurrentlyUnclassified)
    const [isOpen, setIsOpen] = useState(false)
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)
    const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [initialFormData, setInitialFormData] = useState(initialPersonaForm)
    const [showImagePromptDialog, setShowImagePromptDialog] = useState(false)
    const [imagePrompt, setImagePrompt] = useState('')
    const [isUploadingImage, setIsUploadingImage] = useState(false)

    // 최대 셀 개수 계산 (드롭다운 옵션 개수)
    const maxCells = xAxis.segments.length * yAxis.segments.length
    const availablePersonaTypes = generatePersonaTypes(maxCells)
    
    // 이미 사용된 persona_type 찾기
    const usedPersonaTypes = personaTypes
      .filter(p => p.id !== persona?.id) // 현재 편집 중인 페르소나는 제외
      .map(p => p.personaType)
      .filter(Boolean)

    // 사용 가능한 옵션 필터링
    const availableOptions = availablePersonaTypes.filter(type => !usedPersonaTypes.includes(type))

    useEffect(() => {
      if (isOpen) {
        const currentFormData = persona
          ? {
              title: persona.title,
              description: persona.description,
              personaType: (persona as any).personaType || '',
              thumbnail: (persona as any).thumbnail || '',
            }
          : initialPersonaForm
        
        setFormData(currentFormData)
        setInitialFormData(currentFormData)
        setMarkAsUnclassified(isCurrentlyUnclassified)
        setHasUnsavedChanges(false)
      }
    }, [isOpen, persona, isCurrentlyUnclassified])

    // 폼 데이터 변경 감지
    useEffect(() => {
      if (isOpen) {
        const hasChanges = (
          formData.title !== initialFormData.title ||
          formData.description !== initialFormData.description ||
          formData.personaType !== initialFormData.personaType ||
          formData.thumbnail !== initialFormData.thumbnail ||
          markAsUnclassified !== isCurrentlyUnclassified
        )
        setHasUnsavedChanges(hasChanges)
      }
    }, [formData, markAsUnclassified, initialFormData, isCurrentlyUnclassified, isOpen])

    const handleSaveClick = () => {
      onCellUpdate(xIndex, yIndex, {
        formData: markAsUnclassified ? undefined : formData,
        isUnclassified: markAsUnclassified,
        personaId: persona?.id,
      })
      setHasUnsavedChanges(false)
      setIsOpen(false)
    }

    const handleCloseAttempt = () => {
      if (hasUnsavedChanges) {
        setShowUnsavedChangesDialog(true)
      } else {
        setIsOpen(false)
      }
    }

    const handleForceClose = () => {
      setShowUnsavedChangesDialog(false)
      setHasUnsavedChanges(false)
      setIsOpen(false)
    }

    const handleDeleteClick = () => {
      if (persona?.id) {
        onDelete(persona.id)
        setHasUnsavedChanges(false)
        setIsOpen(false)
      }
    }

    const handleOpenImagePromptDialog = () => {
      // 빈 프롬프트로 시작
      setImagePrompt('')
      setShowImagePromptDialog(true)
    }

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // 파일 타입 검증
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        toast.error('JPEG, PNG, WebP 형식의 이미지만 업로드 가능합니다')
        return
      }

      // 파일 크기 검증 (5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        toast.error('파일 크기가 너무 큽니다. 5MB 이하의 파일만 업로드 가능합니다')
        return
      }

      setIsUploadingImage(true)
      
      try {
        const formData = new FormData()
        formData.append('image', file)

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/upload-persona-image`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: formData,
          }
        )

        if (!response.ok) {
          throw new Error('이미지 업로드에 실패했습니다')
        }

        const result = await response.json()
        
        if (result.success && result.url) {
          setFormData(prev => ({ ...prev, thumbnail: result.url }))
          toast.success('이미지가 성공적으로 업로드되었습니다!')
          
          // 압축 정보 표시
          if (result.metadata?.compressionRatio > 0) {
            toast.info(`이미지가 ${result.metadata.compressionRatio}% 압축되어 최적화되었습니다`)
          }
        } else {
          throw new Error(result.error || '이미지 업로드에 실패했습니다')
        }
      } catch (error) {
        // 이미지 업로드 오류
        toast.error(error instanceof Error ? error.message : '이미지 업로드 중 오류가 발생했습니다')
      } finally {
        setIsUploadingImage(false)
        // 파일 입력 초기화
        if (event.target) {
          event.target.value = ''
        }
      }
    }




    const handleGenerateThumbnail = async (customPrompt: string) => {
      if (!customPrompt.trim()) {
        toast.error('이미지 생성 프롬프트를 입력해주세요')
        return
      }

      setIsGeneratingThumbnail(true)
      setShowImagePromptDialog(false)
      
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-persona-image`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              description: customPrompt,
              style: '3D animation style, Disney Pixar character',
              character_type: 'persona character',
              additional_info: 'professional, clean, modern design'
            }),
          }
        )

        if (!response.ok) {
          throw new Error('이미지 생성에 실패했습니다')
        }

        const result = await response.json()
        
        if (result.success && result.url) {
          setFormData(prev => ({ ...prev, thumbnail: result.url }))
          toast.success('썸네일이 성공적으로 생성되었습니다!')
        } else {
          throw new Error(result.error || '이미지 생성에 실패했습니다')
        }
      } catch (error) {
        // 썸네일 생성 오류
        toast.error(error instanceof Error ? error.message : '썸네일 생성 중 오류가 발생했습니다')
      } finally {
        setIsGeneratingThumbnail(false)
      }
    }
    
    // 읽기 모드일 때는 Popover를 비활성화
    if (isReadOnly) {
      return <>{children}</>
    }

    return (
      <>
        <div 
          onClick={() => !disabled && !isReadOnly && setIsOpen(true)} 
          className={`w-full h-full ${!disabled && !isReadOnly ? 'cursor-pointer' : ''}`}
        >
          {children}
        </div>

        <Dialog open={isOpen} onOpenChange={handleCloseAttempt}>
          <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {persona ? '페르소나 수정' : '페르소나 분류'}
                {hasUnsavedChanges && (
                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                    미저장
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>
                페르소나를 추가하거나 영역을 미분류 처리합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="unclassify-cell"
                  checked={markAsUnclassified}
                  onCheckedChange={checked => setMarkAsUnclassified(Boolean(checked))}
                />
                <Label htmlFor="unclassify-cell">이 영역 미분류 처리</Label>
              </div>

              <hr />

              <div className="space-y-4" style={{ opacity: markAsUnclassified ? 0.5 : 1 }}>
                <div className="space-y-2">
                  <Label htmlFor="persona-type">페르소나 타입</Label>
                  <Select
                    value={formData.personaType}
                    onValueChange={value => setFormData({ ...formData, personaType: value })}
                    disabled={markAsUnclassified || isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="타입 선택 (A, B, C...)" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* 현재 페르소나의 타입이 있으면 항상 표시 */}
                      {formData.personaType && !availableOptions.includes(formData.personaType) && (
                        <SelectItem value={formData.personaType}>
                          {formData.personaType} (현재 선택됨)
                        </SelectItem>
                      )}
                      {/* 사용 가능한 옵션들 */}
                      {availableOptions.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {usedPersonaTypes.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      사용됨: {usedPersonaTypes.join(', ')}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="title">타이틀</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    disabled={markAsUnclassified}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">설명</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    disabled={markAsUnclassified}
                    rows={3}
                  />
                </div>
                
                {/* 썸네일 선택 섹션 */}
                <div className="space-y-3">
                  <Label>썸네일</Label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOpenImagePromptDialog}
                        disabled={markAsUnclassified || isGeneratingThumbnail || isUploadingImage}
                        className="w-full"
                      >
                        {isGeneratingThumbnail ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Image className="h-4 w-4 mr-2" />
                        )}
                        {isGeneratingThumbnail ? '생성 중...' : 'AI 생성'}
                      </Button>
                      
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageUpload}
                          disabled={markAsUnclassified || isGeneratingThumbnail || isUploadingImage}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                          id="image-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={markAsUnclassified || isGeneratingThumbnail || isUploadingImage}
                          className="w-full pointer-events-none"
                          asChild
                        >
                          <label htmlFor="image-upload" className="pointer-events-auto cursor-pointer">
                            {isUploadingImage ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Upload className="h-4 w-4 mr-2" />
                            )}
                            {isUploadingImage ? '업로드 중...' : '직접 업로드'}
                          </label>
                        </Button>
                      </div>
                    </div>
                    
                    {formData.thumbnail && (
                      <div className="space-y-2">
                        <div className="flex justify-center">
                          <img
                            src={formData.thumbnail}
                            alt="페르소나 썸네일 미리보기"
                            className="w-24 h-24 object-cover rounded-lg border shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        </div>
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData(prev => ({ ...prev, thumbnail: '' }))}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={markAsUnclassified}
                          >
                            이미지 제거
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {!formData.thumbnail && (
                      <div className="text-xs text-muted-foreground text-center bg-blue-50 p-3 rounded space-y-2">
                        <p className="font-medium">💡 썸네일 추가 방법</p>
                        <div className="text-left space-y-1">
                          <p>• <strong>AI 생성:</strong> 키워드로 맞춤형 이미지 생성</p>
                          <p>• <strong>직접 업로드:</strong> 기존 이미지 파일 업로드</p>
                          <p className="text-gray-500">※ 업로드된 이미지는 512x512로 자동 최적화됩니다</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-shrink-0">
              <div className="flex justify-between w-full">
                {persona && (
                  <Button variant="destructive" size="sm" onClick={handleDeleteClick}>
                    삭제
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" onClick={handleCloseAttempt}>
                    취소
                  </Button>
                  <Button onClick={handleSaveClick}>
                    저장
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 미저장 변경사항 경고 다이얼로그 */}
        <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                미저장 변경사항
              </AlertDialogTitle>
              <AlertDialogDescription>
                저장하지 않은 변경사항이 있습니다. 정말로 닫으시겠습니까?
                <br />
                <span className="text-sm text-muted-foreground mt-2 block">
                  변경사항은 영구적으로 손실됩니다.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>계속 편집</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleForceClose}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                변경사항 버리고 닫기
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


        {/* 이미지 프롬프트 입력 다이얼로그 */}
        <Dialog open={showImagePromptDialog} onOpenChange={setShowImagePromptDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                AI 이미지 생성 프롬프트
              </DialogTitle>
              <DialogDescription>
                영문으로 키워드를 콤마(,)로 구분하여 입력해주세요.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-prompt">이미지 키워드 (영문)</Label>
                <Textarea
                  id="image-prompt"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="예: young guy, office worker, using smartphone, modern cafe, casual clothes"
                  rows={4}
                  className="resize-none"
                />
              </div>
              
              <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded">
                <p className="font-medium mb-1">💡 키워드 작성 가이드:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>영문 키워드를 콤마(,)로 구분하여 입력</li>
                  <li>나이/성별: young man, middle-aged woman, teenager</li>
                  <li>직업/역할: office worker, student, entrepreneur</li>
                  <li>행동/상황: using laptop, drinking coffee, smiling</li>
                  <li>스타일/배경: casual clothes, modern office, outdoor</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowImagePromptDialog(false)}
                disabled={isGeneratingThumbnail}
              >
                취소
              </Button>
              <Button 
                onClick={() => handleGenerateThumbnail(imagePrompt)}
                disabled={isGeneratingThumbnail || !imagePrompt.trim()}
              >
                {isGeneratingThumbnail ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    생성 중...
                  </>
                ) : (
                  '이미지 생성'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 페르소나 삭제 확인 다이얼로그 */}
        <AlertDialog open={personaDeleteConfirm.show} onOpenChange={(open) => !open && setPersonaDeleteConfirm({ show: false, personaId: '', personaTitle: '' })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                페르소나 삭제 확인
              </AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-medium">{personaDeleteConfirm.personaTitle}</span> 페르소나를 삭제하시겠습니까?
                <br />
                <br />
                <span className="text-red-600 font-medium">⚠️ 경고:</span>
                <br />
                삭제하면 다음 데이터가 영구적으로 손실됩니다:
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>누적된 페르소나 분석 데이터</li>
                  <li>연결된 인터뷰와의 링크</li>
                  <li>페르소나 반영 이력</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeletePersona}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            페르소나 분류 기준 {isReadOnly ? '조회' : '설정'}
          </DialogTitle>
          <DialogDescription>
            프로젝트의 페르소나를 분류하고 정의하는 기준을 {isReadOnly ? '확인' : '설정'}합니다.
            {projectId ? ' (프로젝트별 설정)' : ' (회사 기본 설정)'}
            {isReadOnly && (
              <span className="block mt-2 text-amber-600 font-medium">
                📖 읽기 전용 모드 - 설정을 변경하려면 관리자에게 문의하세요
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {configLoading ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">설정을 불러오는 중...</p>
            </div>
          </div>
        ) : (
          <div className="flex-grow grid md:grid-cols-[1fr_380px] gap-8 overflow-hidden p-1">
            {/* Main Matrix Area */}
            <div className="flex-grow flex flex-col overflow-hidden border rounded-lg">
              <div
                className="flex-grow grid bg-white overflow-auto"
                style={{
                  gridTemplateColumns: `120px repeat(${xAxis.segments.length}, 1fr)`,
                  gridTemplateRows: `80px repeat(${yAxis.segments.length}, 1fr)`,
                  minHeight: '100%',
                }}
              >
                <div 
                  className="border-r border-b bg-gray-50"
                  style={{ height: '80px', width: '120px', minHeight: '80px', maxHeight: '80px' }}
                ></div>
                {xAxis.segments.map((seg, xIndex) => (
                  <EditPopover
                    key={`x-header-${xIndex}`}
                    initialValue={seg}
                    onSave={data => handleSegmentUpdate('x', xIndex, data)}
                    trigger={
                      <div
                        className={`border-r border-b font-semibold text-center p-2 text-sm flex items-center justify-center bg-gray-50 ${
                          seg.is_unclassified ? 'text-gray-400' : ''
                        } ${isReadOnly ? '' : 'cursor-pointer hover:bg-gray-100'}`}
                        style={{ height: '80px', minHeight: '80px', maxHeight: '80px' }}
                      >
                        {seg.name}
                      </div>
                    }
                  />
                ))}

                {yAxis.segments.map((ySeg, yIndex) => (
                  <div className="contents" key={`row-${yIndex}`}>
                    <EditPopover
                      key={`y-header-${yIndex}`}
                      initialValue={ySeg}
                      onSave={data => handleSegmentUpdate('y', yIndex, data)}
                      trigger={
                        <div
                          className={`border-r border-b font-semibold text-center p-2 text-sm flex items-center justify-center bg-gray-50 ${
                            ySeg.is_unclassified ? 'text-gray-400' : ''
                          } ${isReadOnly ? '' : 'cursor-pointer hover:bg-gray-100'}`}
                          style={{ minHeight: '100%', width: '120px' }}
                        >
                          {ySeg.name}
                        </div>
                      }
                    />
                    {xAxis.segments.map((xSeg, xIndex) => {
                      const isRowOrColUnclassified = xSeg.is_unclassified || ySeg.is_unclassified
                      const isIndividuallyUnclassified = unclassifiedCells.some(
                        c => c.xIndex === xIndex && c.yIndex === yIndex,
                      )
                      const cellPersona = personaTypes.find(
                        p => p.xIndex === xIndex && p.yIndex === yIndex,
                      )
                      return (
                        <div
                          key={`${yIndex}-${xIndex}`}
                          className={`border-r border-b relative h-full ${
                            isRowOrColUnclassified || isIndividuallyUnclassified ? 'bg-gray-100' : ''
                          }`}
                        >
                          {(isRowOrColUnclassified || isIndividuallyUnclassified) ? (
                            <PersonaEditDialog
                              onCellUpdate={handleCellUpdate}
                              persona={null}
                              onDelete={handleDeletePersona}
                              disabled={isRowOrColUnclassified && !isIndividuallyUnclassified}
                              xIndex={xIndex}
                              yIndex={yIndex}
                              isCurrentlyUnclassified={isIndividuallyUnclassified}
                            >
                              <button 
                                className={`w-full h-full flex items-center justify-center transition-colors ${
                                  isReadOnly ? '' : (isRowOrColUnclassified ? 'cursor-not-allowed' : 'hover:bg-gray-200 cursor-pointer')
                                }`}
                                disabled={isRowOrColUnclassified || isReadOnly}
                              >
                                <div className="text-center">
                                  <p className="text-sm font-medium text-gray-500 mb-1">미분류</p>
                                  <p className="text-xs text-gray-400">
                                    {isRowOrColUnclassified ? '축 전체' : (isReadOnly ? '읽기 전용' : '클릭하여 해제')}
                                  </p>
                                </div>
                              </button>
                            </PersonaEditDialog>
                          ) : (
                            <div className="absolute inset-0">
                              {cellPersona ? (
                                <PersonaEditDialog
                                  key={cellPersona.id}
                                  persona={cellPersona}
                                  onCellUpdate={handleCellUpdate}
                                  onDelete={handleDeletePersona}
                                  xIndex={xIndex}
                                  yIndex={yIndex}
                                  isCurrentlyUnclassified={isIndividuallyUnclassified}
                                >
                                  <button className={`absolute inset-0 text-left p-2 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200 hover:border-blue-300 ${isReadOnly ? 'cursor-default' : ''}`}>
                                    {/* 메인 콘텐츠 */}
                                    <div className="relative h-full flex flex-col">
                                      {/* 썸네일 캐릭터 이미지 - 배경처럼 우측 하단에 크게 배치 */}
                                      {(cellPersona as any).thumbnail && (
                                        <div className="absolute bottom-0 right-0 w-24 h-24 z-0 opacity-30">
                                          <img
                                            src={(cellPersona as any).thumbnail}
                                            alt=""
                                            className="w-full h-full object-cover rounded-md"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).style.display = 'none'
                                            }}
                                          />
                                        </div>
                                      )}
                                      
                                      <div className="flex items-center gap-2 mb-1 relative z-10">
                                        {(cellPersona as any).personaType && (
                                          <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full flex-shrink-0">
                                            {(cellPersona as any).personaType}
                                          </span>
                                        )}
                                        <p 
                                          className="font-semibold text-xs text-blue-800 leading-tight break-words flex-1"
                                          style={{
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                          }}
                                        >
                                          {cellPersona.title}
                                        </p>
                                      </div>
                                      
                                      <div className="flex-1 relative z-10">
                                        <div className="text-xs text-gray-600 leading-tight break-words">
                                          <p 
                                            className="break-words"
                                            style={{
                                              display: '-webkit-box',
                                              WebkitLineClamp: 10,
                                              WebkitBoxOrient: 'vertical',
                                              overflow: 'hidden'
                                            }}
                                          >
                                            {cellPersona.description}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                </PersonaEditDialog>
                              ) : !isReadOnly ? (
                                <PersonaEditDialog
                                  onCellUpdate={handleCellUpdate}
                                  persona={null}
                                  onDelete={handleDeletePersona}
                                  disabled={isRowOrColUnclassified}
                                  xIndex={xIndex}
                                  yIndex={yIndex}
                                  isCurrentlyUnclassified={isIndividuallyUnclassified}
                                >
                                  <button
                                    className="w-full h-full flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors group"
                                    disabled={isRowOrColUnclassified}
                                  >
                                    <div className="w-10 h-10 border-2 border-dashed border-gray-300 group-hover:border-gray-400 rounded-full flex items-center justify-center mb-3 transition-colors">
                                      <Plus className="h-5 w-5" />
                                    </div>
                                    <span className="text-sm font-medium">페르소나 추가</span>
                                    <span className="text-xs mt-1 opacity-70">클릭하여 생성</span>
                                  </button>
                                </PersonaEditDialog>
                              ) : null}
                              
                              {/* 읽기 모드에서 빈 셀 표시 */}
                              {!cellPersona && isReadOnly && (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="text-center text-gray-400">
                                    <p className="text-sm">페르소나 없음</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Settings Panel */}
            <div className="space-y-6 overflow-y-auto pr-2 -mr-2">
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50/80">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">축 설정</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePromptPreview}
                    disabled={loadingPrompt || isReadOnly}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {loadingPrompt ? '생성 중...' : '프롬프트 미리보기'}
                  </Button>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-4">
                    <p className="font-medium text-base">세로축 (Y축)</p>
                    <div className="space-y-1">
                      <Label>이름</Label>
                      <Input
                        value={yAxis.name}
                        onChange={e => setYAxis({ ...yAxis, name: e.target.value })}
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>설명</Label>
                      <Textarea
                        value={yAxis.description}
                        onChange={e => setYAxis({ ...yAxis, description: e.target.value })}
                        rows={3}
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="w-1/2 space-y-1">
                        <Label>최하단</Label>
                        <Input
                          value={yAxis.low_end_label}
                          onChange={e => setYAxis({ ...yAxis, low_end_label: e.target.value })}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="w-1/2 space-y-1">
                        <Label>최상단</Label>
                        <Input
                          value={yAxis.high_end_label}
                          onChange={e => setYAxis({ ...yAxis, high_end_label: e.target.value })}
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>구분 개수: {yAxis.segments.length}</Label>
                      <Slider
                        value={[yAxis.segments.length]}
                        onValueChange={v => !isReadOnly && handleDividerChange('y', v[0])}
                        min={1}
                        max={5}
                        step={1}
                        disabled={isReadOnly}
                      />
                    </div>

                    {/* Y축 가이드라인 */}
                    <div className="space-y-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                      <Label className="text-sm font-semibold text-blue-800">점수 가이드라인</Label>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">{yAxis.low_end_label} (낮은 값)</Label>
                          <Textarea
                            value={scoringGuidelines.y_axis_low_description}
                            onChange={e => setScoringGuidelines({ ...scoringGuidelines, y_axis_low_description: e.target.value })}
                            rows={2}
                            disabled={isReadOnly}
                            placeholder={`${yAxis.low_end_label} 특성에 대한 설명을 입력하세요...`}
                            className="text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">{yAxis.high_end_label} (높은 값)</Label>
                          <Textarea
                            value={scoringGuidelines.y_axis_high_description}
                            onChange={e => setScoringGuidelines({ ...scoringGuidelines, y_axis_high_description: e.target.value })}
                            rows={2}
                            disabled={isReadOnly}
                            placeholder={`${yAxis.high_end_label} 특성에 대한 설명을 입력하세요...`}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr />

                  <div className="space-y-4">
                    <p className="font-medium text-base">가로축 (X축)</p>
                    <div className="space-y-1">
                      <Label>이름</Label>
                      <Input
                        value={xAxis.name}
                        onChange={e => setXAxis({ ...xAxis, name: e.target.value })}
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>설명</Label>
                      <Textarea
                        value={xAxis.description}
                        onChange={e => setXAxis({ ...xAxis, description: e.target.value })}
                        rows={3}
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="w-1/2 space-y-1">
                        <Label>좌측</Label>
                        <Input
                          value={xAxis.low_end_label}
                          onChange={e => setXAxis({ ...xAxis, low_end_label: e.target.value })}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="w-1/2 space-y-1">
                        <Label>우측</Label>
                        <Input
                          value={xAxis.high_end_label}
                          onChange={e => setXAxis({ ...xAxis, high_end_label: e.target.value })}
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>구분 개수: {xAxis.segments.length}</Label>
                      <Slider
                        value={[xAxis.segments.length]}
                        onValueChange={v => !isReadOnly && handleDividerChange('x', v[0])}
                        min={1}
                        max={5}
                        step={1}
                        disabled={isReadOnly}
                      />
                    </div>

                    {/* X축 가이드라인 */}
                    <div className="space-y-3 p-3 bg-green-50 rounded-md border border-green-200">
                      <Label className="text-sm font-semibold text-green-800">점수 가이드라인</Label>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">{xAxis.low_end_label} (낮은 값)</Label>
                          <Textarea
                            value={scoringGuidelines.x_axis_low_description}
                            onChange={e => setScoringGuidelines({ ...scoringGuidelines, x_axis_low_description: e.target.value })}
                            rows={2}
                            disabled={isReadOnly}
                            placeholder={`${xAxis.low_end_label} 특성에 대한 설명을 입력하세요...`}
                            className="text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">{xAxis.high_end_label} (높은 값)</Label>
                          <Textarea
                            value={scoringGuidelines.x_axis_high_description}
                            onChange={e => setScoringGuidelines({ ...scoringGuidelines, x_axis_high_description: e.target.value })}
                            rows={2}
                            disabled={isReadOnly}
                            placeholder={`${xAxis.high_end_label} 특성에 대한 설명을 입력하세요...`}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isReadOnly ? '닫기' : '취소'}
          </Button>
          {!isReadOnly && (
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          )}
        </DialogFooter>

        {/* 프롬프트 미리보기 모달 */}
        <Dialog open={promptPreviewOpen} onOpenChange={setPromptPreviewOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">프롬프트 미리보기</DialogTitle>
              <DialogDescription>
                현재 설정을 바탕으로 생성된 시스템 프롬프트와 API 변수 정보입니다.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto">
              <pre className="text-xs bg-gray-50 p-4 rounded-lg border whitespace-pre-wrap font-mono">
                {previewPrompt}
              </pre>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPromptPreviewOpen(false)}>
                닫기
              </Button>
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(previewPrompt)
                  toast.success('프롬프트가 클립보드에 복사되었습니다')
                }}
              >
                클립보드에 복사
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </DialogContent>
    </Dialog>
  )
} 