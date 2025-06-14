/**
 * 파일 크기를 사람이 읽기 쉬운 형태로 포맷팅
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 숫자를 한국어 형식으로 포맷팅 (천 단위 구분)
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR')
}

/**
 * 통화 포맷팅 (원화)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW'
  }).format(amount)
}

/**
 * 백분율 포맷팅
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * 텍스트 말줄임 처리
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + suffix
}

/**
 * 단어 단위로 텍스트 말줄임 처리
 */
export function truncateWords(text: string, maxWords: number, suffix: string = '...'): string {
  const words = text.split(' ')
  if (words.length <= maxWords) return text
  return words.slice(0, maxWords).join(' ') + suffix
}

/**
 * 파일명 안전화 (특수문자 제거)
 */
export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
}

/**
 * slug 생성 (URL 친화적 문자열)
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 특수문자 제거
    .replace(/[\s_-]+/g, '-') // 공백을 하이픈으로
    .replace(/^-+|-+$/g, '') // 앞뒤 하이픈 제거
}

/**
 * 첫 글자 대문자로 변환
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * 카멜케이스를 일반 텍스트로 변환
 */
export function camelToText(camelCase: string): string {
  return camelCase
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

/**
 * 전화번호 포맷팅 (한국 형식)
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
  }
  
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
  }
  
  return phone
}

/**
 * 소수점 자릿수 제한
 */
export function formatDecimal(num: number, decimals: number = 2): string {
  return Number(num.toFixed(decimals)).toString()
}

/**
 * 바이트를 비트로 변환
 */
export function bytesToBits(bytes: number): number {
  return bytes * 8
}

/**
 * 배열을 문자열로 조인 (마지막 항목은 "과/와" 사용)
 */
export function joinWithAnd(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]}과 ${items[1]}`
  
  const lastItem = items[items.length - 1]
  const otherItems = items.slice(0, -1)
  
  return `${otherItems.join(', ')}과 ${lastItem}`
}