'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, FileText, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MaskingResult {
  success: boolean;
  originalLength: number;
  maskedLength: number;
  detectedCount: Record<string, number>;
  processingTime: number;
  confidence?: {
    high: number;
    total: number;
  };
  originalFileName?: string;
  maskedFileName?: string;
  fileUrl?: string;
  preview: string;
}

interface MaskingTestProps {
  projectId: string;
}

export function MaskingTest({ projectId }: MaskingTestProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<MaskingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!textInput && !file) {
      setError('파일을 업로드하거나 텍스트를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('projectId', projectId);
      
      if (file) {
        formData.append('file', file);
      } else {
        formData.append('text', textInput);
      }

      // Get auth token
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('인증이 필요합니다.');
      }

      const response = await fetch('/api/test/masking', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Masking failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '마스킹 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setTextInput('');
    }
  };

  const detectedLabels: Record<string, string> = {
    PHONE: '전화번호',
    EMAIL: '이메일',
    RRN: '주민등록번호',
    KOREAN_NAME: '이름',
    CARD: '카드번호',
    ACCOUNT: '계좌번호',
    ADDRESS: '주소',
    COMPANY_REG: '사업자번호',
    PASSPORT: '여권번호',
    DRIVER_LICENSE: '운전면허번호',
    FILENAME_KOREAN_NAME: '파일명 내 이름',
    FILENAME_PHONE: '파일명 내 전화번호',
    FILENAME_EMAIL: '파일명 내 이메일'
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            인터뷰 마스킹 테스트
          </CardTitle>
          <CardDescription>
            파일을 업로드하거나 텍스트를 직접 입력하여 개인정보 마스킹을 테스트합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">파일 업로드</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file-upload"
                type="file"
                accept=".txt,.csv"
                onChange={handleFileChange}
                disabled={isLoading}
              />
              {file && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {file.name}
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">또는</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="text-input">텍스트 직접 입력</Label>
            <Textarea
              id="text-input"
              placeholder="마스킹할 텍스트를 입력하세요. 예: 안녕하세요, 제 이름은 김철수이고 전화번호는 010-1234-5678입니다."
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                setFile(null);
              }}
              rows={6}
              disabled={isLoading}
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || (!textInput && !file)}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                마스킹 처리 중...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                마스킹 테스트 실행
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>마스킹 결과</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">원본 길이</p>
                <p className="font-medium">{result.originalLength} 글자</p>
              </div>
              <div>
                <p className="text-muted-foreground">처리 시간</p>
                <p className="font-medium">{result.processingTime}ms</p>
              </div>
              {result.confidence && (
                <>
                  <div>
                    <p className="text-muted-foreground">감지 정확도</p>
                    <p className="font-medium">
                      {result.confidence.total > 0 
                        ? `${Math.round((result.confidence.high / result.confidence.total) * 100)}%`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">총 감지 항목</p>
                    <p className="font-medium">{result.confidence.total}개</p>
                  </div>
                </>
              )}
            </div>

            {Object.keys(result.detectedCount).length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">감지된 개인정보</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(result.detectedCount).map(([key, count]) => (
                    <div key={key} className="flex justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{detectedLabels[key] || key}</span>
                      <span className="text-sm font-medium">{count}개</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.originalFileName && result.maskedFileName && result.originalFileName !== result.maskedFileName && (
              <div className="space-y-2">
                <p className="font-medium">파일명 마스킹</p>
                <div className="p-3 bg-muted rounded text-sm space-y-1">
                  <p><span className="text-muted-foreground">원본:</span> {result.originalFileName}</p>
                  <p><span className="text-muted-foreground">마스킹:</span> {result.maskedFileName}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="font-medium">마스킹된 텍스트 미리보기</p>
              <div className="p-3 bg-muted rounded text-sm whitespace-pre-wrap">
                {result.preview}
              </div>
            </div>

            {result.fileUrl && (
              <div className="space-y-2">
                <p className="font-medium">마스킹된 파일</p>
                <a 
                  href={result.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  마스킹된 파일 다운로드
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}