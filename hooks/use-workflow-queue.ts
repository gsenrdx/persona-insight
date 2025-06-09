import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export enum WorkflowStatus {
  PENDING = 'pending',
  PROCESSING = 'processing', 
  COMPLETED = 'completed',
  FAILED = 'failed',
  PERSONA_SYNTHESIZING = 'persona_synthesizing',
  PERSONA_SYNTHESIS_COMPLETED = 'persona_synthesis_completed',
  PERSONA_SYNTHESIS_FAILED = 'persona_synthesis_failed'
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
  personaType?: string;
  synthesisResult?: any;
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

// 상태별 메시지 반환 함수
export function getWorkflowStatusMessage(status: WorkflowStatus): string {
  switch (status) {
    case WorkflowStatus.PENDING:
      return '대기 중...';
    case WorkflowStatus.PROCESSING:
      return '분석 중...';
    case WorkflowStatus.COMPLETED:
      return '분석 완료';
    case WorkflowStatus.FAILED:
      return '분석 실패';
    case WorkflowStatus.PERSONA_SYNTHESIZING:
      return '페르소나를 합성중입니다...';
    case WorkflowStatus.PERSONA_SYNTHESIS_COMPLETED:
      return '페르소나 합성 완료';
    case WorkflowStatus.PERSONA_SYNTHESIS_FAILED:
      return '페르소나 합성 실패';
    default:
      return '알 수 없는 상태';
  }
}

export function useWorkflowQueue(): UseWorkflowQueueReturn {
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);

  // 상태별 작업 필터링
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
  const isProcessing = activeJobs.length > 0;

  // 페르소나 합성 함수
  const processPersonaSynthesis = useCallback(async (job: WorkflowJob) => {
    try {
      // 페르소나 합성 상태로 변경
      setJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { ...j, status: WorkflowStatus.PERSONA_SYNTHESIZING, progress: 0 }
          : j
      ));

      // 사용자 세션에서 액세스 토큰 가져오기
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('인증 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
      }



      // 워크플로우 결과에서 selected_interviewee 데이터 추출
      console.log('[페르소나 합성] job.result:', job.result);
      console.log('[페르소나 합성] job.result 타입:', typeof job.result);
      
      const selectedInterviewee = typeof job.result === 'string' 
        ? job.result 
        : JSON.stringify(job.result);
      
      console.log('[페르소나 합성] selectedInterviewee:', selectedInterviewee);
      console.log('[페르소나 합성] personaType:', job.personaType);

      // 페르소나 합성 API 호출
      const response = await fetch('/api/persona-synthesis', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selectedInterviewee,
          personaType: job.personaType
        })
      });

      if (!response.ok) {
        let errorMessage = '페르소나 합성 중 오류가 발생했습니다';
        try {
          const errorData = await response.json();
          console.error('[페르소나 합성] API 오류 응답:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          const errorText = await response.text();
          console.error('[페르소나 합성] API 오류 응답:', errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const synthesisResult = result.data;
      console.log('[페르소나 합성] 성공:', synthesisResult);

      // 페르소나 합성 완료 상태로 변경
      setJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { 
              ...j, 
              status: WorkflowStatus.PERSONA_SYNTHESIS_COMPLETED, 
              progress: 100, 
              endTime: new Date(),
              synthesisResult 
            }
          : j
      ));

    } catch (error: any) {
      console.error('[페르소나 합성] 오류:', error);
      // 페르소나 합성 실패 상태로 변경
      setJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { 
              ...j, 
              status: WorkflowStatus.PERSONA_SYNTHESIS_FAILED, 
              endTime: new Date(),
              error: error.message 
            }
          : j
      ));
    }
  }, []);

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

      // 사용자 세션에서 액세스 토큰 가져오기
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('인증 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
      }

      // 워크플로우 API 호출
      const formData = new FormData();
      formData.append('file', job.file);
      
      const response = await fetch('/api/workflow', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        let errorMessage = '파일 처리 중 오류가 발생했습니다';
        let errorDetails = null;
        
        try {
          const errorData = await response.json();
          console.error('[워크플로우] API 오류 응답:', errorData);
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details;
        } catch (parseError) {
          const errorText = await response.text();
          console.error('[워크플로우] API 응답 상태:', response.status, response.statusText);
          console.error('[워크플로우] API 오류 응답:', errorText);
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
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

      // 워크플로우 결과에서 user_type을 추출하여 페르소나 합성 시작
      const userType = result?.type || result?.user_type;
      if (userType) {
        console.log('[워크플로우] 페르소나 합성을 시작합니다 - user_type:', userType);
        
        // 잠시 후 페르소나 합성 시작 (UI 업데이트를 위한 지연)
        setTimeout(() => {
          const updatedJob = { 
            ...job, 
            result, 
            status: WorkflowStatus.COMPLETED,
            personaType: userType // 결과에서 추출한 user_type을 personaType으로 설정
          };
          processPersonaSynthesis(updatedJob);
        }, 1000);
      } else {
        console.log('[워크플로우] user_type을 찾을 수 없어 페르소나 합성을 건너뜁니다.');
        console.log('[워크플로우] 결과 데이터:', result);
      }

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
  }, [processPersonaSynthesis]);

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
    setJobs(prev => prev.filter(job => 
      job.status !== WorkflowStatus.COMPLETED && 
      job.status !== WorkflowStatus.PERSONA_SYNTHESIS_COMPLETED
    ));
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