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

// 파일 크기 제한 (MB)
export const MAX_FILE_SIZE_MB = 50;

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
  }
};

// 사용자 친화적인 파일 타입 설명
export const getFileTypeDescription = (): string => {
  return 'PDF, Word, Excel, TXT, RTF, CSV, JSON, XML 등';
};