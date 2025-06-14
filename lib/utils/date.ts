import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * 표준 날짜 포맷들
 */
export const DATE_FORMATS = {
  FULL: 'yyyy년 MM월 dd일 HH:mm',
  DATE_ONLY: 'yyyy-MM-dd',
  TIME_ONLY: 'HH:mm',
  DATETIME: 'yyyy-MM-dd HH:mm',
  MONTH_DAY: 'MM월 dd일',
  RELATIVE: 'PPP'
} as const

/**
 * 날짜를 지정된 포맷으로 변환
 */
export function formatDate(date: Date | string, formatStr: string = DATE_FORMATS.DATETIME): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, formatStr, { locale: ko })
}

/**
 * 상대적 시간 표시 (예: "2시간 전", "3일 전")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: ko })
}

/**
 * 스마트 날짜 포맷 (오늘/어제는 시간만, 그 외는 날짜)
 */
export function formatSmartDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isToday(dateObj)) {
    return format(dateObj, 'HH:mm')
  }
  
  if (isYesterday(dateObj)) {
    return `어제 ${format(dateObj, 'HH:mm')}`
  }
  
  return format(dateObj, 'MM월 dd일')
}

/**
 * 채팅 메시지용 시간 포맷
 */
export function formatChatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'HH:mm')
}

/**
 * 파일명에 사용할 수 있는 날짜 문자열
 */
export function formatFileDate(date: Date | string = new Date()): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'yyyyMMdd_HHmmss')
}