"use client";

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
  Plus,
  MoreHorizontal
} from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { WorkflowJob, WorkflowStatus } from "@/hooks/use-workflow-queue";
import React, { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface WorkflowProgressSpeedDialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: WorkflowJob[];
  onRetryJob: (jobId: string) => void;
  onRemoveJob: (jobId: string) => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
  onAddMore: () => void;
  onJobClick?: (job: WorkflowJob) => void;
}

const statusConfig = {
  [WorkflowStatus.PENDING]: {
    icon: Clock,
    label: "대기중",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    dotColor: "bg-orange-400",
    buttonColor: "bg-orange-50/80 hover:bg-orange-100/80 text-orange-700 border border-orange-200/50 backdrop-blur-sm"
  },
  [WorkflowStatus.PROCESSING]: {
    icon: Loader2,
    label: "처리중",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    dotColor: "bg-blue-400",
    buttonColor: "bg-blue-50/80 hover:bg-blue-100/80 text-blue-700 border border-blue-200/50 backdrop-blur-sm"
  },
  [WorkflowStatus.COMPLETED]: {
    icon: CheckCircle2,
    label: "완료",
    color: "text-green-700",
    bgColor: "bg-green-50",
    dotColor: "bg-green-400",
    buttonColor: "bg-green-50/80 hover:bg-green-100/80 text-green-700 border border-green-200/50 backdrop-blur-sm"
  },
  [WorkflowStatus.FAILED]: {
    icon: XCircle,
    label: "실패",
    color: "text-red-700",
    bgColor: "bg-red-50",
    dotColor: "bg-red-400",
    buttonColor: "bg-red-50/80 hover:bg-red-100/80 text-red-700 border border-red-200/50 backdrop-blur-sm"
  }
};

export default function WorkflowProgressSpeedDial({
  open,
  onOpenChange,
  jobs,
  onRetryJob,
  onRemoveJob,
  onClearCompleted,
  onClearAll,
  onAddMore,
  onJobClick
}: WorkflowProgressSpeedDialProps) {
  const [dismissingJobs, setDismissingJobs] = useState<Set<string>>(new Set());
  
  const activeJobs = jobs.filter(job => 
    job.status === WorkflowStatus.PENDING || job.status === WorkflowStatus.PROCESSING
  );
  const completedJobs = jobs.filter(job => job.status === WorkflowStatus.COMPLETED);
  const failedJobs = jobs.filter(job => job.status === WorkflowStatus.FAILED);

  // 최대 4개까지만 표시 (공간 제약)
  const displayJobs = jobs.slice(0, 4);

  // Pre-calculate pending positions
  const pendingJobPositions = new Map<string, number>();
  let currentPendingIndex = 1;
  jobs.forEach(job => {
    if (job.status === WorkflowStatus.PENDING) {
      pendingJobPositions.set(job.id, currentPendingIndex++);
    }
  });

  // Handle click outside to close speed dial
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element;
      
      // Check if click is outside speed dial area
      if (open && !target.closest('.speed-dial-container')) {
        onOpenChange(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onOpenChange]);

  // Handle swipe to dismiss for completed jobs
  const handleDragEnd = (jobId: string, job: WorkflowJob) => (
    event: MouseEvent | TouchEvent | PointerEvent, 
    info: PanInfo
  ) => {
    const threshold = 120; // 드래그 임계값
    
    if (info.offset.x > threshold && job.status === WorkflowStatus.COMPLETED) {
      // 스와이프 삭제 애니메이션
      setDismissingJobs(prev => new Set(prev).add(jobId));
      setTimeout(() => {
        onRemoveJob(jobId);
        setDismissingJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
      }, 200);
    }
  };

  if (!open || jobs.length === 0) return null;

  // 간격 조정: 메인 버튼 높이(48px) + 여유 공간(32px)
  const baseOffset = 80;
                      
                      return (
    <div className="speed-dial-container fixed right-8 z-[60] flex flex-col items-end space-y-4" 
         style={{ bottom: `${baseOffset}px` }}>
      <AnimatePresence>
        {open && (
          <>
            {/* 추가 버튼 (가장 위) */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <Button 
                onClick={onAddMore}
                className="rounded-full shadow-lg px-5 py-2.5 h-[48px] bg-white/90 hover:bg-gray-50/90 text-gray-700 border border-gray-200/50 min-w-[140px] max-w-[220px] backdrop-blur-sm"
              >
                <div className="flex items-center gap-2.5 w-full">
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">추가</span>
                </div>
              </Button>
            </motion.div>

            {/* 더 보기 버튼 (jobs가 4개 초과일 때) */}
            {jobs.length > 4 && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ duration: 0.2, delay: 0.15 }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="rounded-full shadow-lg px-5 py-2.5 h-[48px] bg-gray-50/90 hover:bg-gray-100/90 text-gray-700 border border-gray-200/50 min-w-[140px] max-w-[220px] backdrop-blur-sm">
                      <div className="flex items-center gap-2.5 w-full">
                        <MoreHorizontal className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">+{jobs.length - 4}개 더</span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white/95 backdrop-blur-sm border-gray-200/50">
                    {completedJobs.length > 0 && (
                      <DropdownMenuItem onClick={onClearCompleted} className="text-sm">
                        완료된 작업 정리
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={onClearAll} className="text-sm text-red-600">
                      전체 정리
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            )}

            {/* 개별 작업 버튼들 */}
            {displayJobs.map((job, index) => {
              const config = statusConfig[job.status];
              const StatusIcon = config.icon;
              const pendingPosition = pendingJobPositions.get(job.id);
              const isDismissing = dismissingJobs.has(job.id);
              const isCompleted = job.status === WorkflowStatus.COMPLETED;
              
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ 
                    opacity: isDismissing ? 0 : 1, 
                    y: 0, 
                    scale: isDismissing ? 0.8 : 1,
                    x: isDismissing ? 300 : 0
                  }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{ 
                    duration: isDismissing ? 0.2 : 0.2, 
                    delay: isDismissing ? 0 : 0.2 + (index * 0.06)
                  }}
                  drag={isCompleted ? "x" : false}
                  dragConstraints={{ left: 0, right: 300 }}
                  dragElastic={{ left: 0, right: 0.2 }}
                  onDragEnd={handleDragEnd(job.id, job)}
                  whileDrag={isCompleted ? { scale: 1.05, rotate: 2 } : {}}
                  style={{ position: 'relative' }}
                >
                  <div className="relative group">
                    {/* 스와이프 힌트 배경 (완료된 작업만) */}
                    {isCompleted && (
                      <motion.div 
                        className="absolute inset-0 bg-red-100/80 rounded-full flex items-center justify-end pr-4 opacity-0"
                        style={{ zIndex: -1 }}
                        animate={{ opacity: 0 }}
                        whileHover={{ opacity: 0.3 }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </motion.div>
                    )}
                    
                    <Button
                      onClick={() => onJobClick?.(job)}
                      className={`rounded-full shadow-lg px-5 py-2.5 h-[48px] min-w-[140px] max-w-[220px] ${config.buttonColor} ${isCompleted ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 w-full">
                        <div className="flex-shrink-0">
                          {job.status === WorkflowStatus.PROCESSING ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ 
                                duration: 1.5, 
                                repeat: Infinity, 
                                ease: "linear"
                              }}
                              className={`w-4 h-4 border-2 border-current/30 border-t-current rounded-full ${config.color}`}
                            />
                          ) : (
                            <StatusIcon className={`h-4 w-4 ${config.color}`} />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">
                            {job.fileName}
                          </span>
                          
                          {job.status === WorkflowStatus.PENDING && pendingPosition && (
                            <Badge variant="secondary" className="bg-current/10 text-current border-0 px-2 py-0.5 text-xs">
                              {pendingPosition}
                            </Badge>
                          )}
                        </div>
                        
                        {/* 완료된 작업에 스와이프 힌트 */}
                        {isCompleted && (
                          <motion.div 
                            className="text-xs text-current/60 hidden group-hover:block"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            →
                          </motion.div>
                        )}
                      </div>
                    </Button>

                    {/* 액션 버튼 (호버시 표시) - 완료된 작업은 스와이프로 대체 */}
                    {job.status === WorkflowStatus.FAILED && (
                      <div className="absolute -left-16 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRetryJob(job.id);
                            }}
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 rounded-full bg-white/95 shadow-md border-gray-200/50 backdrop-blur-sm hover:bg-gray-50"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveJob(job.id);
                            }}
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 rounded-full bg-white/95 shadow-md border-gray-200/50 backdrop-blur-sm text-red-600 hover:text-red-700 hover:border-red-300/50 hover:bg-red-50/50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
      </AnimatePresence>
        </div>
  );
} 