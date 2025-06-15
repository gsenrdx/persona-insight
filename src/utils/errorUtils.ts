import { ApiError } from '../services/messageService'; // ApiError 경로가 실제 프로젝트 구조와 맞는지 확인

// ChatState의 ChatError와 동일한 구조를 사용하거나, 여기서 별도 정의 가능
export interface NormalizedError {
  message: string;
  status?: number;
  details?: any;
}

export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof ApiError) {
    return { message: error.message, status: error.status, details: error.details };
  } else if (error instanceof Error) {
    return { message: error.message };
  } else if (typeof error === 'string') {
    return { message: error };
  } else {
    return { message: 'An unknown error occurred. Input was not an error object.' };
  }
}
