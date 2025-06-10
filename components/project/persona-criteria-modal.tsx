'use client'

import { useState, useEffect } from 'react'
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

interface PersonaCriteriaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Segment {
  name: string
  description: string
  isUnclassified: boolean
}

interface Axis {
  name: string
  description: string
  lowEndLabel: string
  highEndLabel: string
  segments: Segment[]
}

interface PersonaType {
  id: string
  xIndex: number
  yIndex: number
  title: string
  subtitle: string
  description: string
}

interface UnclassifiedCell {
  xIndex: number;
  yIndex: number;
}

const createInitialSegments = (count: number, prefix: string): Segment[] =>
  Array.from({ length: count }, (_, i) => ({
    name: `${prefix} ${i + 1}`,
    description: '',
    isUnclassified: false,
  }))

const initialXAxis: Axis = {
  name: '충전 패턴 축',
  description:
    '사용자가 주로 어떤 상황과 방식으로 전기차를 충전하는지에 대한 패턴을 나타냅니다.',
  lowEndLabel: '루틴형',
  highEndLabel: '즉시형',
  segments: createInitialSegments(3, '가로 유형'),
}
const initialYAxis: Axis = {
  name: '가치 지향',
  description:
    '사용자가 충전 서비스에서 어떤 가치를 가장 중요하게 생각하는지를 나타냅니다.',
  lowEndLabel: '가성비',
  highEndLabel: '속도/경험',
  segments: createInitialSegments(3, '세로 유형'),
}

const initialPersonaForm = { title: '', subtitle: '', description: '' }

export const PersonaCriteriaModal = ({
  open,
  onOpenChange,
}: PersonaCriteriaModalProps) => {
  const [xAxis, setXAxis] = useState<Axis>(initialXAxis)
  const [yAxis, setYAxis] = useState<Axis>(initialYAxis)
  const [personaTypes, setPersonaTypes] = useState<PersonaType[]>([])
  const [unclassifiedCells, setUnclassifiedCells] = useState<UnclassifiedCell[]>([])
  
  const handleCellUpdate = (
    xIndex: number,
    yIndex: number,
    update: {
      formData?: typeof initialPersonaForm;
      isUnclassified?: boolean;
      personaId?: string;
    }
  ) => {
    const { formData, isUnclassified, personaId } = update;

    if (isUnclassified) {
      setUnclassifiedCells(prev => 
        prev.some(c => c.xIndex === xIndex && c.yIndex === yIndex)
          ? prev
          : [...prev, { xIndex, yIndex }]
      );
      setPersonaTypes(prev => prev.filter(p => !(p.xIndex === xIndex && p.yIndex === yIndex)));
      return;
    }
    
    setUnclassifiedCells(prev => prev.filter(c => !(c.xIndex === xIndex && c.yIndex === yIndex)));

    if (personaId && formData) {
      setPersonaTypes(prev =>
        prev.map(p => (p.id === personaId ? { ...p, ...formData } : p))
      );
    } else if (formData && (formData.title || formData.description || formData.subtitle)) {
      setPersonaTypes(prev => [
        ...prev,
        { ...formData, id: crypto.randomUUID(), xIndex, yIndex },
      ]);
    }
  };


  const handleDeletePersona = (id: string) => {
    setPersonaTypes(personaTypes.filter(p => p.id !== id))
  }

  const handleSegmentUpdate = (
    axis: 'x' | 'y',
    index: number,
    data: Partial<Segment>,
  ) => {
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
      prevPersonas.filter(p =>
        axis === 'x' ? p.xIndex < count : p.yIndex < count,
      ),
    )
    setUnclassifiedCells(prevCells =>
      prevCells.filter(c =>
        axis === 'x' ? c.xIndex < count : c.yIndex < count,
      ),
    )
  }

  const EditPopover = ({
    trigger,
    onSave,
    initialValue,
  }: {
    trigger: React.ReactNode
    onSave: (
      data: Omit<Segment, 'isUnclassified'> & { isUnclassified: boolean },
    ) => void
    initialValue: Segment
  }) => {
    const [name, setName] = useState(initialValue.name)
    const [description, setDescription] = useState(initialValue.description)
    const [isUnclassified, setIsUnclassified] = useState(
      initialValue.isUnclassified,
    )

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
                onClick={() => onSave({ name, description, isUnclassified })}
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
    persona: Omit<PersonaType, 'xIndex' | 'yIndex'> | null
    onCellUpdate: (
      xIndex: number,
      yIndex: number,
      update: {
        formData?: typeof initialPersonaForm;
        isUnclassified?: boolean;
        personaId?: string;
      }
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
          personaId: persona?.id
      });
      setIsOpen(false)
    }

    const handleDeleteClick = () => {
      if (persona?.id) {
        onDelete(persona.id)
        setIsOpen(false)
      }
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
                <Checkbox id="unclassify-cell" checked={markAsUnclassified} onCheckedChange={(checked) => setMarkAsUnclassified(Boolean(checked))} />
                <Label htmlFor="unclassify-cell">이 영역 미분류 처리</Label>
            </div>
            
            <hr />

            <div className="grid gap-2" style={{ opacity: markAsUnclassified ? 0.5 : 1 }}>
              <Label htmlFor="title">타이틀</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e =>
                  setFormData({ ...formData, title: e.target.value })
                }
                disabled={markAsUnclassified}
              />
              <Label htmlFor="subtitle">서브타이틀</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={e =>
                  setFormData({ ...formData, subtitle: e.target.value })
                }
                disabled={markAsUnclassified}
              />
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={markAsUnclassified}
              />
            </div>
            <div className="flex justify-between">
              {persona && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteClick}
                >
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
            페르소나 분류 기준 설정
          </DialogTitle>
          <DialogDescription>
            프로젝트의 페르소나를 분류하고 정의하는 기준을 설정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow grid md:grid-cols-[1fr_380px] gap-8 overflow-hidden p-1">
          {/* Main Matrix Area */}
          <div className="flex-grow flex flex-col overflow-hidden border rounded-lg">
            <div
              className="flex-grow grid bg-white"
              style={{
                gridTemplateColumns: `120px repeat(${xAxis.segments.length}, 1fr)`,
                gridTemplateRows: `60px repeat(${yAxis.segments.length}, 1fr)`,
              }}
            >
              <div className="border-r border-b bg-gray-50"></div>
              {xAxis.segments.map((seg, xIndex) => (
                <EditPopover
                  key={`x-header-${xIndex}`}
                  initialValue={seg}
                  onSave={data => handleSegmentUpdate('x', xIndex, data)}
                  trigger={
                    <div
                      className={`border-r border-b font-semibold text-center p-2 text-sm cursor-pointer hover:bg-gray-100 h-full flex items-center justify-center bg-gray-50 ${
                        seg.isUnclassified ? 'text-gray-400' : ''
                      }`}
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
                        className={`border-r border-b font-semibold text-center p-2 text-sm cursor-pointer hover:bg-gray-100 h-full flex items-center justify-center bg-gray-50 ${
                          ySeg.isUnclassified ? 'text-gray-400' : ''
                        }`}
                      >
                        {ySeg.name}
                      </div>
                    }
                  />
                  {xAxis.segments.map((xSeg, xIndex) => {
                    const isRowOrColUnclassified = xSeg.isUnclassified || ySeg.isUnclassified;
                    const isIndividuallyUnclassified = unclassifiedCells.some(c => c.xIndex === xIndex && c.yIndex === yIndex);
                    const cellPersonas = personaTypes.filter(
                      p => p.xIndex === xIndex && p.yIndex === yIndex,
                    )
                    return (
                      <div
                        key={`${yIndex}-${xIndex}`}
                        className={`border-r border-b p-2 flex flex-col items-center justify-center gap-2 ${
                          isRowOrColUnclassified || isIndividuallyUnclassified ? 'bg-gray-100' : ''
                        }`}
                      >
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
                            <button className="w-full text-left p-2 bg-blue-50 hover:bg-blue-100 rounded-md">
                              <p className="font-semibold text-sm text-blue-800 truncate">
                                {p.title}
                              </p>
                              <p className="text-xs text-gray-600 truncate">
                                {p.description}
                              </p>
                            </button>
                          </PersonaEditPopover>
                        ))}
                        {cellPersonas.length === 0 && (
                          <PersonaEditPopover
                            onCellUpdate={handleCellUpdate}
                            persona={null}
                            onDelete={handleDeletePersona}
                            disabled={isRowOrColUnclassified}
                            xIndex={xIndex}
                            yIndex={yIndex}
                            isCurrentlyUnclassified={isIndividuallyUnclassified}
                          >
                            <Button
                              variant="ghost"
                              className="w-full h-10"
                              disabled={isRowOrColUnclassified}
                            >
                              <Plus className="h-4 w-4 text-gray-400" />
                            </Button>
                          </PersonaEditPopover>
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
                  />
                </div>
                <div className="space-y-1">
                  <Label>설명</Label>
                  <Textarea
                    value={yAxis.description}
                    onChange={e =>
                      setYAxis({ ...yAxis, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="w-1/2 space-y-1">
                    <Label>최하단</Label>
                    <Input
                      value={yAxis.lowEndLabel}
                      onChange={e =>
                        setYAxis({ ...yAxis, lowEndLabel: e.target.value })
                      }
                    />
                  </div>
                  <div className="w-1/2 space-y-1">
                    <Label>최상단</Label>
                    <Input
                      value={yAxis.highEndLabel}
                      onChange={e =>
                        setYAxis({ ...yAxis, highEndLabel: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>구분 개수: {yAxis.segments.length}</Label>
                  <Slider
                    defaultValue={[yAxis.segments.length]}
                    onValueChange={v => handleDividerChange('y', v[0])}
                    min={1}
                    max={5}
                    step={1}
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
                  />
                </div>
                <div className="space-y-1">
                  <Label>설명</Label>
                  <Textarea
                    value={xAxis.description}
                    onChange={e =>
                      setXAxis({ ...xAxis, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="w-1/2 space-y-1">
                    <Label>좌측</Label>
                    <Input
                      value={xAxis.lowEndLabel}
                      onChange={e =>
                        setXAxis({ ...xAxis, lowEndLabel: e.target.value })
                      }
                    />
                  </div>
                  <div className="w-1/2 space-y-1">
                    <Label>우측</Label>
                    <Input
                      value={xAxis.highEndLabel}
                      onChange={e =>
                        setXAxis({ ...xAxis, highEndLabel: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>구분 개수: {xAxis.segments.length}</Label>
                  <Slider
                    defaultValue={[xAxis.segments.length]}
                    onValueChange={v => handleDividerChange('x', v[0])}
                    min={1}
                    max={5}
                    step={1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 