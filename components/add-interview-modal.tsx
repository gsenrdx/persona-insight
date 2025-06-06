"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileUp, File, X, Check, AlertCircle, CheckCircle2, User, Calendar, FileText, Plus } from "lucide-react";
import { motion } from "framer-motion";

export interface AddInterviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilesSubmit: (files: File[]) => void;
}

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

export default function AddInterviewModal({ open, onOpenChange, onFilesSubmit }: AddInterviewModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  // 파일 유효성 검사 함수
  const validateFile = (file: File): string | null => {
    // 파일 크기 검사
    if (file.size > MAX_FILE_SIZE) {
      return `파일 크기가 너무 큽니다. 최대 10MB까지 허용됩니다.`;
    }
    
    // 파일 형식 검사
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!SUPPORTED_FILE_TYPES.includes(file.type) && 
        !SUPPORTED_FILE_EXTENSIONS.some(ext => fileExtension === ext)) {
      return `지원하지 않는 파일 형식입니다. 지원되는 파일: txt, md, mdx, markdown, pdf, html, xlsx, xls, docx, csv, eml, msg, pptx, ppt, xml, epub`;
    }
    
    // 빈 파일 검사
    if (file.size === 0) {
      return `빈 파일입니다. 내용이 있는 파일을 업로드해주세요.`;
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
    
    // 파일 입력 초기화 (같은 파일 재선택 가능하도록)
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

  const handleSubmit = () => {
    // 파일 체크
    if (files.length === 0) {
      setError("파일을 선택해주세요.");
      return;
    }
    
    // 부모 컴포넌트로 파일들 전달
    onFilesSubmit(files);
    
    // 모달 초기화 및 닫기
    setFiles([]);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen);
      if (!newOpen) {
        setFiles([]);
        setError(null);
      }
    }}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>고객 인터뷰 추가</DialogTitle>
          <DialogDescription>
            인터뷰 파일을 업로드하여 분석을 시작하세요. 여러 파일을 동시에 선택할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        
        <div
          className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border'
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
          
          <div className="flex flex-col items-center justify-center gap-2">
            <Upload className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">파일을 드래그하여 놓거나</p>
            <Button
              type="button"
              variant="secondary"
              onClick={handleUploadClick}
              className="mt-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              파일 선택
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              지원 형식: txt, md, mdx, markdown, pdf, html, xlsx, xls, docx, csv, eml, msg, pptx, ppt, xml, epub (최대 10MB)
            </p>
          </div>
        </div>
            
            {files.length > 0 && (
              <div className="mt-4">
                <Label>첨부된 파일 ({files.length})</Label>
                <div className="mt-2 space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-muted/50 p-2 rounded-md"
                    >
                      <div className="flex items-center">
                        <File className="h-4 w-4 mr-2 text-primary" />
                        <span className="text-sm truncate max-w-[200px] md:max-w-[300px]">
                          {file.name}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFile(index)}
                        className="h-7 w-7"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
        {error && (
          <div className="p-3 flex items-start space-x-2 text-sm text-red-500 bg-red-50 rounded-md">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="whitespace-pre-line">{error}</div>
          </div>
        )}
        
        <DialogFooter className="flex-col sm:flex-row sm:justify-between sm:space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={files.length === 0 || !!error}
          >
            <FileUp className="h-4 w-4 mr-2" />
            추가하기 ({files.length}개 파일)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 