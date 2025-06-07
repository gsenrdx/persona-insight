"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Trash2,
  User,
  Loader2,
  File,
  Calendar
} from "lucide-react";
import { WorkflowJob, WorkflowStatus } from "@/hooks/use-workflow-queue";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface JobDetailModalProps {
  job: WorkflowJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetryJob: (jobId: string) => void;
  onRemoveJob: (jobId: string) => void;
}

const statusConfig = {
  [WorkflowStatus.PENDING]: {
    icon: Clock,
    label: "대기중",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200"
  },
  [WorkflowStatus.PROCESSING]: {
    icon: Loader2,
    label: "처리중",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  [WorkflowStatus.COMPLETED]: {
    icon: CheckCircle2,
    label: "완료",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  },
  [WorkflowStatus.FAILED]: {
    icon: XCircle,
    label: "실패",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200"
  }
};

export default function JobDetailModal({
  job,
  open,
  onOpenChange,
  onRetryJob,
  onRemoveJob
}: JobDetailModalProps) {
  if (!job) return null;

  const config = statusConfig[job.status];
  const StatusIcon = config.icon;

  const formatDuration = (startTime?: Date, endTime?: Date) => {
    if (!startTime) return null;
    const end = endTime || new Date();
    const diff = Math.floor((end.getTime() - startTime.getTime()) / 1000);
    return diff < 60 ? `${diff}초` : `${Math.floor(diff / 60)}분 ${diff % 60}초`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <File className="h-5 w-5 text-gray-600" />
            <span className="truncate">{job.fileName}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 상태 정보 */}
          <div className={`rounded-lg p-4 border ${config.bgColor} ${config.borderColor}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusIcon className={`h-5 w-5 ${config.color} ${job.status === WorkflowStatus.PROCESSING ? 'animate-spin' : ''}`} />
                <div>
                  <h3 className={`font-medium ${config.color}`}>{config.label}</h3>
                  <p className="text-sm text-gray-600">
                    {job.status === WorkflowStatus.PENDING && "처리 대기 중입니다"}
                    {job.status === WorkflowStatus.PROCESSING && "현재 분석을 진행하고 있습니다"}
                    {job.status === WorkflowStatus.COMPLETED && "분석이 완료되었습니다"}
                    {job.status === WorkflowStatus.FAILED && "분석 중 오류가 발생했습니다"}
                  </p>
                </div>
              </div>
              
              <Badge variant="outline" className={`${config.color} border-current`}>
                {config.label}
              </Badge>
            </div>
          </div>

          {/* 시간 정보 */}
          {(job.startTime || job.endTime) && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">시간 정보</h4>
              <div className="grid grid-cols-1 gap-3 text-sm">
                {job.startTime && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">시작 시간:</span>
                    <span className="font-medium">
                      {format(job.startTime, "yyyy년 MM월 dd일 HH:mm:ss", { locale: ko })}
                    </span>
                  </div>
                )}
                
                {job.endTime && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">완료 시간:</span>
                    <span className="font-medium">
                      {format(job.endTime, "yyyy년 MM월 dd일 HH:mm:ss", { locale: ko })}
                    </span>
                  </div>
                )}
                
                {job.startTime && job.endTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">소요 시간:</span>
                    <span className="font-medium">
                      {formatDuration(job.startTime, job.endTime)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 오류 정보 */}
          {job.error && (
            <div className="space-y-3">
              <h4 className="font-medium text-red-900">오류 내용</h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{job.error}</p>
              </div>
            </div>
          )}

          {/* 결과 정보 */}
          {job.result && job.status === WorkflowStatus.COMPLETED && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">분석 결과</h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                {job.result.type && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">페르소나 타입:</span>
                    <Badge variant="secondary">{job.result.type}</Badge>
                  </div>
                )}
                
                {job.result.summary && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">요약:</p>
                    <p className="text-sm text-gray-800 leading-relaxed">
                      {job.result.summary}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex justify-between pt-4 border-t">
            <div className="flex gap-2">
              {job.status === WorkflowStatus.FAILED && (
                <Button
                  onClick={() => {
                    onRetryJob(job.id);
                    onOpenChange(false);
                  }}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  다시 시도
                </Button>
              )}
              
              {(job.status === WorkflowStatus.COMPLETED || job.status === WorkflowStatus.FAILED) && (
                <Button
                  onClick={() => {
                    onRemoveJob(job.id);
                    onOpenChange(false);
                  }}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  제거
                </Button>
              )}
            </div>
            
            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              size="sm"
            >
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 