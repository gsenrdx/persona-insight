/**
 * 파일 업로드 관련 상수
 * 클라이언트와 서버 모두에서 사용할 수 있는 상수들
 */

// 지원되는 파일 확장자 목록
export const SUPPORTED_FILE_EXTENSIONS = [
  // 문서 파일
  '.pdf', '.docx', '.rtf', '.hwp',
  // 스프레드시트
  '.xlsx', '.xls', '.csv',
  // 텍스트 파일
  '.txt', '.md', '.markdown', '.log', '.text',
  // 데이터 파일
  '.json', '.xml', '.html', '.htm',
  // 프로그래밍 파일
  '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.php', '.rb', '.go', '.swift', '.kt', '.rs', '.scala', '.r', '.sql', '.yaml', '.yml'
];

// 오디오 파일 확장자 목록
export const SUPPORTED_AUDIO_EXTENSIONS = [
  '.mp3', '.m4a', '.wav', '.webm', '.amr', '.mpga'
];

// 파일 크기 제한 (MB)
export const MAX_FILE_SIZE_MB = 50;

// 오디오 파일 크기 제한 (MB) - MISO API 제약사항
export const MAX_AUDIO_FILE_SIZE_MB = 50;

// 파일 타입별 분류
export const FILE_TYPE_GROUPS = {
  documents: {
    label: '문서',
    extensions: ['.pdf', '.docx', '.rtf', '.hwp'],
    icon: '📄'
  },
  spreadsheets: {
    label: '스프레드시트',
    extensions: ['.xlsx', '.xls', '.csv'],
    icon: '📊'
  },
  text: {
    label: '텍스트',
    extensions: ['.txt', '.md', '.markdown', '.log', '.text'],
    icon: '📝'
  },
  data: {
    label: '데이터',
    extensions: ['.json', '.xml', '.html', '.htm'],
    icon: '📦'
  },
  code: {
    label: '코드',
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.php', '.rb', '.go', '.swift', '.kt', '.rs', '.scala', '.r', '.sql', '.yaml', '.yml'],
    icon: '💻'
  },
  audio: {
    label: '음성',
    extensions: SUPPORTED_AUDIO_EXTENSIONS,
    icon: '🎵'
  }
};

// 오디오 파일 MIME 타입 목록
export const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/mpeg',      // .mp3
  'audio/mp4',       // .m4a
  'audio/wav',       // .wav
  'audio/webm',      // .webm
  'audio/amr',       // .amr
  'audio/mpeg'       // .mpga
];

// 파일 타입 설명 함수들
export function getFileTypeDescription(): string {
  const docTypes = FILE_TYPE_GROUPS.documents.extensions.join(', ');
  const textTypes = FILE_TYPE_GROUPS.text.extensions.join(', ');
  return `지원 형식: ${docTypes}, ${textTypes} 등`;
}

export function getAudioTypeDescription(): string {
  return `지원 형식: ${SUPPORTED_AUDIO_EXTENSIONS.join(', ')} (음성 파일)`;
}

// 파일 확장자가 오디오 파일인지 확인
export function isAudioFile(fileName: string): boolean {
  const extension = fileName.toLowerCase().match(/\.[^/.]+$/)?.[0];
  return extension ? SUPPORTED_AUDIO_EXTENSIONS.includes(extension) : false;
}

// 파일 확장자가 지원되는 문서 파일인지 확인
export function isDocumentFile(fileName: string): boolean {
  const extension = fileName.toLowerCase().match(/\.[^/.]+$/)?.[0];
  return extension ? SUPPORTED_FILE_EXTENSIONS.includes(extension) : false;
}