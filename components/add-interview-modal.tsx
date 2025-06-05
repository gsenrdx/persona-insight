"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileUp, File, X, Check, AlertCircle, CheckCircle2, User, Calendar, FileText } from "lucide-react";
import { motion } from "framer-motion";

export interface AddInterviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export default function AddInterviewModal({ open, onOpenChange }: AddInterviewModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 분석 결과 상태 관리
  const [analysisResult, setAnalysisResult] = useState<{
    type: string;
    description: string;
    summary: string;
    date: string;
    charging_pattern_scores: Array<{
      home_centric_score: number;
      road_centric_score: number;
    }>;
    value_orientation_scores: Array<{
      cost_driven_score: number;
      tech_brand_driven_score: number;
    }>;
  } | null>(null);
  
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

  const handleSubmit = async () => {
    // 파일 체크
    if (files.length === 0) {
      setError("파일을 선택해주세요.");
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      
      // workflow API 엔드포인트로 요청 전송 (블로킹 모드)
      const response = await fetch('/api/workflow', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || '파일 처리 중 오류가 발생했습니다');
      }
      
      // JSON 응답 파싱
      const analysisData = await response.json();
      
      // 분석 결과 설정
      setAnalysisResult({
        type: analysisData.type || "알 수 없음",
        description: analysisData.description || "설명이 없습니다.",
        summary: analysisData.summary || "요약이 없습니다.",
        date: analysisData.date || "날짜 정보가 없습니다.",
        charging_pattern_scores: analysisData.charging_pattern_scores || [
          {
            home_centric_score: 0,
            road_centric_score: 0
          }
        ],
        value_orientation_scores: analysisData.value_orientation_scores || [
          {
            cost_driven_score: 0,
            tech_brand_driven_score: 0
          }
        ]
      });
      
      setUploadSuccess(true);
      setIsUploading(false);
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
          setError(null);
        }
      }
    }}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl">
        {!uploadSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>고객 인터뷰 추가</DialogTitle>
              <DialogDescription>
                인터뷰 파일을 업로드하여 분석을 시작하세요.
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
                  <FileUp className="h-4 w-4 mr-2" />
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
                disabled={files.length === 0 || isUploading || !!error}
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
                <span className={isUploading ? 'opacity-0' : ''}>
                  분석하기
                </span>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-4 text-center"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
              className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full mb-3"
            >
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg font-semibold mb-4"
            >
              분석 완료!
            </motion.h2>
            
            {analysisResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full space-y-4"
              >
                {/* 사용자 유형 카드 */}
                <div className="bg-primary/5 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-primary">사용자 유형</h3>
                    <Badge 
                      variant="outline" 
                      className="text-xs font-medium border-primary/30 bg-primary/10 text-primary"
                    >
                      {`Type ${analysisResult.type}`}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/90">{analysisResult.description}</p>
                </div>

                {/* 점수 그리드 */}
                <div className="grid grid-cols-2 gap-3">
                  {/* 충전 패턴 점수 */}
                  {analysisResult.charging_pattern_scores?.[0] && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <h4 className="text-xs font-medium mb-3">충전 패턴</h4>
                      <div className="space-y-2">
                        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-500"
                            style={{ 
                              width: `${analysisResult.charging_pattern_scores[0].home_centric_score}%` 
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-blue-600 font-medium">
                            단거리 충전 {analysisResult.charging_pattern_scores[0].home_centric_score}%
                          </span>
                          <span className="text-muted-foreground">
                            장거리 충전 {analysisResult.charging_pattern_scores[0].road_centric_score}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 가치 지향 점수 */}
                  {analysisResult.value_orientation_scores?.[0] && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <h4 className="text-xs font-medium mb-3">가치 지향</h4>
                      <div className="space-y-2">
                        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-500"
                            style={{ 
                              width: `${analysisResult.value_orientation_scores[0].cost_driven_score}%` 
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-green-600 font-medium">
                            비용 절약 {analysisResult.value_orientation_scores[0].cost_driven_score}%
                          </span>
                          <span className="text-muted-foreground">
                            품질,기술 {analysisResult.value_orientation_scores[0].tech_brand_driven_score}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 날짜와 요약 정보 */}
                <div className="bg-muted/40 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{analysisResult.date}</span>
                  </div>
                  <p className="text-sm text-foreground/90">
                    {analysisResult.summary}
                  </p>
                </div>
              </motion.div>
            )}
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-4"
            >
              <Button 
                onClick={() => {
                  setUploadSuccess(false);
                  setFiles([]);
                  setAnalysisResult(null);
                  onOpenChange(false);
                }}
                size="sm"
                className="px-6"
              >
                확인
              </Button>
            </motion.div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
} 