import { useState, useEffect, useCallback } from 'react';

export enum WorkflowStatus {
  PENDING = 'pending',
  PROCESSING = 'processing', 
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface WorkflowJob {
  id: string;
  fileName: string;
  file: File;
  status: WorkflowStatus;
  progress: number;
  startTime?: Date;
  endTime?: Date;
  result?: any;
  error?: string;
}

interface UseWorkflowQueueReturn {
  jobs: WorkflowJob[];
  activeJobs: WorkflowJob[];
  completedJobs: WorkflowJob[];
  failedJobs: WorkflowJob[];
  isProcessing: boolean;
  addJobs: (files: File[]) => void;
  removeJob: (jobId: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  retryJob: (jobId: string) => void;
}

const MAX_CONCURRENT_JOBS = 5; // 동시 처리 가능한 최대 작업 수

export function useWorkflowQueue(): UseWorkflowQueueReturn {
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);

  // 상태별 작업 필터링
  const activeJobs = jobs.filter(job => 
    job.status === WorkflowStatus.PENDING || job.status === WorkflowStatus.PROCESSING
  );
  const completedJobs = jobs.filter(job => job.status === WorkflowStatus.COMPLETED);
  const failedJobs = jobs.filter(job => job.status === WorkflowStatus.FAILED);
  const isProcessing = activeJobs.length > 0;

  // 워크플로우 실행 함수
  const processWorkflow = useCallback(async (job: WorkflowJob) => {
    try {
      // 진행 상태로 변경
      setJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { ...j, status: WorkflowStatus.PROCESSING, startTime: new Date(), progress: 0 }
          : j
      ));

      // 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setJobs(prev => prev.map(j => 
          j.id === job.id && j.status === WorkflowStatus.PROCESSING
            ? { ...j, progress: Math.min(j.progress + Math.random() * 20, 90) }
            : j
        ));
      }, 1000);

      // 워크플로우 API 호출
      const formData = new FormData();
      formData.append('file', job.file);
      
      const response = await fetch('/api/workflow', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || '파일 처리 중 오류가 발생했습니다');
      }

      const result = await response.json();

      // 완료 상태로 변경
      setJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { 
              ...j, 
              status: WorkflowStatus.COMPLETED, 
              progress: 100, 
              endTime: new Date(),
              result 
            }
          : j
      ));

    } catch (error: any) {
      // 실패 상태로 변경
      setJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { 
              ...j, 
              status: WorkflowStatus.FAILED, 
              endTime: new Date(),
              error: error.message 
            }
          : j
      ));
    }
  }, []);

  // 큐 처리 로직
  useEffect(() => {
    const pendingJobs = jobs.filter(job => job.status === WorkflowStatus.PENDING);
    const processingJobs = jobs.filter(job => job.status === WorkflowStatus.PROCESSING);
    
    // 동시 처리 가능한 작업 수만큼 시작
    const availableSlots = MAX_CONCURRENT_JOBS - processingJobs.length;
    const jobsToStart = pendingJobs.slice(0, availableSlots);
    
    jobsToStart.forEach(job => {
      processWorkflow(job);
    });
  }, [jobs, processWorkflow]);

  // 작업 추가
  const addJobs = useCallback((files: File[]) => {
    const newJobs: WorkflowJob[] = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fileName: file.name,
      file,
      status: WorkflowStatus.PENDING,
      progress: 0
    }));

    setJobs(prev => [...prev, ...newJobs]);
  }, []);

  // 작업 제거
  const removeJob = useCallback((jobId: string) => {
    setJobs(prev => prev.filter(job => job.id !== jobId));
  }, []);

  // 완료된 작업 정리
  const clearCompleted = useCallback(() => {
    setJobs(prev => prev.filter(job => job.status !== WorkflowStatus.COMPLETED));
  }, []);

  // 모든 작업 정리
  const clearAll = useCallback(() => {
    setJobs([]);
  }, []);

  // 작업 재시도
  const retryJob = useCallback((jobId: string) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { ...job, status: WorkflowStatus.PENDING, progress: 0, error: undefined, endTime: undefined }
        : job
    ));
  }, []);

  return {
    jobs,
    activeJobs,
    completedJobs,
    failedJobs,
    isProcessing,
    addJobs,
    removeJob,
    clearCompleted,
    clearAll,
    retryJob
  };
} 