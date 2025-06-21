import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  useInfiniteQuery,
  UseQueryOptions, 
  UseMutationOptions,
  UseInfiniteQueryOptions,
  QueryKey
} from '@tanstack/react-query'
import { useEffect } from 'react'
import { ErrorUtils } from '@/lib/errors'
import { toast } from '@/hooks/use-toast'

/**
 * 표준화된 React Query 옵션 인터페이스
 */
interface StandardQueryOptions<TData, TError = Error> extends UseQueryOptions<TData, TError> {
  /**
   * 에러 발생 시 토스트 메시지 표시 여부
   */
  showErrorToast?: boolean
  /**
   * 커스텀 에러 메시지
   */
  errorMessage?: string
  /**
   * 에러 로깅 활성화 여부
   */
  enableErrorLogging?: boolean
  /**
   * 추가 에러 핸들러
   */
  onErrorCallback?: (error: TError) => void
}

interface StandardMutationOptions<TData, TError = Error, TVariables = void, TContext = unknown> 
  extends UseMutationOptions<TData, TError, TVariables, TContext> {
  /**
   * 성공 시 토스트 메시지
   */
  successMessage?: string
  /**
   * 에러 발생 시 토스트 메시지 표시 여부
   */
  showErrorToast?: boolean
  /**
   * 커스텀 에러 메시지
   */
  errorMessage?: string
  /**
   * 에러 로깅 활성화 여부
   */
  enableErrorLogging?: boolean
  /**
   * 추가 에러 핸들러
   */
  onErrorCallback?: (error: TError, variables: TVariables, context: TContext | undefined) => void
}

/**
 * 표준화된 Query 훅
 * 일관된 에러 처리, 로깅, 사용자 피드백 제공
 */
export function useStandardQuery<TData, TError = Error>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options: Omit<StandardQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> = {}
) {
  const {
    showErrorToast = true,
    errorMessage,
    enableErrorLogging = true,
    onErrorCallback,
    ...queryOptions
  } = options

  const result = useQuery({
    queryKey,
    queryFn,
    ...queryOptions,
  })

  // React Query v5에서 onError가 제거되었으므로 useEffect로 에러 처리
  useEffect(() => {
    if (result.error) {
      // 표준 에러 로깅
      if (enableErrorLogging) {
        // Query 에러 로깅
      }

      // 사용자 친화적 에러 메시지 표시
      if (showErrorToast) {
        const userMessage = errorMessage || ErrorUtils.getUserMessage(result.error)
        toast({
          variant: "destructive",
          title: "오류가 발생했습니다",
          description: userMessage,
        })
      }

      // 커스텀 에러 핸들러 실행
      if (onErrorCallback) {
        onErrorCallback(result.error as TError)
      }
    }
  }, [result.error, enableErrorLogging, queryKey, showErrorToast, errorMessage, onErrorCallback])

  return result
}

/**
 * 표준화된 Mutation 훅
 * 일관된 성공/에러 처리, 로깅, 사용자 피드백 제공
 */
export function useStandardMutation<TData, TError = Error, TVariables = void, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: Omit<StandardMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> = {}
) {
  const {
    successMessage,
    showErrorToast = true,
    errorMessage,
    enableErrorLogging = true,
    onErrorCallback,
    onSuccess,
    ...mutationOptions
  } = options

  return useMutation({
    mutationFn,
    ...mutationOptions,
    onSuccess: (data, variables, context) => {
      // 성공 메시지 표시
      if (successMessage) {
        toast({
          title: "성공",
          description: successMessage,
        })
      }

      // 커스텀 성공 핸들러 실행
      if (onSuccess) {
        onSuccess(data, variables, context)
      }
    },
    onError: (error: TError, variables: TVariables, context: TContext | undefined) => {
      // 표준 에러 로깅
      if (enableErrorLogging) {
        // Mutation 에러 로깅
      }

      // 사용자 친화적 에러 메시지 표시
      if (showErrorToast) {
        const userMessage = errorMessage || ErrorUtils.getUserMessage(error)
        toast({
          variant: "destructive",
          title: "작업 실패",
          description: userMessage,
        })
      }

      // 커스텀 에러 핸들러 실행
      if (onErrorCallback) {
        onErrorCallback(error, variables, context)
      }
    }
  })
}

/**
 * 네트워크 복원력을 갖춘 Query 훅
 * 자동 재시도, 백오프 알고리즘 적용
 */
export function useResilientQuery<TData, TError = Error>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options: Omit<StandardQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> = {}
) {
  return useStandardQuery(queryKey, queryFn, {
    retry: (failureCount, error) => {
      // 네트워크 에러는 최대 3번 재시도
      if (ErrorUtils.isNetworkError(error) && failureCount < 3) {
        return true
      }
      // 서버 에러는 최대 2번 재시도
      if (ErrorUtils.isServerError(error) && failureCount < 2) {
        return true
      }
      // 인증 에러나 클라이언트 에러는 재시도하지 않음
      return false
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 지수 백오프
    staleTime: 5 * 60 * 1000, // 5분간 데이터를 fresh로 취급
    ...options,
  })
}

/**
 * 무한 스크롤을 위한 표준 Infinite Query 훅
 */

interface StandardInfiniteQueryOptions<TData, TError = Error> 
  extends UseInfiniteQueryOptions<TData, TError> {
  showErrorToast?: boolean
  errorMessage?: string
  enableErrorLogging?: boolean
  onErrorCallback?: (error: TError) => void
}

export function useStandardInfiniteQuery<TData, TError = Error>(
  queryKey: QueryKey,
  queryFn: ({ pageParam }: { pageParam: unknown }) => Promise<TData>,
  options: Omit<StandardInfiniteQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) {
  const {
    showErrorToast = true,
    errorMessage,
    enableErrorLogging = true,
    onErrorCallback,
    ...queryOptions
  } = options

  const result = useInfiniteQuery({
    queryKey,
    queryFn,
    ...queryOptions,
  })

  // React Query v5에서 onError가 제거되었으므로 useEffect로 에러 처리
  useEffect(() => {
    if (result.error) {
      // 표준 에러 로깅
      if (enableErrorLogging) {
        // Infinite Query 에러 로깅
      }

      // 사용자 친화적 에러 메시지 표시
      if (showErrorToast) {
        const userMessage = errorMessage || ErrorUtils.getUserMessage(result.error)
        toast({
          variant: "destructive",
          title: "데이터 로드 실패",
          description: userMessage,
        })
      }

      // 커스텀 에러 핸들러 실행
      if (onErrorCallback) {
        onErrorCallback(result.error as TError)
      }
    }
  }, [result.error, enableErrorLogging, queryKey, showErrorToast, errorMessage, onErrorCallback])

  return result
}

/**
 * 캐시 무효화를 위한 유틸리티 훅
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient()

  return {
    /**
     * 특정 쿼리 키 무효화
     */
    invalidate: (queryKey: QueryKey) => {
      queryClient.invalidateQueries({ queryKey })
    },
    
    /**
     * 패턴에 맞는 모든 쿼리 무효화
     */
    invalidateByPattern: (pattern: string) => {
      queryClient.invalidateQueries({
        predicate: (query) => String(query.queryKey).includes(pattern)
      })
    },
    
    /**
     * 모든 쿼리 무효화 (주의해서 사용)
     */
    invalidateAll: () => {
      queryClient.invalidateQueries()
    }
  }
}

/**
 * 에러 상태를 처리하는 유틸리티 훅
 */
export function useErrorHandler() {
  return {
    /**
     * React Query 에러를 표준 형식으로 처리
     */
    handleQueryError: (error: unknown, context?: string) => {
      // Query 에러 처리
      
      const userMessage = ErrorUtils.getUserMessage(error)
      toast({
        variant: "destructive",
        title: "오류가 발생했습니다",
        description: userMessage,
      })
    },
    
    /**
     * 일반 에러를 사용자 친화적으로 처리
     */
    handleError: (error: unknown, customMessage?: string) => {
      // 일반 에러 처리
      
      const userMessage = customMessage || ErrorUtils.getUserMessage(error)
      toast({
        variant: "destructive",
        title: "오류",
        description: userMessage,
      })
    }
  }
}