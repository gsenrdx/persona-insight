"use client";

import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AddInterviewModalProps } from "@/types/components";
import { toast } from "sonner";
import { X, Upload, FileText, Plus, Loader2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SUPPORTED_FILE_EXTENSIONS, MAX_FILE_SIZE_MB, getFileTypeDescription } from "@/lib/constants/file-upload";
import { preprocessFileOnClient } from "@/lib/utils/client-file-parser";

export default function AddInterviewModal({ open, onOpenChange, onFilesSubmit, projectId }: AddInterviewModalProps) {
  const [interviews, setInterviews] = useState<{id: string; type: 'file' | 'text'; name: string; content: File | string; title: string;}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const newInterviews = validFiles.map(file => ({
        id: `${Date.now()}-${Math.random()}`,
        type: 'file' as const,
        name: file.name,
        content: file,
        title: "" // 사용자가 직접 입력하도록 빈 문자열로 설정
      }));
      
      setInterviews(prev => [...prev, ...newInterviews]);
      toast.info('파일이 추가되었습니다. 각 인터뷰의 제목을 입력해주세요.');
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
      title: defaultTitle
    };
    
    setInterviews(prev => [...prev, newInterview]);
    setTextInput('');
    setTextTitle('');
    setShowTextInput(false);
  };

  // 제목 업데이트
  const updateTitle = (id: string, title: string) => {
    setInterviews(prev => prev.map(item => 
      item.id === id ? { ...item, title } : item
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
              return onFilesSubmit(processed.content as string, projectId, item.title);
            } else {
              // 다른 파일이거나 PDF 처리 실패 - 파일로 전송
              return onFilesSubmit(processed.content as File, projectId, item.title);
            }
          } else {
            // 텍스트는 그대로 전달
            return onFilesSubmit(item.content as string, projectId, item.title);
          }
        }
      });
      
      // 모든 인터뷰를 병렬로 처리
      await Promise.all(promises);
      
      toast.success(`${interviews.length}개의 인터뷰가 처리 중입니다`);
      
      setInterviews([]);
      setTextInput('');
      setTextTitle('');
      setShowTextInput(false);
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
    setShowTextInput(false);
    setIsDragging(false);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl p-0 gap-0 h-[85vh] flex flex-col">
        <DialogTitle className="sr-only">인터뷰 추가</DialogTitle>
        
        {/* 헤더 */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">인터뷰 추가</h2>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept={SUPPORTED_FILE_EXTENSIONS.join(',')}
            />
            
            {/* 드래그 앤 드롭 영역 */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={cn(
                "relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all",
                isDragging 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50",
                interviews.length > 0 && "p-8"
              )}
            >
              {isDragging ? (
                <>
                  <Upload className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                  <p className="text-lg font-medium text-blue-600">파일을 여기에 놓으세요</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    파일을 드래그하거나 클릭하여 업로드
                  </p>
                  <p className="text-sm text-gray-500">
                    {getFileTypeDescription()} (최대 {MAX_FILE_SIZE_MB}MB)
                  </p>
                </>
              )}
            </div>

            {/* 텍스트 입력 추가 버튼 */}
            {!showTextInput && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTextInput(true)}
                  className="text-gray-600"
                >
                  <Type className="w-4 h-4 mr-2" />
                  텍스트로 직접 입력
                </Button>
              </div>
            )}

            {/* 텍스트 입력 영역 */}
            {showTextInput && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">텍스트 입력</h3>
                  <button
                    onClick={() => {
                      setShowTextInput(false);
                      setTextInput('');
                      setTextTitle('');
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                
                <input
                  type="text"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  placeholder="제목 (선택사항)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="인터뷰 내용을 입력하세요..."
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                
                <Button
                  onClick={handleAddText}
                  disabled={!textInput.trim()}
                  size="sm"
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  추가
                </Button>
              </div>
            )}

            {/* 추가된 인터뷰 목록 */}
            {interviews.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">
                    추가된 인터뷰 ({interviews.length})
                  </h3>
                  {interviews.some(item => !item.title.trim()) && (
                    <span className="text-xs text-red-500">* 제목은 필수입니다</span>
                  )}
                </div>
                
                <div className="space-y-2">
                  {interviews.map((item) => (
                    <div key={item.id} className="group flex items-center gap-3 p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex-shrink-0">
                        {item.type === 'file' ? (
                          <FileText className="w-5 h-5 text-gray-400" />
                        ) : (
                          <Type className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateTitle(item.id, e.target.value)}
                          placeholder="제목을 입력하세요 (필수)"
                          data-interview-id={item.id}
                          className={cn(
                            "w-full px-2 py-1 text-sm font-medium bg-transparent border-b focus:outline-none transition-colors",
                            item.title.trim() 
                              ? "border-transparent hover:border-gray-300 focus:border-gray-400" 
                              : "border-red-300 hover:border-red-400 focus:border-red-500"
                          )}
                        />
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {item.type === 'file' ? item.name : '텍스트 입력'}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => removeInterview(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-100 rounded-lg transition-all"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 하단 액션 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
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