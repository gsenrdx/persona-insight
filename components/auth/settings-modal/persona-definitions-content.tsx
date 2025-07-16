'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Settings, 
  Plus, 
  Edit3, 
  Save,
  X,
  AlertCircle,
  Info,
  Loader2,
  Trash2,
  Upload,
  Image as ImageIcon,
  FolderOpen
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { ImageGalleryModal } from './image-gallery-modal'

interface ClassificationType {
  id: string
  name: string
  description: string
}

interface ClassificationCriteria {
  id: string
  name: string
  description: string
  types: ClassificationType[]
}

interface PersonaCombination {
  types: ClassificationType[]
  index: number
  thumbnail?: string | null
  title?: string
  description?: string
}

interface PersonaDefinitionsContentProps {
  companyId: string
  onClose?: () => void
}

export function PersonaDefinitionsContent({ companyId, onClose }: PersonaDefinitionsContentProps) {
  const { profile, session } = useAuth()
  const queryClient = useQueryClient()
  const [isEditMode, setIsEditMode] = useState(false)
  const [classifications, setClassifications] = useState<ClassificationCriteria[]>([])
  const [personaCombinationThumbnails, setPersonaCombinationThumbnails] = useState<Record<string, string | null>>({})
  const [personaCombinationTitles, setPersonaCombinationTitles] = useState<Record<string, string>>({})
  const [personaCombinationDescriptions, setPersonaCombinationDescriptions] = useState<Record<string, string>>({})
  const [uploadingThumbnails, setUploadingThumbnails] = useState<Record<string, boolean>>({})
  const [galleryModalOpen, setGalleryModalOpen] = useState(false)
  const [selectedCombinationKey, setSelectedCombinationKey] = useState<string | null>(null)
  
  // 모든 사용자가 편집 가능하도록 설정
  const canEdit = true // profile?.role === 'super_admin' || profile?.role === 'company_admin'
  
  // 분류 기준 조회
  const { data: queryResult, isLoading, error } = useQuery({
    queryKey: ['persona-classifications', companyId],
    queryFn: async () => {
      if (!session?.access_token) {
        throw new Error('인증 정보가 없습니다')
      }
      
      const response = await fetch('/api/persona-definitions/classifications', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '분류 기준을 불러올 수 없습니다')
      }
      
      return await response.json()
    },
    enabled: !!session?.access_token
  })

  const savedClassifications = queryResult?.data

  useEffect(() => {
    if (queryResult?.data) {
      setClassifications(queryResult.data)
    }
    
    // 썸네일 정보가 있으면 상태에 설정
    if (queryResult?.thumbnails) {
      setPersonaCombinationThumbnails(queryResult.thumbnails)
    }
    
    // 타이틀과 설명 정보 설정
    if (queryResult?.titles) {
      setPersonaCombinationTitles(queryResult.titles)
    }
    if (queryResult?.descriptions) {
      setPersonaCombinationDescriptions(queryResult.descriptions)
    }
  }, [queryResult])

  // 분류 기준 저장
  const saveMutation = useMutation({
    mutationFn: async (data: ClassificationCriteria[]) => {
      if (!session?.access_token) {
        throw new Error('인증 정보가 없습니다')
      }
      
      const response = await fetch('/api/persona-definitions/classifications', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          classifications: data,
          thumbnails: personaCombinationThumbnails,
          titles: personaCombinationTitles,
          descriptions: personaCombinationDescriptions
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '분류 기준 저장에 실패했습니다')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persona-classifications'] })
      toast.success('분류 기준이 저장되었습니다')
      setIsEditMode(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleAddClassification = () => {
    if (classifications.length >= 2) {
      toast.error('분류 기준은 최대 2개까지 설정할 수 있습니다')
      return
    }
    
    const newClassification: ClassificationCriteria = {
      id: `temp_${Date.now()}`,
      name: '',
      description: '',
      types: []
    }
    
    setClassifications([...classifications, newClassification])
  }

  const handleRemoveClassification = (id: string) => {
    setClassifications(classifications.filter(c => c.id !== id))
  }

  const handleUpdateClassification = (id: string, updates: Partial<ClassificationCriteria>) => {
    setClassifications(classifications.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ))
  }

  const handleAddType = (classificationId: string) => {
    const classification = classifications.find(c => c.id === classificationId)
    if (!classification) return
    
    if (classification.types.length >= 3) {
      toast.error('유형은 최대 3개까지 추가할 수 있습니다')
      return
    }
    
    const newType: ClassificationType = {
      id: `temp_${Date.now()}`,
      name: '',
      description: ''
    }
    
    handleUpdateClassification(classificationId, {
      types: [...classification.types, newType]
    })
  }

  const handleRemoveType = (classificationId: string, typeId: string) => {
    const classification = classifications.find(c => c.id === classificationId)
    if (!classification) return
    
    handleUpdateClassification(classificationId, {
      types: classification.types.filter(t => t.id !== typeId)
    })
  }

  const handleUpdateType = (classificationId: string, typeId: string, updates: Partial<ClassificationType>) => {
    const classification = classifications.find(c => c.id === classificationId)
    if (!classification) return
    
    handleUpdateClassification(classificationId, {
      types: classification.types.map(t => 
        t.id === typeId ? { ...t, ...updates } : t
      )
    })
  }

  const handleSave = async () => {
    // Validation
    for (const classification of classifications) {
      if (!classification.name || !classification.description) {
        toast.error('모든 분류 기준의 이름과 설명을 입력해주세요')
        return
      }
      
      if (classification.types.length === 0) {
        toast.error('각 분류 기준에 최소 1개 이상의 유형을 추가해주세요')
        return
      }
      
      for (const type of classification.types) {
        if (!type.name || !type.description) {
          toast.error('모든 유형의 이름과 설명을 입력해주세요')
          return
        }
      }
    }
    
    // 기존 분류와 비교하여 변경사항 확인
    const hasStructuralChanges = () => {
      if (!savedClassifications) return true
      
      // 분류 기준 개수가 다르면 변경됨
      if (savedClassifications.length !== classifications.length) return true
      
      // 각 분류 기준의 유형 개수가 다르면 변경됨
      for (let i = 0; i < classifications.length; i++) {
        const saved = savedClassifications[i]
        const current = classifications[i]
        
        if (!saved || saved.types.length !== current.types.length) return true
      }
      
      return false
    }
    
    // 구조적 변경이 있으면 경고 표시
    if (hasStructuralChanges()) {
      const confirmed = window.confirm(
        '⚠️ 페르소나 분류 기준이 변경됩니다.\n\n' +
        '• 기존 페르소나 조합이 재생성됩니다\n' +
        '• 인터뷰와 페르소나의 연결이 해제됩니다\n' +
        '• 인터뷰 데이터는 삭제되지 않습니다\n\n' +
        '계속하시겠습니까?'
      )
      
      if (!confirmed) {
        return
      }
    }
    
    saveMutation.mutate(classifications)
  }

  // 맞춤 페르소나 조합 생성
  const generatePersonaCombinations = (): PersonaCombination[] => {
    if (classifications.length === 0) return []
    
    let combinations: ClassificationType[][] = []
    
    if (classifications.length === 1) {
      combinations = classifications[0]?.types.map(type => [type]) || []
    } else {
      // 2개의 분류 기준이 있을 때 모든 조합 생성
      if (classifications[0]?.types && classifications[1]?.types) {
        for (const type1 of classifications[0].types) {
          for (const type2 of classifications[1].types) {
            combinations.push([type1, type2])
          }
        }
      }
    }
    
    return combinations.map((types, index) => {
      const combinationKey = `P${index + 1}`
      return {
        types,
        index,
        thumbnail: personaCombinationThumbnails[combinationKey] || null,
        title: personaCombinationTitles[combinationKey] || `페르소나 ${combinationKey}`,
        description: personaCombinationDescriptions[combinationKey] || ''
      }
    })
  }

  const personaCombinations = generatePersonaCombinations()

  // 이미지 업로드 핸들러
  const handleImageUpload = async (file: File, combinationKey: string) => {
    if (!file) return
    
    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('파일 크기는 5MB 이하로 제한됩니다')
      return
    }
    
    // 파일 형식 체크
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다')
      return
    }
    
    setUploadingThumbnails(prev => ({ ...prev, [combinationKey]: true }))
    
    try {
      // FormData 생성
      const formData = new FormData()
      formData.append('image', file)
      formData.append('combinationKey', combinationKey)
      
      const response = await fetch('/api/persona-definitions/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('이미지 업로드에 실패했습니다')
      }
      
      const { imageUrl } = await response.json()
      
      setPersonaCombinationThumbnails(prev => ({
        ...prev,
        [combinationKey]: imageUrl
      }))
      
      toast.success('이미지가 업로드되었습니다')
    } catch (error) {
      console.error('Image upload error:', error)
      toast.error('이미지 업로드에 실패했습니다')
    } finally {
      setUploadingThumbnails(prev => ({ ...prev, [combinationKey]: false }))
    }
  }

  // 이미지 제거 핸들러
  const handleImageRemove = (combinationKey: string) => {
    setPersonaCombinationThumbnails(prev => ({
      ...prev,
      [combinationKey]: null
    }))
  }

  // 갤러리에서 이미지 선택 핸들러
  const handleGalleryImageSelect = async (imageUrl: string) => {
    if (!selectedCombinationKey) return

    setPersonaCombinationThumbnails(prev => ({
      ...prev,
      [selectedCombinationKey]: imageUrl
    }))
    
    toast.success('이미지가 선택되었습니다')
    setGalleryModalOpen(false)
    setSelectedCombinationKey(null)
  }

  // 갤러리 열기 핸들러
  const openImageGallery = (combinationKey: string) => {
    setSelectedCombinationKey(combinationKey)
    setGalleryModalOpen(true)
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 헤더 */}
      <div className="px-6 py-4 bg-white border-b flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">페르소나 관리</h3>
            <p className="text-sm text-gray-600 mt-1">
              고객 유형 분류를 위해 우리 회사의 페르소나를 설정해 주세요. 회사별 페르소나 분류 기준을 자유롭게 설정할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {onClose && (
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-500">분류 기준을 불러오는 중...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
              <p className="text-sm text-red-600">분류 기준을 불러올 수 없습니다</p>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-4"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['persona-classifications'] })}
              >
                다시 시도
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* 분류 기준 섹션 */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-medium text-gray-900">
                  분류 기준 
                  <span className="ml-2 text-sm font-normal text-gray-500">최대 2개</span>
                </h4>
                <div className="flex items-center gap-2">
                  {canEdit && !isEditMode && (
                    <Button
                      onClick={() => setIsEditMode(true)}
                      variant="outline"
                      size="sm"
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      수정하기
                    </Button>
                  )}
                  {isEditMode && classifications.length < 2 && (
                    <Button
                      onClick={handleAddClassification}
                      size="sm"
                      variant="outline"
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {classifications.map((classification, index) => (
                  <div
                    key={classification.id}
                    className="bg-white rounded-lg p-5 border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">
                          {index + 1}
                        </div>
                        <h5 className="text-base font-medium text-gray-900">
                          {isEditMode ? '분류 기준' : classification.name || '분류 기준'}
                        </h5>
                      </div>
                      {isEditMode && (
                        <Button
                          onClick={() => handleRemoveClassification(classification.id)}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {isEditMode ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs font-medium text-gray-600 mb-1">분류명</Label>
                            <Input
                              value={classification.name}
                              onChange={(e) => handleUpdateClassification(classification.id, { name: e.target.value })}
                              placeholder="예: 충전 패턴"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-600 mb-1">설명</Label>
                            <Input
                              value={classification.description}
                              onChange={(e) => handleUpdateClassification(classification.id, { description: e.target.value })}
                              placeholder="예: 사용자가 선호하는 충전 형태"
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs font-medium text-gray-600">
                              유형 설정
                            </Label>
                            {classification.types.length < 3 && (
                              <Button
                                onClick={() => handleAddType(classification.id)}
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                유형 추가
                              </Button>
                            )}
                          </div>

                          <div className="space-y-2">
                            {classification.types.map((type, typeIndex) => (
                              <div key={type.id} className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-gray-700">유형 {typeIndex + 1}</span>
                                  <Button
                                    onClick={() => handleRemoveType(classification.id, type.id)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0 text-gray-400 hover:text-red-600"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  <Input
                                    value={type.name}
                                    onChange={(e) => handleUpdateType(classification.id, type.id, { name: e.target.value })}
                                    placeholder="유형 이름 (예: 루틴형)"
                                    className="h-8 text-sm"
                                  />
                                  <Textarea
                                    value={type.description}
                                    onChange={(e) => handleUpdateType(classification.id, type.id, { description: e.target.value })}
                                    placeholder="유형에 대한 설명을 입력하세요"
                                    className="min-h-[60px] resize-none text-sm"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">{classification.description}</p>
                        <div className="grid grid-cols-1 gap-2">
                          {classification.types.map((type) => (
                            <div key={type.id} className="border border-gray-200 rounded-md p-3">
                              <h6 className="text-sm font-medium text-gray-900 mb-1">
                                {type.name}
                              </h6>
                              <p className="text-xs text-gray-600 whitespace-pre-wrap">{type.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {classifications.length === 0 && !isEditMode && (
                  <div className="text-center py-12">
                    <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">아직 설정된 분류 기준이 없습니다</p>
                    {canEdit && (
                      <Button
                        onClick={() => setIsEditMode(true)}
                        className="mt-4 bg-blue-600 hover:bg-blue-700"
                      >
                        분류 기준 설정하기
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 맞춤 페르소나 섹션 */}
            {classifications.length > 0 && classifications.every(c => c.types.length > 0) && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h4 className="text-base font-medium text-gray-900 mb-4">맞춤 페르소나</h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                          이미지
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                          페르소나 이름
                        </th>
                        {classifications.map((classification) => (
                          <th
                            key={classification.id}
                            className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider"
                          >
                            {classification.name}
                          </th>
                        ))}
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                          코드
                        </th>
                        {isEditMode && (
                          <th className="w-10"></th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {personaCombinations.map((combination) => {
                        const combinationKey = `P${combination.index + 1}`
                        const isUploading = uploadingThumbnails[combinationKey]
                        
                        return (
                          <tr key={combination.index} className="hover:bg-gray-50">
                            {/* 이미지 컬럼 */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {combination.thumbnail ? (
                                  <div className="relative group">
                                    <img 
                                      src={combination.thumbnail} 
                                      alt={`${combinationKey} 썸네일`}
                                      className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                                    />
                                    {isEditMode && (
                                      <button
                                        onClick={() => handleImageRemove(combinationKey)}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                                    <ImageIcon className="h-5 w-5 text-gray-400" />
                                  </div>
                                )}
                                
                                {isEditMode && (
                                  <div className="flex gap-1">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      id={`image-upload-${combinationKey}`}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                          handleImageUpload(file, combinationKey)
                                        }
                                      }}
                                      disabled={isUploading}
                                    />
                                    <label htmlFor={`image-upload-${combinationKey}`}>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="cursor-pointer"
                                        disabled={isUploading}
                                        asChild
                                      >
                                        <span>
                                          {isUploading ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <Upload className="h-3 w-3" />
                                          )}
                                        </span>
                                      </Button>
                                    </label>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openImageGallery(combinationKey)}
                                      disabled={isUploading}
                                      title="Storage에서 이미지 선택"
                                    >
                                      <FolderOpen className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </td>
                            
                            {/* 페르소나 이름 컬럼 */}
                            <td className="py-3 px-4">
                              {isEditMode ? (
                                <Input
                                  value={combination.title || ''}
                                  onChange={(e) => setPersonaCombinationTitles(prev => ({
                                    ...prev,
                                    [combinationKey]: e.target.value
                                  }))}
                                  placeholder={`페르소나 ${combinationKey}`}
                                  className="h-8 text-sm"
                                />
                              ) : (
                                <span className="text-sm font-medium text-gray-900">
                                  {combination.title}
                                </span>
                              )}
                            </td>
                            
                            {/* 분류 유형 컬럼들 */}
                            {combination.types.map((type, typeIndex) => (
                              <td key={typeIndex} className="py-3 px-4 text-sm text-gray-900">
                                {isEditMode ? (
                                  <div className="flex items-center gap-2">
                                    <span>{type.name}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50"
                                    >
                                      <Edit3 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  type.name
                                )}
                              </td>
                            ))}
                            
                            {/* 코드 컬럼 */}
                            <td className="py-3 px-4 text-sm font-mono text-gray-600">
                              {combinationKey}
                            </td>
                            
                            {/* 편집 모드 삭제 버튼 */}
                            {isEditMode && (
                              <td className="py-3 px-4">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 푸터 - 편집 모드일 때만 표시 */}
      {isEditMode && (
        <div className="px-6 py-4 border-t bg-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              분류 기준은 최대 2개, 각 분류별 유형은 최대 3개까지 설정 가능합니다
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setClassifications(savedClassifications || [])
                  setIsEditMode(false)
                }}
                variant="ghost"
                className="text-gray-600 hover:text-gray-900"
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-gray-900 hover:bg-gray-800 text-white px-6"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    저장
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 갤러리 모달 */}
      <ImageGalleryModal
        open={galleryModalOpen}
        onOpenChange={setGalleryModalOpen}
        onSelectImage={handleGalleryImageSelect}
        currentImageUrl={selectedCombinationKey ? personaCombinationThumbnails[selectedCombinationKey] : null}
      />
    </div>
  )
}