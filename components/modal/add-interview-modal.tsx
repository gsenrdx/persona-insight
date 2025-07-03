"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AddInterviewModalProps } from "@/types/components";
import { toast } from "sonner";
import { X, Upload, FileText, Plus, Loader2, Type, Calendar, FileIcon, ChevronDown, Mic, FileAudio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SUPPORTED_FILE_EXTENSIONS, MAX_FILE_SIZE_MB, getFileTypeDescription } from "@/lib/constants/file-upload";
import { preprocessFileOnClient } from "@/lib/utils/client-file-parser";

type InputType = 'audio' | 'stt' | 'text';

const inputTypeOptions = [
  { value: 'audio' as InputType, label: '음성 파일', icon: Mic, disabled: true, badge: '준비중' },
  { value: 'stt' as InputType, label: 'STT 변환본', icon: FileAudio, disabled: false },
  { value: 'text' as InputType, label: '텍스트 입력', icon: Type, disabled: false },
];

export default function AddInterviewModal({ open, onOpenChange, onFilesSubmit, projectId }: AddInterviewModalProps) {
  const [interviews, setInterviews] = useState<{id: string; type: 'file' | 'text'; name: string; content: File | string; title: string; lastModified?: number; interviewDate?: string;}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [inputType, setInputType] = useState<InputType>('stt');
  const [showDropdown, setShowDropdown] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textDate, setTextDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 파일 처리
  const processFiles = useCallback((files: FileList) => {
    const validFiles: File[] = [];
    
    Array.from(files).forEach(file => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name}: 파일이 너무 큽니다 (최대 ${MAX_FILE_SIZE_MB}MB)`);
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      const newInterviews = validFiles.map(file => {
        // 파일명에서 확장자 제거하여 기본 제목으로 사용
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
        
        return {
          id: `${Date.now()}-${Math.random()}`,
          type: 'file' as const,
          name: file.name,
          content: file,
          title: nameWithoutExtension, // 파일명을 기본 제목으로 설정
          lastModified: file.lastModified, // 파일 수정시간 추가
          interviewDate: new Date(file.lastModified).toISOString().split('T')[0] // 인터뷰 날짜
        };
      });
      
      setInterviews(prev => [...prev, ...newInterviews]);
      toast.success(`${validFiles.length}개의 파일이 추가되었습니다.`);
    }
  }, []);

  // 파일 선택 처리
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(files);
    if (e.target) e.target.value = '';
  };

  // 드래그 이벤트 처리
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  // 텍스트 추가
  const handleAddText = () => {
    if (!textInput.trim()) {
      toast.error('내용을 입력해주세요');
      return;
    }
    
    const defaultTitle = textTitle.trim() || `텍스트 입력 ${new Date().toLocaleDateString()}`;
    
    const newInterview = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'text' as const,
      name: defaultTitle,
      content: textInput,
      title: defaultTitle,
      lastModified: new Date(textDate).getTime(),
      interviewDate: textDate
    };
    
    setInterviews(prev => [...prev, newInterview]);
    setTextInput('');
    setTextTitle('');
  };

  // 제목 업데이트
  const updateTitle = (id: string, title: string) => {
    setInterviews(prev => prev.map(item => 
      item.id === id ? { ...item, title } : item
    ));
  };

  // 인터뷰 날짜 업데이트
  const updateInterviewDate = (id: string, interviewDate: string) => {
    setInterviews(prev => prev.map(item => 
      item.id === id ? { ...item, interviewDate, lastModified: new Date(interviewDate).getTime() } : item
    ));
  };

  // 삭제
  const removeInterview = (id: string) => {
    setInterviews(prev => prev.filter(item => item.id !== id));
  };

  // 제출
  const handleSubmit = async () => {
    if (interviews.length === 0) {
      toast.error('인터뷰를 추가해주세요');
      return;
    }

    // 제목이 없는 인터뷰 확인
    const untitledInterviews = interviews.filter(item => !item.title.trim());
    if (untitledInterviews.length > 0) {
      toast.error('모든 인터뷰에 제목을 입력해주세요');
      // 첫 번째 제목 없는 인터뷰에 포커스
      const firstUntitled = untitledInterviews[0];
      if (firstUntitled) {
        const inputElement = document.querySelector(`[data-interview-id="${firstUntitled.id}"]`) as HTMLInputElement;
        if (inputElement) {
          inputElement.focus();
        }
      }
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 각 인터뷰를 개별적으로 처리
      const promises = interviews.map(async (item) => {
        // 각 인터뷰를 개별적으로 제출
        if (onFilesSubmit) {
          if (item.type === 'file') {
            // PDF 파일은 클라이언트에서 텍스트 추출 시도
            const file = item.content as File;
            const processed = await preprocessFileOnClient(file);
            
            if (processed.type === 'text') {
              // PDF에서 텍스트 추출 성공 - 텍스트로 전송
              return onFilesSubmit(processed.content as string, projectId, item.title, item.lastModified);
            } else {
              // 다른 파일이거나 PDF 처리 실패 - 파일로 전송
              return onFilesSubmit(processed.content as File, projectId, item.title, item.lastModified);
            }
          } else {
            // 텍스트는 그대로 전달
            return onFilesSubmit(item.content as string, projectId, item.title, item.lastModified);
          }
        }
      });
      
      // 모든 인터뷰를 병렬로 처리
      await Promise.all(promises);
      
      toast.success(`${interviews.length}개의 인터뷰가 처리 중입니다`);
      
      setInterviews([]);
      setTextInput('');
      setTextTitle('');
      setTextDate(new Date().toISOString().split('T')[0]);
      onOpenChange?.(false);
    } catch (error) {
      toast.error('처리 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };


  // 모달 닫기 시 상태 초기화
  const handleClose = () => {
    setInterviews([]);
    setTextInput('');
    setTextTitle('');
    setTextDate(new Date().toISOString().split('T')[0]);
    setInputType('stt');
    setShowDropdown(false);
    setIsDragging(false);
    onOpenChange?.(false);
  };

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 gap-0 h-[90vh] flex flex-col">
        <DialogTitle className="sr-only">인터뷰 추가</DialogTitle>
        
        {/* 헤더 - Medium 스타일 */}
        <div className="px-6 py-5 border-b">
          <h2 className="text-xl font-medium text-gray-900">인터뷰 추가</h2>
          <p className="text-sm text-gray-500 mt-1">인터뷰 데이터를 업로드하거나 직접 입력하세요</p>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* 입력 방식 선택 - Flex wrap 스타일 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">입력 방식 선택</label>
              <div className="flex flex-wrap gap-3">
                {inputTypeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = inputType === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        if (!option.disabled) {
                          setInputType(option.value);
                        }
                      }}
                      disabled={option.disabled}
                      className={cn(
                        "relative flex items-center gap-3 px-4 py-3 rounded-lg border transition-all",
                        isSelected
                          ? "border-blue-500 bg-blue-50 text-gray-900"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                        option.disabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-md flex items-center justify-center",
                        isSelected ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{option.label}</span>
                          {option.badge && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded">
                              {option.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {option.value === 'audio' && '음성 파일을 직접 업로드'}
                          {option.value === 'stt' && 'STT 변환된 텍스트 파일'}
                          {option.value === 'text' && '텍스트를 직접 입력'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept={SUPPORTED_FILE_EXTENSIONS.join(',')}
            />
            
            {/* STT 변환본 업로드 - 드래그 앤 드롭 영역 */}
            {inputType === 'stt' && (
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={cn(
                    "relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all",
                    isDragging 
                      ? "border-gray-900 bg-gray-50" 
                      : "border-gray-300 hover:border-gray-400"
                  )}
                >
                  {isDragging ? (
                    <>
                      <Upload className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                      <p className="text-base font-medium text-gray-900">파일을 여기에 놓으세요</p>
                    </>
                  ) : (
                    <>
                      <FileAudio className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-base font-medium text-gray-900 mb-1">
                        클릭하거나 파일을 드래그하세요
                      </p>
                      <p className="text-sm text-gray-500">
                        {getFileTypeDescription()} • 최대 {MAX_FILE_SIZE_MB}MB
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium">팁:</span>
                  <p>STT(Speech-to-Text) 변환본은 음성을 텍스트로 변환한 문서입니다</p>
                </div>
              </div>
            )}

            {/* 텍스트 직접 입력 영역 */}
            {inputType === 'text' && (
              <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                      <input
                        type="text"
                        value={textTitle}
                        onChange={(e) => setTextTitle(e.target.value)}
                        placeholder="인터뷰 제목을 입력하세요"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>인터뷰 날짜</span>
                        </div>
                      </label>
                      <input
                        type="date"
                        value={textDate}
                        onChange={(e) => setTextDate(e.target.value)}
                        className="px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="인터뷰 내용을 입력하세요..."
                      className="w-full h-32 px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                  
                  <Button
                    onClick={handleAddText}
                    disabled={!textInput.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    인터뷰 추가
                  </Button>
              </div>
            )}

            {/* 음성 파일 업로드 (준비중) */}
            {inputType === 'audio' && (
              <div className="space-y-4">
                <div className="relative border-2 border-dashed rounded-lg p-16 text-center bg-gray-50">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                    <Mic className="w-10 h-10 text-gray-500" />
                  </div>
                  <p className="text-xl font-medium text-gray-700 mb-2">
                    음성 파일 업로드
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    음성 파일을 업로드하면 자동으로 텍스트로 변환됩니다
                  </p>
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gray-300 text-gray-700">
                    🚧 준비중
                  </span>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-yellow-600">!</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">준비중인 기능입니다</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        음성 파일 업로드 기능은 현재 개발 중입니다. STT 변환본을 텍스트 파일로 업로드해주세요.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 추가된 인터뷰 목록 - 동적 그리드 카드 스타일 */}
            {interviews.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">
                    추가된 인터뷰 ({interviews.length})
                  </h3>
                  {interviews.some(item => !item.title.trim()) && (
                    <span className="text-xs text-red-500">제목은 필수입니다</span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-3">
                  {interviews.map((item, index) => (
                    <div key={item.id} className="group relative inline-flex flex-col p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all">
                      {/* 헤더 영역 */}
                      <div className="flex items-start gap-2 mb-2">
                        <div className={cn(
                          "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0",
                          item.type === 'file' ? "bg-blue-100" : "bg-gray-200"
                        )}>
                          {item.type === 'file' ? (
                            <FileAudio className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Type className="w-4 h-4 text-gray-700" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => updateTitle(item.id, e.target.value)}
                            placeholder="제목 입력"
                            data-interview-id={item.id}
                            className={cn(
                              "w-full text-sm font-medium bg-transparent border-0 border-b p-0 pb-0.5 focus:outline-none transition-colors",
                              item.title.trim() 
                                ? "border-gray-300 hover:border-gray-400 focus:border-gray-900" 
                                : "border-red-300 text-red-500 placeholder-red-400"
                            )}
                          />
                        </div>
                        
                        <button
                          onClick={() => removeInterview(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-100 rounded transition-all -mt-0.5 -mr-0.5"
                        >
                          <X className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                      
                      {/* 메타 정보 */}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="truncate max-w-[150px]">
                          {item.type === 'file' ? item.name : '텍스트'}
                        </span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <input
                            type="date"
                            value={item.interviewDate || new Date().toISOString().split('T')[0]}
                            onChange={(e) => updateInterviewDate(item.id, e.target.value)}
                            className="text-xs text-gray-600 bg-transparent border-0 outline-none cursor-pointer hover:text-gray-800"
                            style={{ 
                              colorScheme: 'light',
                              minWidth: '90px'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 하단 액션 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={interviews.length === 0 || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                처리 중...
              </>
            ) : (
              `분석 시작${interviews.length > 0 ? ` (${interviews.length})` : ''}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}