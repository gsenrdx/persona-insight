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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Plus } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import {
  fetchPersonaCriteria,
  createPersonaCriteria,
  updatePersonaCriteria,
  DEFAULT_X_AXIS,
  DEFAULT_Y_AXIS,
  DEFAULT_OUTPUT_CONFIG,
  DEFAULT_SCORING_GUIDELINES,
  type Axis,
  type Segment,
  type UnclassifiedCell,
  type PersonaMatrixItem,
  type OutputConfig,
  type ScoringGuidelines,
  type CreatePersonaCriteriaData,
  type UpdatePersonaCriteriaData,
} from '@/lib/api/persona-criteria'

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

const initialPersonaForm = { title: '', subtitle: '', description: '' }

export const PersonaCriteriaModal = ({
  open,
  onOpenChange,
  projectId,
}: PersonaCriteriaModalProps) => {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  // 읽기 모드 여부 판단 (company_user는 읽기 전용)
  const isReadOnly = profile?.role === 'company_user'

  // DB에서 기존 설정 불러오기
  const { data: existingConfig, isLoading: configLoading } = useQuery({
    queryKey: ['persona-criteria', profile?.company_id, projectId],
    queryFn: () => fetchPersonaCriteria(profile?.company_id!, projectId),
    enabled: !!profile?.company_id && open,
    staleTime: 5 * 60 * 1000, // 5분
  })

  // 상태 관리
  const [xAxis, setXAxis] = useState<Axis>(DEFAULT_X_AXIS)
  const [yAxis, setYAxis] = useState<Axis>(DEFAULT_Y_AXIS)
  const [personaTypes, setPersonaTypes] = useState<PersonaMatrixItem[]>([])
  const [unclassifiedCells, setUnclassifiedCells] = useState<UnclassifiedCell[]>([])
  const [outputConfig, setOutputConfig] = useState<OutputConfig>(DEFAULT_OUTPUT_CONFIG)
  const [scoringGuidelines, setScoringGuidelines] = useState<ScoringGuidelines>(DEFAULT_SCORING_GUIDELINES)

  // DB에서 불러온 설정으로 상태 초기화
  useEffect(() => {
    if (existingConfig && open) {
      setXAxis(existingConfig.x_axis)
      setYAxis(existingConfig.y_axis)
      setUnclassifiedCells(existingConfig.unclassified_cells)
      setOutputConfig(existingConfig.output_config)
      setScoringGuidelines(existingConfig.scoring_guidelines)
      
      // persona_matrix를 배열로 변환
      const personaArray = Object.entries(existingConfig.persona_matrix).map(([key, persona]) => persona as PersonaMatrixItem)
      setPersonaTypes(personaArray)
    } else if (open && !existingConfig) {
      // 기본값으로 초기화
      setXAxis(DEFAULT_X_AXIS)
      setYAxis(DEFAULT_Y_AXIS)
      setPersonaTypes([])
      setUnclassifiedCells([])
      setOutputConfig(DEFAULT_OUTPUT_CONFIG)
      setScoringGuidelines(DEFAULT_SCORING_GUIDELINES)
    }
  }, [existingConfig, open])

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

    if (personaId && formData) {
      setPersonaTypes(prev => prev.map(p => (p.id === personaId ? { ...p, ...formData } : p)))
    } else if (formData && (formData.title || formData.description || formData.subtitle)) {
      setPersonaTypes(prev => [
        ...prev,
        { ...formData, id: crypto.randomUUID(), xIndex, yIndex },
      ])
    }
  }

  const handleDeletePersona = (id: string) => {
    setPersonaTypes(personaTypes.filter(p => p.id !== id))
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

    // persona_matrix를 객체로 변환
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
      // 업데이트
      const updateData: UpdatePersonaCriteriaData = {
        ...saveData,
        id: existingConfig.id,
        user_id: profile.id,
      }
      await updateMutation.mutateAsync(updateData)
    } else {
      // 생성
      const createData: CreatePersonaCriteriaData = {
        ...saveData,
        created_by: profile.id,
      }
      await createMutation.mutateAsync(createData)
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

  const PersonaEditPopover = ({
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

    useEffect(() => {
      if (isOpen) {
        setFormData(
          persona
            ? {
                title: persona.title,
                subtitle: persona.subtitle,
                description: persona.description,
              }
            : initialPersonaForm,
        )
        setMarkAsUnclassified(isCurrentlyUnclassified)
      }
    }, [isOpen, persona, isCurrentlyUnclassified])

    const handleSaveClick = () => {
      onCellUpdate(xIndex, yIndex, {
        formData: markAsUnclassified ? undefined : formData,
        isUnclassified: markAsUnclassified,
        personaId: persona?.id,
      })
      setIsOpen(false)
    }

    const handleDeleteClick = () => {
      if (persona?.id) {
        onDelete(persona.id)
        setIsOpen(false)
      }
    }
    
    // 읽기 모드일 때는 Popover를 비활성화
    if (isReadOnly) {
      return <>{children}</>
    }

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          {children}
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">
                {persona ? '페르소나 수정' : '페르소나 분류'}
              </h4>
              <p className="text-sm text-muted-foreground">
                페르소나를 추가하거나 영역을 미분류 처리합니다.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="unclassify-cell"
                checked={markAsUnclassified}
                onCheckedChange={checked => setMarkAsUnclassified(Boolean(checked))}
              />
              <Label htmlFor="unclassify-cell">이 영역 미분류 처리</Label>
            </div>

            <hr />

            <div className="grid gap-2" style={{ opacity: markAsUnclassified ? 0.5 : 1 }}>
              <Label htmlFor="title">타이틀</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                disabled={markAsUnclassified}
              />
              <Label htmlFor="subtitle">서브타이틀</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                disabled={markAsUnclassified}
              />
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                disabled={markAsUnclassified}
              />
            </div>
            <div className="flex justify-between">
              {persona && (
                <Button variant="destructive" size="sm" onClick={handleDeleteClick}>
                  삭제
                </Button>
              )}
              <Button className="ml-auto" size="sm" onClick={handleSaveClick}>
                저장
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
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
                      const cellPersonas = personaTypes.filter(
                        p => p.xIndex === xIndex && p.yIndex === yIndex,
                      )
                      return (
                        <div
                          key={`${yIndex}-${xIndex}`}
                          className={`border-r border-b p-2 flex flex-col gap-2 overflow-y-auto relative ${
                            isRowOrColUnclassified || isIndividuallyUnclassified ? 'bg-gray-100' : ''
                          }`}
                          style={{ minHeight: '100%' }}
                        >
                          {(isRowOrColUnclassified || isIndividuallyUnclassified) ? (
                            <PersonaEditPopover
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
                            </PersonaEditPopover>
                          ) : (
                            <div className={`w-full h-full flex flex-col gap-2 ${cellPersonas.length > 0 ? 'justify-center' : ''}`}>
                              {cellPersonas.map(p => (
                                <PersonaEditPopover
                                  key={p.id}
                                  persona={p}
                                  onCellUpdate={handleCellUpdate}
                                  onDelete={handleDeletePersona}
                                  xIndex={xIndex}
                                  yIndex={yIndex}
                                  isCurrentlyUnclassified={isIndividuallyUnclassified}
                                >
                                  <button className={`w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg flex-shrink-0 transition-colors border border-blue-200 hover:border-blue-300 ${isReadOnly ? 'cursor-default' : ''}`}>
                                    <p 
                                      className="font-semibold text-sm text-blue-800 leading-tight break-words"
                                      style={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                      }}
                                    >
                                      {p.title}
                                    </p>
                                    <p 
                                      className="text-xs text-gray-600 leading-tight break-words mt-1"
                                      style={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                      }}
                                    >
                                      {p.description}
                                    </p>
                                  </button>
                                </PersonaEditPopover>
                              ))}
                              
                              {/* 페르소나가 없을 때만 추가 버튼 표시 (읽기 모드에서는 숨김) */}
                              {cellPersonas.length === 0 && !isReadOnly && (
                                <PersonaEditPopover
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
                                </PersonaEditPopover>
                              )}
                              
                              {/* 읽기 모드에서 빈 셀 표시 */}
                              {cellPersonas.length === 0 && isReadOnly && (
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
                <h3 className="text-lg font-semibold">축 설정</h3>
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
      </DialogContent>
    </Dialog>
  )
} 