"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileUp, File, X, Check, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export interface AddInterviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 10MB 크기 제한 (바이트 단위)
const MAX_FILE_SIZE = 10 * 1024 * 1024; 

export default function AddInterviewModal({ open, onOpenChange }: AddInterviewModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [directText, setDirectText] = useState("");
  
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
    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      return `텍스트(.txt) 파일만 업로드 가능합니다.`;
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
      const droppedFile = e.dataTransfer.files[0]; // 첫 번째 파일만 처리
      
      const validationError = validateFile(droppedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      
      setFiles([droppedFile]); // 파일 하나만 설정
      setError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]; // 첫 번째 파일만 처리
      
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      
      setFiles([selectedFile]); // 파일 하나만 설정
      setError(null);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles([]);
    setError(null);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDirectText(e.target.value);
    setError(null);
  };

  const handleSubmit = async () => {
    // 파일 모드일 때 파일 체크
    if (inputMode === "file" && files.length === 0) {
      setError("파일을 선택해주세요.");
      return;
    }
    
    // 텍스트 모드일 때 텍스트 체크
    if (inputMode === "text" && !directText.trim()) {
      setError("인터뷰 내용을 입력해주세요.");
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      
      if (inputMode === "file") {
        // 파일 업로드 모드
        formData.append('file', files[0]);
      } else {
        // 텍스트 직접 입력 모드
        // 텍스트를 Blob으로 변환하여 파일처럼 전송
        const textBlob = new Blob([directText], { type: 'text/plain' });
        formData.append('file', textBlob, 'interview-text.txt');
      }
      
      // workflow API 엔드포인트로 요청 전송
      const response = await fetch('/api/workflow', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || '파일 처리 중 오류가 발생했습니다');
      }
      
      setUploadSuccess(true);
      
      // 3초 후 모달 닫기
      setTimeout(() => {
        setFiles([]);
        setDirectText("");
        setIsUploading(false);
        setUploadSuccess(false);
        onOpenChange(false);
      }, 3000);
    } catch (error: any) {
      console.error("처리 실패:", error);
      setError(error.message || '파일 처리 중 오류가 발생했습니다');
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!isUploading) {
        onOpenChange(newOpen);
        if (!newOpen) {
          setFiles([]);
          setDirectText("");
          setError(null);
        }
      }
    }}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>고객 인터뷰 추가(개발중)</DialogTitle>
          <DialogDescription>
            *현재 작업중입니다.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={inputMode} onValueChange={(value) => setInputMode(value as "file" | "text")} className="pt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">파일 업로드</TabsTrigger>
            <TabsTrigger value="text">텍스트 입력</TabsTrigger>
          </TabsList>
          
          <TabsContent value="file" className="pt-2">
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
                accept=".txt,text/plain"
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
                  <FileUp className="h-4 w-4 mr-2" />
                  파일 선택
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  지원 형식: TXT (최대 10MB)
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
          </TabsContent>
          
          <TabsContent value="text" className="pt-2">
            <div className="mt-2">
              <Label htmlFor="interview-text">인터뷰 내용을 직접 입력하세요</Label>
              <Textarea 
                id="interview-text"
                placeholder="인터뷰 내용을 여기에 붙여넣거나 직접 입력하세요..."
                value={directText} 
                onChange={handleTextChange}
                className="mt-2 min-h-[200px]"
              />
              <p className="text-xs text-muted-foreground mt-2">
                최대 10MB 텍스트까지 입력 가능합니다.
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        {error && (
          <div className="p-3 flex items-start space-x-2 text-sm text-red-500 bg-red-50 rounded-md">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        <DialogFooter className="flex-col sm:flex-row sm:justify-between sm:space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={(inputMode === "file" && files.length === 0) || 
              (inputMode === "text" && !directText.trim()) || 
              isUploading || 
              !!error}
            className="relative"
          >
            {isUploading && (
              <span className="absolute inset-0 flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            )}
            {uploadSuccess && (
              <span className="absolute inset-0 flex items-center justify-center">
                <Check className="h-5 w-5 text-current" />
              </span>
            )}
            <span className={isUploading || uploadSuccess ? 'opacity-0' : ''}>
              분석하기
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 