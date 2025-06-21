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

export interface ExtractionCriteria {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
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
  projectId?: string;
  extractionCriteria?: ExtractionCriteria[];
}

// 직렬화 가능한 Job 인터페이스 (localStorage용)
interface SerializableWorkflowJob {
  id: string;
  fileName: string;
  fileData?: string; // Base64 인코딩된 파일 데이터
  fileType?: string;
  status: WorkflowStatus;
  progress: number;
  startTime?: string;
  endTime?: string;
  result?: any;
  error?: string;
  personaType?: string;
  synthesisResult?: any;
  projectId?: string;
  extractionCriteria?: ExtractionCriteria[];
}

interface UseWorkflowQueueReturn {
  jobs: WorkflowJob[];
  activeJobs: WorkflowJob[];
  completedJobs: WorkflowJob[];
  failedJobs: WorkflowJob[];
  isProcessing: boolean;
  addJobs: (files: File[], projectId: string, criteria: ExtractionCriteria[]) => void;
  removeJob: (jobId: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  retryJob: (jobId: string) => void;
  startPersonaSynthesis: (jobId: string) => void;
}

const MAX_CONCURRENT_JOBS = 5; // 동시 처리 가능한 최대 작업 수
const STORAGE_KEY = 'workflow_queue_jobs';

// 성능 최적화: localStorage 제한 설정
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB 제한 (브라우저 안전 범위)
const MAX_COMPLETED_JOBS = 10; // 완료된 작업 최대 보관 수
const MAX_FILE_SIZE_FOR_STORAGE = 2 * 1024 * 1024; // 2MB 이상 파일은 localStorage 제외

// 파일을 Base64로 변환
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Base64를 파일로 변환
const base64ToFile = (base64: string, fileName: string, fileType: string): File => {
  const byteCharacters = atob(base64.split(',')[1] || '');
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new File([byteArray], fileName, { type: fileType });
};

// Job을 직렬화 가능한 형태로 변환 (성능 최적화 적용)
const serializeJob = async (job: WorkflowJob): Promise<SerializableWorkflowJob> => {
  // 대용량 파일은 localStorage에 저장하지 않음 (메모리 절약)
  let fileData: string | undefined;
  
  if (job.file.size <= MAX_FILE_SIZE_FOR_STORAGE) {
    try {
      fileData = await fileToBase64(job.file);
    } catch (error) {
      // 파일 직렬화 실패
      // 파일 데이터 없이 진행
    }
  } else {
    // 대용량 파일은 localStorage에서 제외
  }

  return {
    id: job.id,
    fileName: job.fileName,
    fileData,
    fileType: job.file.type,
    status: job.status,
    progress: job.progress,
    startTime: job.startTime?.toISOString(),
    endTime: job.endTime?.toISOString(),
    result: job.result,
    error: job.error,
    personaType: job.personaType,
    synthesisResult: job.synthesisResult,
    projectId: job.projectId,
    extractionCriteria: job.extractionCriteria
  };
};

// 직렬화된 Job을 원래 형태로 변환
const deserializeJob = (serializedJob: SerializableWorkflowJob): WorkflowJob => {
  const file = serializedJob.fileData 
    ? base64ToFile(serializedJob.fileData, serializedJob.fileName, serializedJob.fileType || 'application/octet-stream')
    : new File([], serializedJob.fileName); // 파일 데이터가 없는 경우 빈 파일 생성

  return {
    id: serializedJob.id,
    fileName: serializedJob.fileName,
    file,
    status: serializedJob.status,
    progress: serializedJob.progress,
    startTime: serializedJob.startTime ? new Date(serializedJob.startTime) : undefined,
    endTime: serializedJob.endTime ? new Date(serializedJob.endTime) : undefined,
    result: serializedJob.result,
    error: serializedJob.error,
    personaType: serializedJob.personaType,
    synthesisResult: serializedJob.synthesisResult,
    projectId: serializedJob.projectId,
    extractionCriteria: serializedJob.extractionCriteria
  };
};

// localStorage에 jobs 저장 (성능 최적화 및 용량 제한 적용)
const saveJobsToStorage = async (jobs: WorkflowJob[]) => {
  try {
    // 1. 완료된 작업 정리 (최근 MAX_COMPLETED_JOBS개만 유지)
    const activeJobs = jobs.filter(job => 
      job.status === WorkflowStatus.PENDING || 
      job.status === WorkflowStatus.PROCESSING ||
      job.status === WorkflowStatus.PERSONA_SYNTHESIZING
    );
    
    const completedJobs = jobs
      .filter(job => 
        job.status === WorkflowStatus.COMPLETED ||
        job.status === WorkflowStatus.PERSONA_SYNTHESIS_COMPLETED ||
        job.status === WorkflowStatus.FAILED ||
        job.status === WorkflowStatus.PERSONA_SYNTHESIS_FAILED
      )
      .sort((a, b) => (b.endTime?.getTime() || 0) - (a.endTime?.getTime() || 0))
      .slice(0, MAX_COMPLETED_JOBS);

    const filteredJobs = [...activeJobs, ...completedJobs];

    // 2. 직렬화 및 크기 확인
    const serializedJobs = await Promise.all(filteredJobs.map(serializeJob));
    const dataString = JSON.stringify(serializedJobs);
    const dataSize = new Blob([dataString]).size;

    // 3. 크기 제한 검사
    if (dataSize > MAX_STORAGE_SIZE) {
      // localStorage 용량 초과 - 완료된 작업 수 줄이기
      
      // 크기 초과 시 완료된 작업을 더 줄임
      const reducedCompletedJobs = completedJobs.slice(0, Math.max(1, MAX_COMPLETED_JOBS / 2));
      const reducedJobs = [...activeJobs, ...reducedCompletedJobs];
      const reducedSerialized = await Promise.all(reducedJobs.map(serializeJob));
      const reducedDataString = JSON.stringify(reducedSerialized);
      const reducedSize = new Blob([reducedDataString]).size;
      
      if (reducedSize <= MAX_STORAGE_SIZE) {
        localStorage.setItem(STORAGE_KEY, reducedDataString);
        // localStorage 저장 완료 (축소된 크기)
      } else {
        // localStorage 저장 실패: 용량 초과
        // 활성 작업만 저장 (최소한의 기능 유지)
        const activeOnlyString = JSON.stringify(await Promise.all(activeJobs.map(serializeJob)));
        if (new Blob([activeOnlyString]).size <= MAX_STORAGE_SIZE) {
          localStorage.setItem(STORAGE_KEY, activeOnlyString);
          // 활성 작업만 localStorage에 저장
        }
      }
    } else {
      localStorage.setItem(STORAGE_KEY, dataString);
      // localStorage 저장 완료
    }
    
  } catch (error) {
    // localStorage 저장 오류 발생
    
    // 복구 시도: 기본 정보만 저장
    try {
      const basicJobs = jobs
        .filter(job => job.status !== WorkflowStatus.COMPLETED)
        .map(job => ({
          id: job.id,
          fileName: job.fileName,
          status: job.status,
          progress: job.progress,
          projectId: job.projectId
        }));
      
      localStorage.setItem(STORAGE_KEY + '_backup', JSON.stringify(basicJobs));
      // 기본 정보만 백업으로 저장
    } catch (backupError) {
      // 백업 저장도 실패
    }
  }
};

// localStorage에서 jobs 로드
const loadJobsFromStorage = (): WorkflowJob[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const serializedJobs: SerializableWorkflowJob[] = JSON.parse(stored);
    return serializedJobs.map(deserializeJob);
  } catch (error) {
    return [];
  }
};

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
  const [isInitialized, setIsInitialized] = useState(false);

  // 초기화: localStorage에서 jobs 로드
  useEffect(() => {
    const savedJobs = loadJobsFromStorage();
    if (savedJobs.length > 0) {
      // 처리 중이던 작업들은 PENDING 상태로 되돌림 (재시작을 위해)
      const restoredJobs = savedJobs.map(job => 
        job.status === WorkflowStatus.PROCESSING || job.status === WorkflowStatus.PERSONA_SYNTHESIZING
          ? { ...job, status: WorkflowStatus.PENDING, progress: 0, startTime: undefined }
          : job
      );
      setJobs(restoredJobs);
    }
    setIsInitialized(true);
  }, []);

  // jobs가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (isInitialized) {
      saveJobsToStorage(jobs);
    }
  }, [jobs, isInitialized]);

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
      
      const selectedInterviewee = typeof job.result === 'string' 
        ? job.result 
        : JSON.stringify(job.result);
      

      // 페르소나 합성 API 호출
      const response = await fetch('/api/personas/synthesis', {
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
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const synthesisResult = result.data;

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
      
      // 프로젝트 ID가 있으면 추가
      if (job.projectId) {
        formData.append('projectId', job.projectId);
      }

      if (job.extractionCriteria) {
        formData.append('extractionCriteria', JSON.stringify(job.extractionCriteria));
      }
      
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
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // 워크플로우 결과에서 user_type을 추출하여 personaType에 저장 (자동 합성은 하지 않음)
      const userType = result?.type || result?.user_type;
      
      // 완료 상태로 변경 (자동 페르소나 합성 제거)
      setJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { 
              ...j, 
              status: WorkflowStatus.COMPLETED, 
              progress: 100, 
              endTime: new Date(),
              result,
              personaType: userType // 결과에서 추출한 user_type을 personaType으로 설정
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
    if (!isInitialized) return;
    
    const pendingJobs = jobs.filter(job => job.status === WorkflowStatus.PENDING);
    const processingJobs = jobs.filter(job => job.status === WorkflowStatus.PROCESSING);
    
    // 동시 처리 가능한 작업 수만큼 시작
    const availableSlots = MAX_CONCURRENT_JOBS - processingJobs.length;
    const jobsToStart = pendingJobs.slice(0, availableSlots);
    
    jobsToStart.forEach(job => {
      processWorkflow(job);
    });
  }, [jobs, processWorkflow, isInitialized]);

  // 수동 페르소나 합성 시작
  const startPersonaSynthesis = useCallback((jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job && job.status === WorkflowStatus.COMPLETED && job.personaType) {
      processPersonaSynthesis(job);
    }
  }, [jobs, processPersonaSynthesis]);

  // 작업 추가
  const addJobs = useCallback(async (files: File[], projectId: string, criteria: ExtractionCriteria[]) => {
    const newJobs: WorkflowJob[] = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fileName: file.name,
      file,
      status: WorkflowStatus.PENDING,
      progress: 0,
      projectId,
      extractionCriteria: criteria
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
    retryJob,
    startPersonaSynthesis
  };
} 