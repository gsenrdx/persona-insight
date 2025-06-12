"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Trash2, 
  User,
  Loader2,
  Plus,
  MoreHorizontal,
  Sparkles,
  Star,
  FileText,
  Calendar,
  ArrowLeft,
  File,
  X,
  AlertCircle,
  Target,
  MessageSquare,
  Quote,
  Hash,
  Lightbulb,
  AlertTriangle,
  Battery,
  TrendingUp,
  Brain,
  Eye
} from "lucide-react";
import { WorkflowJob, WorkflowStatus } from "@/hooks/use-workflow-queue";
import React, { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface WorkflowProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: WorkflowJob[];
  onRetryJob: (jobId: string) => void;
  onRemoveJob: (jobId: string) => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
  onAddMore: () => void;
  onJobClick?: (job: WorkflowJob) => void;
  onStartPersonaSynthesis?: (jobId: string) => void;
}

const statusConfig = {
  [WorkflowStatus.PENDING]: {
    icon: Clock,
    label: "대기중",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200"
  },
  [WorkflowStatus.PROCESSING]: {
    icon: Loader2,
    label: "분석중",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200"
  },
  [WorkflowStatus.COMPLETED]: {
    icon: CheckCircle2,
    label: "분석완료",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200"
  },
  [WorkflowStatus.FAILED]: {
    icon: XCircle,
    label: "실패",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    badgeClass: "bg-red-100 text-red-700 border-red-200"
  },
  [WorkflowStatus.PERSONA_SYNTHESIZING]: {
    icon: Sparkles,
    label: "페르소나 반영중",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    badgeClass: "bg-purple-100 text-purple-700 border-purple-200"
  },
  [WorkflowStatus.PERSONA_SYNTHESIS_COMPLETED]: {
    icon: Star,
    label: "완료",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200"
  },
  [WorkflowStatus.PERSONA_SYNTHESIS_FAILED]: {
    icon: XCircle,
    label: "반영실패",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    badgeClass: "bg-red-100 text-red-700 border-red-200"
  }
};

// 점수 슬라이더 컴포넌트
function ScoreSlider({ label, value, color = "blue" }: { label: string, value: number, color?: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500", 
    orange: "bg-orange-500",
    purple: "bg-purple-500",
    emerald: "bg-emerald-500"
  }

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-gray-700 min-w-[100px]">{label}</span>
      <div className="flex-1 mx-3">
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${colorClasses[color] || colorClasses.blue} transition-all duration-500`}
              style={{ width: `${value}%` }}
            />
          </div>
          <div 
            className={`absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white border-2 ${
              color === 'blue' ? 'border-blue-500' : 
              color === 'green' ? 'border-green-500' :
              color === 'orange' ? 'border-orange-500' :
              color === 'purple' ? 'border-purple-500' :
              'border-emerald-500'
            } rounded-full shadow-sm`}
            style={{ left: `calc(${value}% - 6px)` }}
          />
        </div>
      </div>
      <span className="text-xs font-semibold text-gray-900 min-w-[30px] text-right">{value}</span>
    </div>
  )
}

// 애플 스타일 컴팩트 JobCard
const JobCard = React.memo(({ 
  job, 
  pendingPosition, 
  onJobClick, 
  onRetryJob, 
  onRemoveJob 
}: { 
  job: WorkflowJob; 
  pendingPosition?: number;
  onJobClick: (job: WorkflowJob) => void;
  onRetryJob: (jobId: string) => void;
  onRemoveJob: (jobId: string) => void;
}) => {
  const config = statusConfig[job.status];
  const StatusIcon = config.icon;
  
  return (
    <div
      className="group relative p-3 rounded-lg border border-gray-200 cursor-pointer transition-all duration-200 hover:border-gray-300 hover:shadow-sm bg-white"
      onClick={() => onJobClick(job)}
    >
      {/* 상태 표시 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${config.bgColor} border ${config.borderColor}`}>
            {(job.status === WorkflowStatus.PROCESSING || job.status === WorkflowStatus.PERSONA_SYNTHESIZING) ? (
              <Loader2 className={`h-3 w-3 animate-spin ${config.color}`} />
            ) : (
              <StatusIcon className={`h-3 w-3 ${config.color}`} />
            )}
          </div>
          {job.status === WorkflowStatus.PENDING && pendingPosition && (
            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">
              #{pendingPosition}
            </span>
          )}
        </div>
        
        {/* 액션 버튼들 */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {(job.status === WorkflowStatus.FAILED || job.status === WorkflowStatus.PERSONA_SYNTHESIS_FAILED) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetryJob(job.id);
              }}
              className="w-5 h-5 rounded-md bg-gray-100 hover:bg-blue-50 flex items-center justify-center text-blue-600 transition-colors"
              title="다시 시도"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
          
          {(job.status === WorkflowStatus.COMPLETED || 
            job.status === WorkflowStatus.FAILED ||
            job.status === WorkflowStatus.PERSONA_SYNTHESIS_COMPLETED ||
            job.status === WorkflowStatus.PERSONA_SYNTHESIS_FAILED) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveJob(job.id);
              }}
              className="w-5 h-5 rounded-md bg-gray-100 hover:bg-red-50 flex items-center justify-center text-red-600 transition-colors"
              title="제거"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      
      {/* 파일 정보 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <File className="h-3 w-3 text-gray-500 flex-shrink-0" />
          <span className="text-xs font-medium text-gray-900 truncate">{job.fileName}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-md ${config.badgeClass}`}>
            {config.label}
          </span>
          
          {/* 진행률 (처리중일 때만) */}
          {job.status === WorkflowStatus.PROCESSING && (
            <div className="flex-1 bg-gray-200 rounded-full h-1 overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          )}
        </div>
        
        {/* 에러 메시지 (간략히) */}
        {job.error && (
          <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md truncate">
            오류: {job.error}
          </p>
        )}
      </div>
    </div>
  );
});

JobCard.displayName = 'JobCard';

// 개선된 상세 패널
const JobDetailPanel = React.memo(({ 
  job, 
  onClose, 
  onRetryJob, 
  onRemoveJob,
  onStartPersonaSynthesis
}: { 
  job: WorkflowJob;
  onClose: () => void;
  onRetryJob: (jobId: string) => void;
  onRemoveJob: (jobId: string) => void;
  onStartPersonaSynthesis?: (jobId: string) => void;
}) => {
  const { profile } = useAuth();
  const config = statusConfig[job.status];
  const StatusIcon = config.icon;

  // 페르소나 합성 완료 여부 체크
  const isPersonaSynthesized = job.status === WorkflowStatus.PERSONA_SYNTHESIS_COMPLETED;
  const hasAnalysisResult = job.result && (job.status === WorkflowStatus.COMPLETED || isPersonaSynthesized);

  // 상세 인터뷰 데이터 상태
  const [interviewDetail, setInterviewDetail] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 실제 반환된 데이터 구조에 맞게 추출
  // job.result는 { type, description, summary, date, interviewee_style, x_axis, y_axis, interviewee_fake_name, interview_detail } 형태
  const analysisResult = job.result;

  // JSON 파싱 헬퍼 함수 (interview-detail.tsx에서 가져옴)
  const parseInterviewDetail = (detail: any) => {
    if (!detail) return null
    if (Array.isArray(detail)) return detail
    if (typeof detail === 'string') {
      try {
        let cleanedDetail = detail.trim()
        cleanedDetail = cleanedDetail.replace(/^```[\s\S]*?\n/, '').replace(/\n```[\s\S]*$/, '')
        
        let jsonStartIndex = cleanedDetail.indexOf('[')
        if (jsonStartIndex === -1) return null
        
        let bracketCount = 0
        let jsonEndIndex = -1
        
        for (let i = jsonStartIndex; i < cleanedDetail.length; i++) {
          if (cleanedDetail[i] === '[') bracketCount++
          else if (cleanedDetail[i] === ']') {
            bracketCount--
            if (bracketCount === 0) {
              jsonEndIndex = i
              break
            }
          }
        }
        
        if (jsonEndIndex === -1) return null
        
        cleanedDetail = cleanedDetail.substring(jsonStartIndex, jsonEndIndex + 1)
        let fixedJson = cleanedDetail
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/([}\]]),\s*([}\]])/g, '$1$2')
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
        
        return JSON.parse(fixedJson)
      } catch (error) {
        return null
      }
    }
    return null
  }

  // 인터뷰 상세 데이터 가져오기 - project-interviews.tsx와 동일한 방식 사용
  useEffect(() => {
    if (hasAnalysisResult && job.projectId) {
      console.log('🔍 상세 데이터 로딩 시작:', {
        hasAnalysisResult,
        projectId: job.projectId,
        companyId: profile?.company_id,
        analysisResult
      });
      
      setLoadingDetail(true);
      
      const fetchInterviewDetail = async () => {
        try {
          // API를 통해 인터뷰 데이터 조회 (project-interviews.tsx와 동일한 방식)
          const apiUrl = `/api/supabase/interviewee?company_id=${profile?.company_id}&project_id=${job.projectId}&limit=100&offset=0`;
          console.log('📡 API 호출:', apiUrl);
          
          const response = await fetch(apiUrl);
          
          if (!response.ok) {
            throw new Error('인터뷰 데이터를 가져오는데 실패했습니다');
          }
          
          const result = await response.json();
          const interviews = result.data || [];
          
          console.log('📊 API 응답:', {
            totalInterviews: interviews.length,
            interviews: interviews.map((i: any) => ({
              id: i.id,
              name: i.interviewee_fake_name,
              hasDetail: !!i.interview_detail,
              createdAt: i.created_at
            }))
          });
          
          // 여러 조건으로 매칭 시도
          let matchedInterview = null;
          
          // 1. interviewee_id로 직접 매칭
          if (analysisResult?.interviewee_id) {
            matchedInterview = interviews.find((interview: any) => interview.id === analysisResult.interviewee_id);
            console.log('🎯 ID 매칭 결과:', {
              searchId: analysisResult.interviewee_id,
              found: !!matchedInterview,
              matchedId: matchedInterview?.id
            });
          }
          
          // 2. interviewee_fake_name으로 매칭
          if (!matchedInterview && analysisResult?.interviewee_fake_name) {
            matchedInterview = interviews.find((interview: any) => 
              interview.interviewee_fake_name === analysisResult.interviewee_fake_name
            );
            console.log('🏷️ 이름 매칭 결과:', {
              searchName: analysisResult.interviewee_fake_name,
              found: !!matchedInterview,
              matchedName: matchedInterview?.interviewee_fake_name
            });
          }
          
          // 3. 가장 최신 인터뷰로 fallback
          if (!matchedInterview && interviews.length > 0) {
            // 최근 5분 이내 생성된 인터뷰 찾기
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const recentInterviews = interviews.filter((interview: any) => 
              new Date(interview.created_at) > fiveMinutesAgo
            );
            
            if (recentInterviews.length > 0) {
              matchedInterview = recentInterviews[0];
              console.log('⏰ 최신 인터뷰 fallback:', {
                recentCount: recentInterviews.length,
                selectedId: matchedInterview.id
              });
            }
          }
          
          if (matchedInterview?.interview_detail) {
            console.log('📝 매칭된 인터뷰:', {
              id: matchedInterview.id,
              name: matchedInterview.interviewee_fake_name,
              detailType: typeof matchedInterview.interview_detail,
              detailLength: matchedInterview.interview_detail?.length || 0
            });
            
            // interview-detail.tsx와 동일한 방식으로 파싱
            const parsedDetail = parseInterviewDetail(matchedInterview.interview_detail);
            
            console.log('🔧 파싱 결과:', {
              parsedType: typeof parsedDetail,
              isArray: Array.isArray(parsedDetail),
              length: parsedDetail?.length || 0,
              sample: parsedDetail?.[0]
            });
            
            if (parsedDetail && Array.isArray(parsedDetail) && parsedDetail.length > 0) {
              setInterviewDetail(parsedDetail);
              console.log('✅ 상세 데이터 설정 완료:', parsedDetail.length, '개 토픽');
            } else {
              console.log('❌ 파싱된 데이터가 유효하지 않음');
            }
          } else {
            console.log('❌ 매칭된 인터뷰가 없거나 interview_detail이 없음');
          }
          
        } catch (error) {
          console.error('❌ 인터뷰 상세 데이터 로드 실패:', error);
        } finally {
          setLoadingDetail(false);
        }
      };

      fetchInterviewDetail();
    } else {
      console.log('⚠️ 조건 미충족:', {
        hasAnalysisResult,
        projectId: job.projectId,
        profileLoaded: !!profile
      });
    }
  }, [hasAnalysisResult, job.projectId, analysisResult?.interviewee_id, analysisResult?.interviewee_fake_name, profile?.company_id]);
  

  return (
    <div className="flex flex-col h-full max-h-[85vh] border-l bg-white">
      {/* 컴팩트 헤더 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-gray-600" />
            </button>
            <h2 className="text-base font-medium text-gray-900">분석 결과</h2>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor} border ${config.borderColor}`}>
            {(job.status === WorkflowStatus.PROCESSING || job.status === WorkflowStatus.PERSONA_SYNTHESIZING) ? (
              <Loader2 className={`h-4 w-4 animate-spin ${config.color}`} />
            ) : (
              <StatusIcon className={`h-4 w-4 ${config.color}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 text-sm truncate">{job.fileName}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-1 rounded-md ${config.badgeClass}`}>
                {config.label}
              </span>
              {isPersonaSynthesized && (
                <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                  반영완료
                </span>
              )}
            </div>
          </div>
          
          {/* 컴팩트 평가 점수 */}
          {hasAnalysisResult && analysisResult && (
            <div className="flex flex-col gap-1.5 w-32">
              {/* X축 점수 바 */}
              {analysisResult.x_axis && Array.isArray(analysisResult.x_axis) && analysisResult.x_axis.length > 0 && (
                <div className="flex items-center gap-1">
                  {(() => {
                    const xData = analysisResult.x_axis[0] || {};
                    const keys = Object.keys(xData);
                    const values = Object.values(xData) as number[];
                    if (keys.length >= 2 && values.length >= 2) {
                      const [key1, key2] = keys;
                      const [val1, val2] = values;
                      const total = val1 + val2;
                      const leftPercent = total > 0 ? (val1 / total) * 100 : 50;
                      return (
                        <>
                          <span className="text-xs text-gray-600 w-6 text-left truncate" title={key1.replace('_score', '')}>
                            {key1.split('_score')[0].substring(0, 2)}
                          </span>
                          <div className="relative flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-500"
                              style={{ width: `${leftPercent}%` }}
                            />
                            <div 
                              className="absolute right-0 top-0 h-full bg-blue-300 transition-all duration-500"
                              style={{ width: `${100 - leftPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-6 text-right truncate" title={key2.replace('_score', '')}>
                            {key2.split('_score')[0].substring(0, 2)}
                          </span>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
              
              {/* Y축 점수 바 */}
              {analysisResult.y_axis && Array.isArray(analysisResult.y_axis) && analysisResult.y_axis.length > 0 && (
                <div className="flex items-center gap-1">
                  {(() => {
                    const yData = analysisResult.y_axis[0] || {};
                    const keys = Object.keys(yData);
                    const values = Object.values(yData) as number[];
                    if (keys.length >= 2 && values.length >= 2) {
                      const [key1, key2] = keys;
                      const [val1, val2] = values;
                      const total = val1 + val2;
                      const leftPercent = total > 0 ? (val1 / total) * 100 : 50;
                      return (
                        <>
                          <span className="text-xs text-gray-600 w-6 text-left truncate" title={key1.replace('_score', '')}>
                            {key1.split('_score')[0].substring(0, 2)}
                          </span>
                          <div className="relative flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="absolute left-0 top-0 h-full bg-purple-500 transition-all duration-500"
                              style={{ width: `${leftPercent}%` }}
                            />
                            <div 
                              className="absolute right-0 top-0 h-full bg-purple-300 transition-all duration-500"
                              style={{ width: `${100 - leftPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-6 text-right truncate" title={key2.replace('_score', '')}>
                            {key2.split('_score')[0].substring(0, 2)}
                          </span>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 진행률 (처리중일 때만) */}
        {job.status === WorkflowStatus.PROCESSING && (
          <div className="mt-3">
            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>분석중</span>
              <span>{Math.round(job.progress)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* 컨텐츠 - 2열 그리드 */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-4">
          {/* 오류 정보 */}
          {job.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-900">오류 발생</p>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">{job.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 분석 결과 */}
          {hasAnalysisResult && (
            <div className="space-y-3 min-h-0">
              {/* 2열 구조 - 요약 정보 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* 핵심 요약 */}
                {analysisResult?.summary && (
                  <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <div className="w-2 h-4 bg-blue-500 rounded-full"></div>
                      핵심 요약
                    </h3>
                    <div className="max-h-20 overflow-y-auto">
                      <p className="text-xs text-gray-700 leading-relaxed">
                        {analysisResult.summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* 인터뷰 스타일 */}
                {analysisResult?.interviewee_style && (
                  <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <div className="w-2 h-4 bg-indigo-500 rounded-full"></div>
                      인터뷰 스타일
                    </h3>
                    <div className="max-h-20 overflow-y-auto">
                      <p className="text-xs text-gray-700 leading-relaxed">
                        {analysisResult.interviewee_style}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 평가 점수 */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <div className="w-2 h-4 bg-green-500 rounded-full"></div>
                  평가 점수
                </h3>
                
                <div className="max-h-32 overflow-y-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* X축 점수 */}
                    {analysisResult?.x_axis && Array.isArray(analysisResult.x_axis) && analysisResult.x_axis.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-700 mb-2">X축 평가</div>
                        <div className="space-y-2">
                          {Object.entries(analysisResult.x_axis[0] || {}).map(([key, value]) => (
                            <div key={key}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600">{key.replace('_score', '')}</span>
                                <span className="text-xs font-bold text-blue-600">{value as number}점</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                                  style={{ width: `${value}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Y축 점수 */}
                    {analysisResult?.y_axis && Array.isArray(analysisResult.y_axis) && analysisResult.y_axis.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-700 mb-2">Y축 평가</div>
                        <div className="space-y-2">
                          {Object.entries(analysisResult.y_axis[0] || {}).map(([key, value]) => (
                            <div key={key}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600">{key.replace('_score', '')}</span>
                                <span className="text-xs font-bold text-purple-600">{value as number}점</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-500"
                                  style={{ width: `${value}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 점수 데이터가 없을 때 */}
                  {(!analysisResult?.x_axis && !analysisResult?.y_axis) && (
                    <div className="w-full bg-white rounded-lg border-2 border-dashed border-gray-300 p-4 text-center">
                      <div className="text-xs text-gray-400">평가 데이터 없음</div>
                    </div>
                  )}
                </div>
              </div>

              {/* 상세 분석 보고서 - 기존 2열 구조에 통합 */}
              {loadingDetail ? (
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-sm text-gray-600">상세 분석 데이터 로딩 중...</span>
                  </div>
                </div>
              ) : interviewDetail.length > 0 ? (
                interviewDetail.map((detail: any, index: number) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      {detail.topic_name}
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* 페인포인트 */}
                      {detail.painpoint && detail.painpoint.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                            <div className="w-2 h-4 bg-red-500 rounded-full"></div>
                            페인포인트 ({detail.painpoint.length})
                          </h4>
                          <div className="space-y-2">
                            {detail.painpoint.map((pain: string, idx: number) => (
                              <div key={idx} className="text-xs text-gray-700 bg-red-50 rounded p-3">
                                <span className="text-red-600 font-medium">{idx + 1}.</span> {pain}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 니즈 */}
                      {detail.need && detail.need.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <h4 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                            <div className="w-2 h-4 bg-blue-500 rounded-full"></div>
                            니즈 ({detail.need.length})
                          </h4>
                          <div className="space-y-2">
                            {detail.need.map((need: string, idx: number) => (
                              <div key={idx} className="text-xs text-gray-700 bg-blue-50 rounded p-3">
                                <span className="text-blue-600 font-medium">{idx + 1}.</span> {need}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 인사이트 인용구 */}
                      {detail.insight_quote && detail.insight_quote.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                            <div className="w-2 h-4 bg-green-500 rounded-full"></div>
                            인사이트 ({detail.insight_quote.length})
                          </h4>
                          <div className="space-y-2">
                            {detail.insight_quote.map((quote: string, idx: number) => (
                              <div key={idx} className="bg-green-50 rounded p-3 border-l-3 border-green-200">
                                <p className="text-xs text-gray-700 italic">"{quote}"</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 키워드 */}
                      {detail.keyword_cluster && detail.keyword_cluster.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <h4 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
                            <div className="w-2 h-4 bg-purple-500 rounded-full"></div>
                            키워드 ({detail.keyword_cluster.length})
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {detail.keyword_cluster.map((keyword: string, idx: number) => (
                              <Badge 
                                key={idx} 
                                variant="outline" 
                                className="bg-purple-50 border-purple-200 text-purple-700 text-xs px-2 py-0.5"
                              >
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 컴팩트 액션 영역 - 재시도 버튼만 남김 */}
      {(job.status === WorkflowStatus.FAILED || job.status === WorkflowStatus.PERSONA_SYNTHESIS_FAILED) && (
        <div className="p-4 border-t border-gray-100">
          <Button
            onClick={() => {
              onRetryJob(job.id);
              onClose();
            }}
            size="sm"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            다시 시도
          </Button>
        </div>
      )}
    </div>
  );
});

JobDetailPanel.displayName = 'JobDetailPanel';

export default function WorkflowProgressModal({
  open,
  onOpenChange,
  jobs,
  onRetryJob,
  onRemoveJob,
  onClearCompleted,
  onClearAll,
  onAddMore,
  onJobClick,
  onStartPersonaSynthesis
}: WorkflowProgressModalProps) {
  const [selectedTab, setSelectedTab] = useState<'all' | 'active' | 'completed' | 'failed'>('all');
  const [selectedJob, setSelectedJob] = useState<WorkflowJob | null>(null);
  
  const activeJobs = jobs.filter(job => 
    job.status === WorkflowStatus.PENDING || 
    job.status === WorkflowStatus.PROCESSING ||
    job.status === WorkflowStatus.PERSONA_SYNTHESIZING
  );
  const completedJobs = jobs.filter(job => 
    job.status === WorkflowStatus.COMPLETED ||
    job.status === WorkflowStatus.PERSONA_SYNTHESIS_COMPLETED
  );
  const failedJobs = jobs.filter(job => 
    job.status === WorkflowStatus.FAILED ||
    job.status === WorkflowStatus.PERSONA_SYNTHESIS_FAILED
  );

  // 선택된 탭에 따른 필터링
  const filteredJobs = (() => {
    switch (selectedTab) {
      case 'active': return activeJobs;
      case 'completed': return completedJobs;
      case 'failed': return failedJobs;
      default: return jobs;
    }
  })();

  // Pre-calculate pending positions
  const pendingJobPositions = new Map<string, number>();
  let currentPendingIndex = 1;
  jobs.forEach(job => {
    if (job.status === WorkflowStatus.PENDING) {
      pendingJobPositions.set(job.id, currentPendingIndex++);
    }
  });

  const handleJobClick = useCallback((job: WorkflowJob) => {
    setSelectedJob(job);
    onJobClick?.(job);
  }, [onJobClick]);

  const handleCloseDetail = useCallback(() => {
    setSelectedJob(null);
  }, []);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-5xl max-h-[85vh] p-0 flex flex-col overflow-hidden bg-white border shadow-lg rounded-xl"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>작업 진행 상황</DialogTitle>
        </VisuallyHidden>
        
        <div className="flex h-full max-h-[85vh]">
          {/* 리스트 페이지 */}
          {!selectedJob && (
            <div className="flex flex-col w-full min-w-0">
              {/* 컴팩트 헤더 */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-base font-medium text-gray-900">진행 상황</h1>
                    <p className="text-xs text-gray-600">
                      {activeJobs.length > 0 ? `${activeJobs.length}개 작업 진행중` : '모든 작업 완료됨'}
                    </p>
                  </div>
                </div>
                
                {/* 탭과 액션 버튼을 같은 행에 배치 */}
                <div className="flex items-center justify-between">
                  {/* 탭 영역 */}
                  <div className="inline-flex bg-gray-100 rounded-lg p-0.5">
                    {[
                      { key: 'all', label: '전체', count: jobs.length },
                      { key: 'active', label: '진행중', count: activeJobs.length },
                      { key: 'completed', label: '완료', count: completedJobs.length },
                      { key: 'failed', label: '실패', count: failedJobs.length }
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setSelectedTab(tab.key as any)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          selectedTab === tab.key
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {tab.label} {tab.count > 0 && (
                          <span className={`ml-1 text-xs ${
                            selectedTab === tab.key 
                              ? 'text-gray-500' 
                              : 'text-gray-400'
                          }`}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* 액션 버튼들 */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={onAddMore}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      파일 추가
                    </Button>
                    
                    {completedJobs.length > 0 && (
                      <Button
                        onClick={onClearCompleted}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                      >
                        완료된 작업 정리
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* 작업 그리드 */}
              <div className="flex-1 p-4 bg-gray-50 min-h-0">
                <ScrollArea className="h-full">
                  {filteredJobs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {filteredJobs.map((job) => (
                        <JobCard 
                          key={job.id} 
                          job={job} 
                          pendingPosition={pendingJobPositions.get(job.id)}
                          onJobClick={handleJobClick}
                          onRetryJob={onRetryJob}
                          onRemoveJob={onRemoveJob}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center mb-3 shadow-sm">
                        <FileText className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        {selectedTab === 'all' ? '작업이 없습니다' : 
                         selectedTab === 'active' ? '진행중인 작업이 없습니다' :
                         selectedTab === 'completed' ? '완료된 작업이 없습니다' :
                         '실패한 작업이 없습니다'}
                      </h3>
                      <p className="text-xs text-gray-600">새 파일을 추가해서 분석을 시작해보세요</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}

          {/* 상세 정보 페이지 */}
          {selectedJob && (
            <div className="flex flex-col h-full w-full">
              <JobDetailPanel
                job={selectedJob}
                onClose={handleCloseDetail}
                onRetryJob={onRetryJob}
                onRemoveJob={onRemoveJob}
                onStartPersonaSynthesis={onStartPersonaSynthesis}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 