"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, FileUp, File, X, Check, AlertCircle, CheckCircle2, Plus, Settings, Sparkles, ArrowRight, ArrowLeft, Edit3, Folder, FolderOpen, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ExtractionCriteria, AddInterviewModalProps } from "@/types/components";

// 10MB 크기 제한 (바이트 단위)
const MAX_FILE_SIZE = 10 * 1024 * 1024; 

// 지원하는 파일 형식
const SUPPORTED_FILE_TYPES = [
  'text/plain', 'text/markdown', 'text/mdx', 'text/x-markdown',
  'application/pdf', 'text/html', 
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv',
  'message/rfc822', 'application/vnd.ms-outlook',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint',
  'application/xml', 'application/epub+zip'
];

// 지원하는 파일 확장자
const SUPPORTED_FILE_EXTENSIONS = [
  '.txt', '.md', '.mdx', '.markdown', '.pdf', '.html', 
  '.xlsx', '.xls', '.docx', '.csv', '.eml', '.msg', 
  '.pptx', '.ppt', '.xml', '.epub'
];

// 기본 추출 기준
const DEFAULT_CRITERIA: ExtractionCriteria[] = [
  { 
    id: 'painpoint', 
    name: '페인포인트', 
    description: '사용자가 겪는 문제와 불편함',
    isDefault: true 
  },
  { 
    id: 'needs', 
    name: '니즈', 
    description: '사용자가 원하는 것들',
    isDefault: true 
  }
];

// 추천 기준 예시
const SUGGESTED_CRITERIA = [
  { name: '사용자 경험', description: '전반적인 사용 경험과 만족도' },
  { name: '개선사항', description: '더 나아질 수 있는 부분들' },
  { name: '선호도', description: '좋아하는 기능이나 특성' },
  { name: '불편사항', description: '구체적인 불편함과 장애요소' },
  { name: '기대사항', description: '앞으로 바라는 점들' },
  { name: '사용 패턴', description: '이용 방식과 습관' }
];

export default function AddInterviewModal({ open, onClose, onComplete, onOpenChange, onFilesSubmit, projectId }: AddInterviewModalProps) {
  const [currentStep, setCurrentStep] = useState(0); // 0: 프로젝트 선택, 1: 파일 업로드
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionCriteria, setExtractionCriteria] = useState<ExtractionCriteria[]>(DEFAULT_CRITERIA);
  const [newCriteriaName, setNewCriteriaName] = useState('');
  const [newCriteriaDescription, setNewCriteriaDescription] = useState('');
  const [editingCriteria, setEditingCriteria] = useState<string | null>(null);
  const [showFileList, setShowFileList] = useState(false);
  
  // 프로젝트 관련 상태
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();

  // 프로젝트 목록 가져오기
  const fetchProjects = async () => {
    if (!profile?.company_id || !profile?.id) return;
    
    try {
      setLoadingProjects(true);
      const response = await fetch(`/api/projects?company_id=${profile.company_id}&user_id=${profile.id}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch projects:', errorText);
        throw new Error('프로젝트를 불러올 수 없습니다.');
      }
      
      const { data, success, error } = await response.json();
      if (!success) {
        throw new Error(error || '프로젝트를 불러올 수 없습니다.');
      }
      setProjects(data || []);
    } catch (error) {
      console.error('프로젝트 로드 실패:', error);
      setError('프로젝트 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoadingProjects(false);
    }
  };

  // 모달이 열릴 때 프로젝트 목록 가져오기
  useEffect(() => {
    if (open && profile?.company_id && profile?.id) {
      if (projectId) {
        // projectId가 있으면 프로젝트 선택 단계 건너뛰기
        setSelectedProjectId(projectId);
        setCurrentStep(1); // 파일 업로드 단계로 바로 이동
      } else {
        fetchProjects();
      }
    }
  }, [open, profile?.company_id, profile?.id, projectId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  // 파일 유효성 검사 함수
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `파일이 너무 커요 (최대 10MB)`;
    }
    
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!SUPPORTED_FILE_TYPES.includes(file.type) && 
        !SUPPORTED_FILE_EXTENSIONS.some(ext => fileExtension === ext)) {
      return `지원하지 않는 파일 형식이에요`;
    }
    
    if (file.size === 0) {
      return `빈 파일은 업로드할 수 없어요`;
    }
    
    return null;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles: File[] = [];
      const errors: string[] = [];
      
      droppedFiles.forEach(file => {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`);
        } else {
          validFiles.push(file);
        }
      });
      
      if (errors.length > 0) {
        setError(errors.join('\n'));
      } else {
        setError(null);
      }
      
      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles: File[] = [];
      const errors: string[] = [];
      
      selectedFiles.forEach(file => {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`);
        } else {
          validFiles.push(file);
        }
      });
      
      if (errors.length > 0) {
        setError(errors.join('\n'));
      } else {
        setError(null);
      }
      
      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles]);
      }
    }
    
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleAddCriteria = (suggestedCriteria?: { name: string; description: string }) => {
    const nameToAdd = suggestedCriteria?.name || newCriteriaName.trim();
    const descriptionToAdd = suggestedCriteria?.description || newCriteriaDescription.trim();
    
    if (!nameToAdd) {
      setError('기준 이름을 입력해주세요');
      return;
    }
    
    const isDuplicate = extractionCriteria.some(
      criteria => criteria.name.toLowerCase() === nameToAdd.toLowerCase()
    );
    
    if (isDuplicate) {
      setError('이미 추가된 기준이에요');
      return;
    }
    
    const newCriteria: ExtractionCriteria = {
      id: `custom-${Date.now()}`,
      name: nameToAdd,
      description: descriptionToAdd || `${nameToAdd}에 대한 내용을 분석해요`,
      isDefault: false
    };
    
    setExtractionCriteria(prev => [...prev, newCriteria]);
    if (!suggestedCriteria) {
      setNewCriteriaName('');
      setNewCriteriaDescription('');
    }
    setError(null);
  };

  const handleUpdateCriteria = (id: string, name: string, description: string) => {
    setExtractionCriteria(prev => 
      prev.map(criteria => 
        criteria.id === id 
          ? { ...criteria, name: name.trim(), description: description.trim() }
          : criteria
      )
    );
    setEditingCriteria(null);
  };

  const handleRemoveCriteria = (id: string) => {
    setExtractionCriteria(prev => prev.filter(criteria => criteria.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddCriteria();
    }
  };

  const handleNextStep = () => {
    if (currentStep === 0 && !projectId) {
      if (!selectedProjectId) {
        setError("프로젝트를 선택해주세요");
        return;
      }
      setError(null);
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (files.length === 0) {
        setError("분석할 파일을 먼저 선택해주세요");
        return;
      }
      setError(null);
      // 파일 업로드 후 바로 제출
      handleSubmit();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 1 && !projectId) {
      setCurrentStep(0);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError("분석할 파일을 먼저 선택해주세요");
      return;
    }
    
    if (!selectedProjectId) {
      setError("프로젝트를 선택해주세요");
      return;
    }
    
    try {
      if (onFilesSubmit) {
        await onFilesSubmit(files, extractionCriteria, selectedProjectId);
      }
      
      // 성공적으로 완료되면 onComplete 호출
      if (onComplete) {
        onComplete();
      }
      
      // 모달 닫기
      handleModalClose(false);
    } catch (error) {
      // 에러가 발생하면 모달을 닫지 않고 에러 메시지 표시
      const errorMessage = error instanceof Error ? error.message : "파일 업로드 중 오류가 발생했습니다. 다시 시도해주세요.";
      setError(errorMessage);
    }
  };

  const handleModalClose = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentStep(projectId ? 1 : 0); // projectId가 있으면 파일 업로드 단계로 리셋
      setFiles([]);
      setExtractionCriteria(DEFAULT_CRITERIA);
      setNewCriteriaName('');
      setNewCriteriaDescription('');
      setEditingCriteria(null);
      setShowFileList(false);
      if (!projectId) {
        setSelectedProjectId('');
      }
      setError(null);
      if (onClose) {
        onClose();
      } else if (onOpenChange) {
        onOpenChange(false);
      }
    } else if (onOpenChange) {
      onOpenChange(newOpen);
    }
  };

  // 파일 요약 정보 컴포넌트
  const FilesSummary = () => {
    if (files.length === 0) return null;
    
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">
              {files.length}개 파일 선택됨 ({totalSizeMB}MB)
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFileList(!showFileList)}
            className="text-green-700 hover:text-green-800 h-6 px-2"
          >
            {showFileList ? '숨기기' : '보기'}
          </Button>
        </div>
        
        <AnimatePresence>
          {showFileList && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2 max-h-32 overflow-y-auto"
            >
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-white p-2 rounded-lg border border-green-100"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <File className="h-3 w-3 text-green-600 flex-shrink-0" />
                    <span className="text-xs text-green-800 truncate">{file.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFile(index)}
                    className="h-5 w-5 text-green-400 hover:text-red-500 flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // 0단계: 프로젝트 선택
  const ProjectSelectionStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <FolderOpen className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">프로젝트를 선택해주세요</h3>
          <p className="text-sm text-gray-600 mt-1">분석 결과가 저장될 프로젝트를 선택해주세요</p>
        </div>
      </div>
      
      {loadingProjects ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-sm text-gray-600">프로젝트 목록 로딩 중...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <FolderOpen className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-2">사용 가능한 프로젝트가 없습니다</p>
          <p className="text-xs text-gray-500">프로젝트를 먼저 생성해주세요</p>
        </div>
      ) : (
        <Select onValueChange={setSelectedProjectId} value={selectedProjectId}>
          <SelectTrigger className="w-full h-11 text-sm">
            <SelectValue placeholder="프로젝트를 선택하세요..." />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );

  // 1단계: 파일 업로드
  const FileUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <Folder className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">분석할 파일을 선택해주세요</h3>
          <p className="text-sm text-gray-600 mt-1">인터뷰 내용이 담긴 파일을 업로드해주세요</p>
        </div>
      </div>
      
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
          isDragging 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept=".txt,.md,.mdx,.markdown,.pdf,.html,.xlsx,.xls,.docx,.csv,.eml,.msg,.pptx,.ppt,.xml,.epub"
        />
        
        <div className="space-y-4">
          <Upload className="h-8 w-8 text-gray-400 mx-auto" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              파일을 드래그하거나 선택해주세요
            </p>
            <Button
              type="button"
              onClick={handleUploadClick}
              size="sm"
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              파일 선택
            </Button>
            <p className="text-xs text-gray-500">
              PDF, Word, Excel, 텍스트 파일 · 최대 10MB
            </p>
          </div>
        </div>
      </div>
      
      <FilesSummary />
    </div>
  );

  // 2단계: 분석 기준 설정
  const CriteriaSetupStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <Settings className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">어떤 내용을 분석할까요?</h3>
          <p className="text-sm text-gray-600 mt-1">분석 기준을 추가하면 더 정확한 결과를 얻을 수 있어요</p>
        </div>
      </div>
      
      {/* 현재 설정된 기준 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">분석 기준 ({extractionCriteria.length}개)</h4>
        <div className="space-y-2">
          {extractionCriteria.map((criteria) => (
            <div
              key={criteria.id}
              className="p-3 bg-white border border-gray-200 rounded-xl"
            >
              {editingCriteria === criteria.id ? (
                <CriteriaEditForm 
                  criteria={criteria}
                  onSave={handleUpdateCriteria}
                  onCancel={() => setEditingCriteria(null)}
                />
              ) : (
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{criteria.name}</span>
                      {criteria.isDefault && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600">
                          기본
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{criteria.description}</p>
                  </div>
                  {!criteria.isDefault && (
                    <div className="flex items-center gap-1 ml-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingCriteria(criteria.id)}
                        className="h-6 w-6 text-gray-400 hover:text-gray-600"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCriteria(criteria.id)}
                        className="h-6 w-6 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* 새 기준 추가 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">새 기준 추가</h4>
        <div className="space-y-2">
          <Input
            value={newCriteriaName}
            onChange={(e) => setNewCriteriaName(e.target.value)}
            placeholder="분석 기준 이름"
            className="text-sm"
          />
          <Textarea
            value={newCriteriaDescription}
            onChange={(e) => setNewCriteriaDescription(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="어떤 내용을 분석하고 싶은지 설명해주세요"
            className="text-sm resize-none"
            rows={2}
          />
          <Button
            type="button"
            onClick={() => handleAddCriteria()}
            disabled={!newCriteriaName.trim()}
            size="sm"
            className="w-full bg-gray-900 hover:bg-gray-800 text-white"
          >
            <Plus className="h-3 w-3 mr-2" />
            기준 추가
          </Button>
        </div>
      </div>
      
      {/* 추천 기준 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">추천 기준</h4>
        <div className="grid grid-cols-2 gap-2">
          {SUGGESTED_CRITERIA.filter(suggested => 
            !extractionCriteria.some(criteria => 
              criteria.name.toLowerCase() === suggested.name.toLowerCase()
            )
          ).slice(0, 6).map((suggested) => (
            <button
              key={suggested.name}
              onClick={() => handleAddCriteria(suggested)}
              className="p-2 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <p className="text-xs font-medium text-gray-900">{suggested.name}</p>
              <p className="text-xs text-gray-600 mt-0.5">{suggested.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // 기준 편집 폼 컴포넌트
  const CriteriaEditForm = ({ 
    criteria, 
    onSave, 
    onCancel 
  }: { 
    criteria: ExtractionCriteria;
    onSave: (id: string, name: string, description: string) => void;
    onCancel: () => void;
  }) => {
    const [editName, setEditName] = useState(criteria.name);
    const [editDescription, setEditDescription] = useState(criteria.description);
    
    const handleSave = () => {
      if (editName.trim()) {
        onSave(criteria.id, editName, editDescription);
      }
    };
    
    return (
      <div className="space-y-2">
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="text-sm font-medium"
          placeholder="기준 이름"
        />
        <Textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          className="text-sm resize-none"
          rows={2}
          placeholder="기준 설명"
        />
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
          >
            저장
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            취소
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] p-0 flex flex-col">
        {/* 헤더 */}
        <div className="p-6 pb-4 flex-shrink-0">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  인터뷰 분석하기
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  {currentStep === 1 ? "파일을 업로드해주세요" : "분석 기준을 설정해주세요"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>
        
        {/* 컨텐츠 */}
        <div className="px-6 overflow-y-auto flex-1 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStep === 0 && !projectId && <ProjectSelectionStep />}
              {currentStep === 1 && <FileUploadStep />}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* 에러 메시지 */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-6 mb-4 flex-shrink-0"
            >
              <div className="bg-red-50 border border-red-200 p-3 rounded-xl">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* 푸터 */}
        <div className="p-6 pt-4 border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handlePreviousStep}
                  size="sm"
                  className="text-gray-600"
                >
                  <ArrowLeft className="h-3 w-3 mr-2" />
                  이전
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => onOpenChange?.(false)}
                size="sm"
                className="text-gray-600"
              >
                취소
              </Button>
            </div>
            
            <Button
              onClick={handleNextStep}
              disabled={
                (currentStep === 0 && !projectId && !selectedProjectId) ||
                (currentStep === 1 && files.length === 0)
              }
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {currentStep === 1 ? (
                <>
                  <Sparkles className="h-3 w-3 mr-2" />
                  분석 시작
                </>
              ) : (
                <>
                  다음
                  <ArrowRight className="h-3 w-3 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 