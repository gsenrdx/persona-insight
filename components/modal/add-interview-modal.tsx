"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { AddInterviewModalProps } from "@/types/components";
import { toast } from "sonner";
import { X, Upload, Plus, Loader2, Type, Calendar, Mic, FileAudio, Search, Sparkles, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SUPPORTED_FILE_EXTENSIONS, MAX_FILE_SIZE_MB, getFileTypeDescription, SUPPORTED_AUDIO_EXTENSIONS, MAX_AUDIO_FILE_SIZE_MB, getAudioTypeDescription, isAudioFile } from "@/lib/constants/file-upload";
import { preprocessFileOnClient } from "@/lib/utils/client-file-parser";
import { useAuth } from "@/hooks/use-auth";

type InputType = 'audio' | 'stt' | 'text';

const inputTypeOptions = [
  { value: 'audio' as InputType, label: '음성 파일', icon: Mic, disabled: false },
  { value: 'stt' as InputType, label: '문서 파일', icon: FileAudio, disabled: false },
  { value: 'text' as InputType, label: '텍스트 입력', icon: Type, disabled: false },
];

// STT 변환 상태 타입
type AudioConversionStatus = 'idle' | 'converting' | 'completed' | 'failed';

interface AudioConversionItem {
  id: string;
  file: File;
  status: AudioConversionStatus;
  transcribedText?: string;
  editableText?: string;
  error?: string;
  title: string;
  interviewDate: string;
  isExpanded?: boolean;
}

export default function AddInterviewModal({ open, onOpenChange, onFilesSubmit, projectId }: AddInterviewModalProps) {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<{id: string; type: 'file' | 'text'; name: string; content: File | string; title: string; lastModified?: number; interviewDate?: string;}[]>([]);
  const [audioConversions, setAudioConversions] = useState<AudioConversionItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [inputType, setInputType] = useState<InputType>('stt');
  const [showDropdown, setShowDropdown] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textDate, setTextDate] = useState<string>(new Date().toISOString().split('T')[0] || '');
  
  // 전역 STT 옵션 상태
  const [globalSttOptions, setGlobalSttOptions] = useState({
    speakerDiarization: true,
    includeTimestamps: true,
    interviewFormat: true
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 오디오 파일 STT 변환 함수
  const convertAudioToText = async (file: File, conversionId: string) => {
    try {
      const formData = new FormData();
      formData.append('audio', file);
      const userName = String(user?.user_metadata?.name || user?.email || '익명');
      formData.append('userName', userName);
      formData.append('sttOptions', JSON.stringify(globalSttOptions));

      const response = await fetch('/api/workflow/audio-to-text', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '변환 실패', message: '알 수 없는 오류' }));
        throw new Error(errorData.message || '변환에 실패했습니다.');
      }

      const result = await response.json();
      
      // 변환 완료 상태 업데이트
      setAudioConversions(prev => prev.map(item => 
        item.id === conversionId 
          ? { ...item, status: 'completed', transcribedText: result.data.transcribedText, editableText: result.data.transcribedText }
          : item
      ));

      toast.success(`${file.name} 변환이 완료되었습니다`);

    } catch (error: any) {
      // 변환 실패 상태 업데이트
      setAudioConversions(prev => prev.map(item => 
        item.id === conversionId 
          ? { ...item, status: 'failed', error: error.message }
          : item
      ));

      toast.error(`${file.name} 변환 실패: ${error.message}`);
    }
  };

  // 오디오 파일 처리
  const processAudioFiles = useCallback((files: FileList) => {
    const validFiles: File[] = [];
    
    Array.from(files).forEach(file => {
      if (!isAudioFile(file.name)) {
        toast.error(`${file.name}: 지원하지 않는 오디오 형식입니다`);
        return;
      }
      
      if (file.size > MAX_AUDIO_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name}: 파일이 너무 큽니다 (최대 ${MAX_AUDIO_FILE_SIZE_MB}MB)`);
        return;
      }
      
      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      const newConversions = validFiles.map(file => {
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
        const conversionId = `audio-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        
        const conversionItem: AudioConversionItem = {
          id: conversionId,
          file,
          status: 'converting',
          title: nameWithoutExtension,
          interviewDate: new Date().toISOString().split('T')[0] || new Date().toISOString().substring(0, 10)
        };

        // STT 변환 시작
        convertAudioToText(file, conversionId);
        
        return conversionItem;
      });
      
      setAudioConversions(prev => [...prev, ...newConversions]);
      toast.success(`${validFiles.length}개의 오디오 파일 변환을 시작합니다`);
    }
  }, [user]);

  // 파일 처리 (문서 파일)
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
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
        
        return {
          id: `${Date.now()}-${Math.random()}`,
          type: 'file' as const,
          name: file.name,
          content: file,
          title: nameWithoutExtension,
          lastModified: file.lastModified,
          interviewDate: new Date(file.lastModified).toISOString().split('T')[0]
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

  // 오디오 파일 선택 처리
  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processAudioFiles(files);
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
      if (inputType === 'audio') {
        processAudioFiles(files);
      } else {
        processFiles(files);
      }
    }
  }, [processFiles, processAudioFiles, inputType]);

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

  // 오디오 변환 결과를 텍스트 인터뷰로 변환
  const convertAudioToInterview = (audioItem: AudioConversionItem) => {
    if (audioItem.status !== 'completed' || !audioItem.transcribedText) return;

    const finalText = audioItem.editableText || audioItem.transcribedText || '';
    if (!finalText.trim()) return;

    const newInterview = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'text' as const,
      name: audioItem.title,
      content: finalText,
      title: audioItem.title,
      lastModified: new Date(audioItem.interviewDate).getTime(),
      interviewDate: audioItem.interviewDate
    };

    setInterviews(prev => [...prev, newInterview]);
    
    // 오디오 변환 목록에서 제거
    setAudioConversions(prev => prev.filter(item => item.id !== audioItem.id));
    
    toast.success(`${audioItem.title}이(가) 인터뷰 목록에 추가되었습니다`);
  };

  // 오디오 변환 재시도
  const retryAudioConversion = (audioItem: AudioConversionItem) => {
    setAudioConversions(prev => prev.map(item => 
      item.id === audioItem.id 
        ? { ...item, status: 'converting', error: undefined }
        : item
    ));
    
    convertAudioToText(audioItem.file, audioItem.id);
  };

  // 오디오 변환 항목 제거
  const removeAudioConversion = (id: string) => {
    setAudioConversions(prev => prev.filter(item => item.id !== id));
  };

  // 오디오 변환 제목 업데이트
  const updateAudioTitle = (id: string, title: string) => {
    setAudioConversions(prev => prev.map(item => 
      item.id === id ? { ...item, title } : item
    ));
  };

  // 오디오 변환 날짜 업데이트
  const updateAudioDate = (id: string, interviewDate: string) => {
    setAudioConversions(prev => prev.map(item => 
      item.id === id ? { ...item, interviewDate } : item
    ));
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
      const promises = interviews.map(async (item) => {
        if (onFilesSubmit) {
          if (item.type === 'file') {
            const file = item.content as File;
            const processed = await preprocessFileOnClient(file);
            
            if (processed.type === 'text') {
              return onFilesSubmit(processed.content as string, projectId, item.title, item.lastModified);
            } else {
              return onFilesSubmit(processed.content as File, projectId, item.title, item.lastModified);
            }
          } else {
            return onFilesSubmit(item.content as string, projectId, item.title, item.lastModified);
          }
        }
      });
      
      await Promise.all(promises);
      
      toast.success(`${interviews.length}개의 인터뷰가 처리 중입니다`);
      
      setInterviews([]);
      setAudioConversions([]);
      setTextInput('');
      setTextTitle('');
      setTextDate(new Date().toISOString().split('T')[0] || '');
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
    setAudioConversions([]);
    setTextInput('');
    setTextTitle('');
    setTextDate(new Date().toISOString().split('T')[0] || '');
    setInputType('stt');
    setShowDropdown(false);
    setIsDragging(false);
    setGlobalSttOptions({
      speakerDiarization: true,
      includeTimestamps: true,
      interviewFormat: true
    });
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
      <DialogContent className="max-w-4xl p-0 gap-0 h-[90vh] flex flex-col overflow-hidden">
        <DialogTitle className="sr-only">인터뷰 추가</DialogTitle>
        
        {/* 상단 헤더 영역 */}
        <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 px-8 pt-8 pb-6">
          <DialogHeader className="relative z-10">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Search className="w-6 h-6 text-blue-600" />
              인터뷰 추가
            </h2>
            <DialogDescription className="text-base text-gray-600 mt-2">
              인터뷰 데이터를 업로드하거나 직접 입력하여 고객의 목소리를 분석하세요
            </DialogDescription>
          </DialogHeader>
          
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <img 
              src="/assets/pin/pin-interview-search.png" 
              alt="Pin character"
              className="w-32 h-32 object-contain"
            />
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="px-8 py-6 space-y-6">
            {/* 입력 방식 선택 섹션 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">1</span>
                </div>
                입력 방식 선택
              </h3>
              
              <div className="ml-8 flex flex-wrap gap-3">
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
                        "relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer",
                        isSelected
                          ? "border-blue-400 bg-blue-50 text-gray-900"
                          : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50/30",
                        option.disabled && "opacity-50 cursor-not-allowed hover:bg-white hover:border-gray-200"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                        isSelected ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-600"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{option.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {option.value === 'audio' && '음성 파일을 업로드하여 자동 변환'}
                          {option.value === 'stt' && '인터뷰 STT 파일 업로드'}
                          {option.value === 'text' && '텍스트를 직접 입력'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 숨겨진 파일 입력 */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept={SUPPORTED_FILE_EXTENSIONS.join(',')}
            />
            
            <input
              ref={audioInputRef}
              type="file"
              multiple
              onChange={handleAudioFileSelect}
              className="hidden"
              accept={SUPPORTED_AUDIO_EXTENSIONS.join(',')}
            />
            
            {/* STT 변환본 업로드 */}
            {inputType === 'stt' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600">2</span>
                  </div>
                  파일 업로드
                </h3>
                
                <div className="ml-8 space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={cn(
                    "relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all",
                    isDragging 
                      ? "border-blue-400 bg-blue-50" 
                      : "border-gray-300 hover:border-blue-300 hover:bg-blue-50/20"
                  )}
                >
                  {isDragging ? (
                    <>
                      <Upload className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                      <p className="text-base font-medium text-gray-900">파일을 여기에 놓으세요</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                        <FileAudio className="w-8 h-8 text-blue-600" />
                      </div>
                      <p className="text-base font-medium text-gray-900 mb-1">
                        클릭하거나 파일을 드래그하세요
                      </p>
                      <p className="text-sm text-gray-500">
                        {getFileTypeDescription()} • 최대 {MAX_FILE_SIZE_MB}MB
                      </p>
                    </>
                  )}
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-700">STT(Speech-to-Text) 변환본은 음성을 텍스트로 변환한 문서입니다</p>
                  </div>
                </div>
                </div>
              </div>
            )}

            {/* 음성 파일 업로드 */}
            {inputType === 'audio' && (
              <div className="space-y-4">
                {/* STT 옵션 */}
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">변환 설정:</span>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={globalSttOptions.speakerDiarization}
                        onChange={(e) => setGlobalSttOptions(prev => ({ ...prev, speakerDiarization: e.target.checked }))}
                        className="w-4 h-4 text-gray-900 bg-gray-100 border-gray-300 rounded focus:ring-gray-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700">화자구분</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={globalSttOptions.includeTimestamps}
                        onChange={(e) => setGlobalSttOptions(prev => ({ ...prev, includeTimestamps: e.target.checked }))}
                        className="w-4 h-4 text-gray-900 bg-gray-100 border-gray-300 rounded focus:ring-gray-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700">타임스탬프</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={globalSttOptions.interviewFormat}
                        onChange={(e) => setGlobalSttOptions(prev => ({ ...prev, interviewFormat: e.target.checked }))}
                        className="w-4 h-4 text-gray-900 bg-gray-100 border-gray-300 rounded focus:ring-gray-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700">인터뷰형식</span>
                    </label>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600">2</span>
                  </div>
                  음성 파일 업로드
                </h3>
                
                <div className="ml-8 space-y-4">
                  <div
                    onClick={() => audioInputRef.current?.click()}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={cn(
                      "relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all",
                      isDragging 
                        ? "border-blue-400 bg-blue-50" 
                        : "border-gray-300 hover:border-blue-300 hover:bg-blue-50/20"
                    )}
                  >
                    {isDragging ? (
                      <>
                        <Upload className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                        <p className="text-base font-medium text-gray-900">음성 파일을 여기에 놓으세요</p>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                          <Mic className="w-8 h-8 text-blue-600" />
                        </div>
                        <p className="text-base font-medium text-gray-900 mb-1">
                          음성 파일을 업로드하세요
                        </p>
                        <p className="text-sm text-gray-500">
                          {getAudioTypeDescription()} • 최대 {MAX_AUDIO_FILE_SIZE_MB}MB
                        </p>
                      </>
                    )}
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-800">자동 텍스트 변환</p>
                        <p className="text-sm text-green-700 mt-1">
                          업로드한 음성 파일은 자동으로 텍스트로 변환됩니다. 변환 완료 후 제목을 입력하여 인터뷰에 추가하세요.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 텍스트 직접 입력 영역 */}
            {inputType === 'text' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600">2</span>
                  </div>
                  텍스트 입력
                </h3>
                
                <div className="ml-8 space-y-4">
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
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    인터뷰 추가
                  </Button>
                </div>
              </div>
            )}

            {/* 음성 변환 중인 파일 목록 */}
            {audioConversions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-orange-600">⚡</span>
                    </div>
                    음성 변환 진행 상황
                    <span className="text-sm font-normal text-gray-500">({audioConversions.length}개)</span>
                  </h3>
                  
                  {/* 현재 적용된 STT 옵션 표시 */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">적용된 옵션:</span>
                    {globalSttOptions.speakerDiarization && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">화자구분</span>
                    )}
                    {globalSttOptions.includeTimestamps && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded">타임스탬프</span>
                    )}
                    {globalSttOptions.interviewFormat && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">인터뷰형식</span>
                    )}
                  </div>
                </div>
                
                <div className="ml-8 space-y-3">
                  {audioConversions.map((item) => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                            item.status === 'converting' && "bg-orange-100",
                            item.status === 'completed' && "bg-green-100",
                            item.status === 'failed' && "bg-red-100"
                          )}>
                            {item.status === 'converting' && <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />}
                            {item.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                            {item.status === 'failed' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                          </div>
                          <div className="flex-1">
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => updateAudioTitle(item.id, e.target.value)}
                              className="text-sm font-medium bg-transparent border-0 border-b border-gray-300 hover:border-blue-300 focus:border-blue-500 focus:outline-none w-full"
                              placeholder="제목 입력"
                            />
                                                        <p className="text-xs text-gray-500 mt-1">{item.file.name}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={item.interviewDate}
                            onChange={(e) => updateAudioDate(item.id, e.target.value)}
                            className="text-xs text-gray-600 bg-transparent border-0 outline-none cursor-pointer hover:text-gray-800"
                          />
                          <button
                            onClick={() => removeAudioConversion(item.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <X className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {item.status === 'converting' && (
                          <p className="text-sm text-orange-600">🔄 음성을 텍스트로 변환 중...</p>
                        )}
                        
                        {item.status === 'completed' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-green-600">✅ 변환 완료!</p>
                              <button
                                onClick={() => setAudioConversions(prev => prev.map(conv => 
                                  conv.id === item.id ? { ...conv, isExpanded: !conv.isExpanded } : conv
                                ))}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                {item.isExpanded ? '접기' : '미리보기 및 편집'}
                                <svg className={`w-3 h-3 transition-transform ${item.isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                            
                            {item.isExpanded && (
                              <div className="space-y-3 bg-gray-50 p-3 rounded-lg border">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">변환된 텍스트 (수정 가능)</label>
                                  <textarea
                                    value={item.editableText || item.transcribedText || ''}
                                    onChange={(e) => setAudioConversions(prev => prev.map(conv => 
                                      conv.id === item.id ? { ...conv, editableText: e.target.value } : conv
                                    ))}
                                    className="w-full h-32 p-2 text-sm border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="변환된 텍스트가 여기에 표시됩니다..."
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    {(item.editableText || item.transcribedText || '').length} 글자
                                  </p>
                                </div>
                                
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    onClick={() => setAudioConversions(prev => prev.map(conv => 
                                      conv.id === item.id ? { ...conv, editableText: conv.transcribedText, isExpanded: false } : conv
                                    ))}
                                    size="sm"
                                    variant="outline"
                                    className="text-gray-600"
                                  >
                                    원본으로 복원
                                  </Button>
                                  <Button
                                    onClick={() => convertAudioToInterview(item)}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    disabled={!(item.editableText || item.transcribedText)?.trim()}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    인터뷰에 추가
                                  </Button>
                                </div>
                              </div>
                            )}
                            
                            {!item.isExpanded && (
                              <Button
                                onClick={() => convertAudioToInterview(item)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                바로 인터뷰에 추가
                              </Button>
                            )}
                          </div>
                        )}
                        
                        {item.status === 'failed' && (
                          <div className="space-y-2">
                            <p className="text-sm text-red-600">❌ 변환 실패: {item.error}</p>
                            <Button
                              onClick={() => retryAudioConversion(item)}
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <Loader2 className="w-3 h-3 mr-1" />
                              재시도
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 추가된 인터뷰 목록 */}
            {interviews.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600">3</span>
                  </div>
                  추가된 인터뷰 검토
                  <span className="text-sm font-normal text-gray-500">({interviews.length}개)</span>
                  {interviews.some(item => !item.title.trim()) && (
                    <span className="text-xs text-red-500 font-normal ml-auto">* 제목은 필수입니다</span>
                  )}
                </h3>
                
                <div className="ml-8 grid grid-cols-3 gap-3">
                  {interviews.map((item) => (
                    <div key={item.id} className="group relative flex flex-col p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all">
                      <div className="flex items-start gap-2 mb-2">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          item.type === 'file' ? "bg-blue-100" : "bg-gray-100"
                        )}>
                          {item.type === 'file' ? (
                            <FileAudio className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Type className="w-4 h-4 text-gray-600" />
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
                              "w-full text-sm font-medium bg-transparent border-0 border-b p-0 pb-1 focus:outline-none transition-colors",
                              item.title.trim() 
                                ? "border-gray-300 hover:border-blue-300 focus:border-blue-500" 
                                : "border-red-300 text-red-500 placeholder-red-400 hover:border-red-400"
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
        <div className="flex justify-between items-center px-8 py-4 bg-gray-50 border-t">
          <p className="text-sm text-gray-500">
            {interviews.length === 0 && audioConversions.length === 0 ? (
              '인터뷰 데이터를 추가해주세요'
            ) : (
              <>
                {interviews.length > 0 && (
                  <><span className="text-blue-600 font-medium">{interviews.length}개</span>의 인터뷰가 준비되었습니다</>
                )}
                {audioConversions.length > 0 && (
                  <>
                    {interviews.length > 0 && ' • '}
                    <span className="text-orange-600 font-medium">{audioConversions.length}개</span>의 음성 파일 변환 중
                  </>
                )}
              </>
            )}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="hover:bg-gray-100"
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={interviews.length === 0 || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  분석 시작
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}