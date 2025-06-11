"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
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
import React, { useState, useCallback } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
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
  const config = statusConfig[job.status];
  const StatusIcon = config.icon;

  // 페르소나 합성 완료 여부 체크
  const isPersonaSynthesized = job.status === WorkflowStatus.PERSONA_SYNTHESIS_COMPLETED;
  const hasAnalysisResult = job.result && (job.status === WorkflowStatus.COMPLETED || isPersonaSynthesized);

  // 실제 반환된 데이터 구조에 맞게 추출
  // job.result는 { type, description, summary, date, interviewee_style, charging_pattern_scores, value_orientation_scores } 형태
  const analysisResult = job.result;
  
  // 충전 패턴과 가치 지향성 점수
  const chargingPatternScore = analysisResult?.charging_pattern_scores?.[0];
  const valueOrientationScore = analysisResult?.value_orientation_scores?.[0];

  return (
    <div className="flex flex-col h-full border-l bg-white">
      {/* 컴팩트 헤더 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <h2 className="text-base font-medium text-gray-900">분석 결과</h2>
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
      <ScrollArea className="flex-1">
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
                 <div className="space-y-3">
                   {/* 분석 개요 */}
                   <div className="bg-gray-50 rounded-lg p-3">
                     <div className="flex items-center justify-between mb-2">
                       <h4 className="text-sm font-medium text-gray-900">분석 개요</h4>
                       {analysisResult?.type && (
                         <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                           Type {analysisResult.type}
                         </Badge>
                       )}
                     </div>
                     
                     {/* 페르소나 설명 */}
                     {analysisResult?.description && (
                       <p className="text-xs text-gray-600 mb-2">
                         {analysisResult.description}
                       </p>
                     )}
                     
                     {/* 분석 날짜 */}
                     {analysisResult?.date && (
                       <div className="flex items-center gap-1 text-xs text-gray-500">
                         <Calendar className="h-3 w-3" />
                         {analysisResult.date}
                       </div>
                     )}
                   </div>

                   {/* 주요 인사이트 */}
                   {analysisResult?.summary && (
                     <div className="bg-white border border-gray-200 rounded-lg p-3">
                       <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                         <Target className="h-4 w-4 text-blue-600" />
                         핵심 인사이트
                       </h5>
                       <p className="text-xs text-gray-700 leading-relaxed">
                         {analysisResult.summary}
                       </p>
                     </div>
                   )}

                   {/* 인터뷰 스타일 */}
                   {analysisResult?.interviewee_style && (
                     <div className="bg-white border border-gray-200 rounded-lg p-3">
                       <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                         <MessageSquare className="h-4 w-4 text-purple-600" />
                         인터뷰 스타일
                       </h5>
                       <p className="text-xs text-gray-700 leading-relaxed">
                         {analysisResult.interviewee_style}
                       </p>
                     </div>
                   )}

                   {/* 인터뷰 대상자 가짜 이름 */}
                   {analysisResult?.interviewee_fake_name && (
                     <div className="bg-white border border-gray-200 rounded-lg p-3">
                       <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                         <User className="h-4 w-4 text-blue-600" />
                         인터뷰 대상자
                       </h5>
                       <p className="text-xs text-gray-700 leading-relaxed">
                         {analysisResult.interviewee_fake_name}
                       </p>
                     </div>
                   )}

                   {/* 충전 패턴 점수 */}
                   {chargingPatternScore && (
                     <div className="bg-white border border-gray-200 rounded-lg p-3">
                       <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                         <Battery className="h-4 w-4 text-green-600" />
                         충전 패턴 분석
                       </h5>
                       <div className="space-y-2">
                         <div>
                           <div className="flex justify-between items-center mb-1">
                             <span className="text-xs text-gray-600">완속(Home) 중심</span>
                             <span className="text-xs font-medium">{chargingPatternScore.home_centric_score}%</span>
                           </div>
                           <div className="w-full h-1 bg-gray-200 rounded-full">
                             <div 
                               className="h-1 bg-green-500 rounded-full transition-all duration-500" 
                               style={{ width: `${chargingPatternScore.home_centric_score}%` }} 
                             />
                           </div>
                         </div>
                         <div>
                           <div className="flex justify-between items-center mb-1">
                             <span className="text-xs text-gray-600">급속(Road) 중심</span>
                             <span className="text-xs font-medium">{chargingPatternScore.road_centric_score}%</span>
                           </div>
                           <div className="w-full h-1 bg-gray-200 rounded-full">
                             <div 
                               className="h-1 bg-blue-500 rounded-full transition-all duration-500" 
                               style={{ width: `${chargingPatternScore.road_centric_score}%` }} 
                             />
                           </div>
                         </div>
                       </div>
                     </div>
                   )}

                   {/* 가치 지향성 점수 */}
                   {valueOrientationScore && (
                     <div className="bg-white border border-gray-200 rounded-lg p-3">
                       <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                         <TrendingUp className="h-4 w-4 text-orange-600" />
                         가치 지향성 분석
                       </h5>
                       <div className="space-y-2">
                         <div>
                           <div className="flex justify-between items-center mb-1">
                             <span className="text-xs text-gray-600">기술/브랜드 중심</span>
                             <span className="text-xs font-medium">{valueOrientationScore.tech_brand_driven_score}%</span>
                           </div>
                           <div className="w-full h-1 bg-gray-200 rounded-full">
                             <div 
                               className="h-1 bg-purple-500 rounded-full transition-all duration-500" 
                               style={{ width: `${valueOrientationScore.tech_brand_driven_score}%` }} 
                             />
                           </div>
                         </div>
                         <div>
                           <div className="flex justify-between items-center mb-1">
                             <span className="text-xs text-gray-600">비용 중심</span>
                             <span className="text-xs font-medium">{valueOrientationScore.cost_driven_score}%</span>
                           </div>
                           <div className="w-full h-1 bg-gray-200 rounded-full">
                             <div 
                               className="h-1 bg-orange-500 rounded-full transition-all duration-500" 
                               style={{ width: `${valueOrientationScore.cost_driven_score}%` }} 
                             />
                           </div>
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
               )}
        </div>
      </ScrollArea>

      {/* 컴팩트 액션 영역 */}
      {(job.status === WorkflowStatus.FAILED || 
        job.status === WorkflowStatus.PERSONA_SYNTHESIS_FAILED || 
        job.status === WorkflowStatus.COMPLETED ||
        job.status === WorkflowStatus.PERSONA_SYNTHESIS_COMPLETED) && (
        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-2">
            {/* 페르소나 합성 버튼 - 인터뷰 분석 완료 시에만 표시 */}
            {job.status === WorkflowStatus.COMPLETED && job.personaType && onStartPersonaSynthesis && (
              <Button
                onClick={() => {
                  onStartPersonaSynthesis(job.id);
                }}
                size="sm"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                페르소나 반영
              </Button>
            )}
            
            {(job.status === WorkflowStatus.FAILED || job.status === WorkflowStatus.PERSONA_SYNTHESIS_FAILED) && (
              <Button
                onClick={() => {
                  onRetryJob(job.id);
                  onClose();
                }}
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                              >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  다시 시도
              </Button>
            )}
            
            <Button
              onClick={() => {
                onRemoveJob(job.id);
                onClose();
              }}
              variant="outline"
              size="sm"
              className="h-8 text-xs px-3"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              제거
            </Button>
          </div>
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
        
        <div className="flex h-full min-h-[700px]">
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
                    
                    {(completedJobs.length > 0 || failedJobs.length > 0) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          {completedJobs.length > 0 && (
                            <DropdownMenuItem onClick={onClearCompleted} className="text-xs">
                              완료된 작업 정리
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={onClearAll} className="text-red-600 text-xs">
                            모든 작업 정리
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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