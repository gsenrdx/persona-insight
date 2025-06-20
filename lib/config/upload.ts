/**
 * 파일 업로드 관련 설정
 */

/**
 * 파일 업로드 제한 및 설정
 */
export const FILE_UPLOAD_CONFIG = {
  /** 최대 파일 크기 (10MB) */
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  
  /** 한 번에 업로드 가능한 최대 파일 수 */
  MAX_FILES_COUNT: 20,
  
  /** 지원하는 MIME 타입들 */
  SUPPORTED_MIME_TYPES: [
    // 텍스트 파일
    'text/plain',
    'text/markdown',
    'text/csv',
    
    // 문서 파일
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // 압축 파일
    'application/zip',
    'application/x-rar-compressed',
    
    // 오디오 파일
    'audio/mpeg',
    'audio/wav',
    'audio/x-m4a',
    'audio/mp4',
    'audio/webm',
    
    // 비디오 파일
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ] as const,
  
  /** 지원하는 파일 확장자들 */
  SUPPORTED_EXTENSIONS: [
    // 텍스트
    '.txt', '.md', '.csv',
    
    // 문서
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    
    // 압축
    '.zip', '.rar',
    
    // 오디오
    '.mp3', '.wav', '.m4a', '.aac', '.webm',
    
    // 비디오
    '.mp4', '.webm', '.mov',
  ] as const,
  
  /** 업로드 청크 크기 (1MB) */
  CHUNK_SIZE: 1024 * 1024,
  
  /** 업로드 타임아웃 (5분) */
  UPLOAD_TIMEOUT: 5 * 60 * 1000,
} as const