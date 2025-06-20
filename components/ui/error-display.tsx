"use client"

import { AlertOctagon, RefreshCw, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/index"
import { ErrorUtils, ApiError, ValidationError, NetworkError } from "@/lib/errors"

export interface ErrorDisplayProps {
  error: Error | string | null | undefined
  variant?: 'inline' | 'alert' | 'banner' | 'minimal'
  size?: 'sm' | 'md' | 'lg'
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
  showErrorCode?: boolean
}

/**
 * 통합 에러 표시 컴포넌트
 * 모든 에러 유형에 대해 일관된 UI 제공
 */
export function ErrorDisplay({
  error,
  variant = 'alert',
  size = 'md',
  onRetry,
  onDismiss,
  className,
  showErrorCode = false,
}: ErrorDisplayProps) {
  if (!error) return null

  const errorObj = typeof error === 'string' ? new Error(error) : error
  const errorMessage = ErrorUtils.getUserMessage(errorObj)
  
  // 에러 유형별 스타일링
  const getErrorType = () => {
    if (ErrorUtils.isNetworkError(errorObj)) return { type: 'network', color: 'bg-orange-50 border-orange-200 text-orange-800' }
    if (ErrorUtils.isAuthError(errorObj)) return { type: 'auth', color: 'bg-red-50 border-red-200 text-red-800' }
    if (ErrorUtils.isValidationError(errorObj)) return { type: 'validation', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' }
    if (ErrorUtils.isServerError(errorObj)) return { type: 'server', color: 'bg-purple-50 border-purple-200 text-purple-800' }
    return { type: 'unknown', color: 'bg-gray-50 border-gray-200 text-gray-800' }
  }

  const { type, color } = getErrorType()
  
  // 에러 코드 추출
  const getErrorCode = () => {
    if (errorObj instanceof ApiError) return errorObj.statusCode
    if ('code' in errorObj && errorObj.code) return errorObj.code
    return null
  }

  const errorCode = getErrorCode()

  // variant별 렌더링
  switch (variant) {
    case 'minimal':
      return (
        <div className={cn("flex items-center gap-2 text-sm text-destructive", className)}>
          <AlertOctagon className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-auto p-1 text-xs"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
      )

    case 'inline':
      return (
        <div className={cn("flex items-start gap-3 p-3 rounded-md", color, className)}>
          <AlertOctagon className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{errorMessage}</p>
            {showErrorCode && errorCode && (
              <Badge variant="outline" className="mt-1 text-xs">
                {String(errorCode)}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {onRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                className="h-auto p-1"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-auto p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )

    case 'banner':
      return (
        <div className={cn(
          "w-full p-4 border-l-4 border-destructive bg-destructive/5",
          size === 'sm' && "p-3",
          size === 'lg' && "p-6",
          className
        )}>
          <div className="flex items-start gap-3">
            <AlertOctagon className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-destructive mb-1">
                오류가 발생했습니다
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                {errorMessage}
              </p>
              {showErrorCode && errorCode && (
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    에러 코드: {String(errorCode)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    유형: {type}
                  </Badge>
                </div>
              )}
              {(onRetry || onDismiss) && (
                <div className="flex gap-2">
                  {onRetry && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRetry}
                      className="inline-flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      다시 시도
                    </Button>
                  )}
                  {onDismiss && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onDismiss}
                    >
                      닫기
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )

    case 'alert':
    default:
      return (
        <Alert variant="destructive" className={cn(className)}>
          <AlertOctagon className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex-1">
              {errorMessage}
              {showErrorCode && errorCode && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {String(errorCode)}
                </Badge>
              )}
            </div>
            <div className="flex gap-2 ml-4">
              {onRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRetry}
                  className="h-auto p-1"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="h-auto p-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )
  }
}

/**
 * 에러 상태를 위한 편의 컴포넌트들
 */

// React Query 에러용 컴포넌트
export function QueryErrorDisplay({ 
  error, 
  refetch,
  className 
}: { 
  error: Error | null
  refetch?: () => void
  className?: string 
}) {
  return (
    <ErrorDisplay
      error={error}
      variant="banner"
      onRetry={refetch}
      showErrorCode
      className={className}
    />
  )
}

// 폼 유효성 검증 에러용 컴포넌트
export function ValidationErrorDisplay({ 
  error,
  className 
}: { 
  error: ValidationError | string | null
  className?: string 
}) {
  return (
    <ErrorDisplay
      error={error}
      variant="inline"
      size="sm"
      className={className}
    />
  )
}

// 네트워크 에러용 컴포넌트
export function NetworkErrorDisplay({ 
  error,
  onRetry,
  className 
}: { 
  error: NetworkError | Error | null
  onRetry?: () => void
  className?: string 
}) {
  return (
    <ErrorDisplay
      error={error}
      variant="banner"
      onRetry={onRetry}
      showErrorCode
      className={className}
    />
  )
}