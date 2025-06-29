/**
 * 서버측 파일 파싱 유틸리티
 * 다양한 파일 형식에서 텍스트를 추출하는 함수들
 */

import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import * as chardet from 'chardet';
import iconv from 'iconv-lite';

// RTF 파일 파싱
function parseRTF(rtfContent: string): string {
  // RTF 헤더 검증
  if (!rtfContent.startsWith('{\\rtf')) {
    throw new Error('유효한 RTF 파일이 아닙니다');
  }

  let text = rtfContent;
  
  // 1. 유니코드 문자 처리 (\\u12345 형식)
  text = text.replace(/\\u(-?\d+)\??/g, (match, code) => {
    const charCode = parseInt(code);
    if (charCode < 0) {
      // 음수는 65536을 더해서 처리
      return String.fromCharCode(charCode + 65536);
    }
    return String.fromCharCode(charCode);
  });

  // 2. ANSI 코드 페이지 문자 처리 (\\'xx 형식)
  text = text.replace(/\\'([0-9a-f]{2})/gi, (match, hex) => {
    const code = parseInt(hex, 16);
    // CP949 (Korean) 또는 CP1252 (Western) 가정
    return String.fromCharCode(code);
  });

  // 3. RTF 제어 단어 처리
  const controlWords: { [key: string]: string } = {
    '\\par': '\n',
    '\\line': '\n',
    '\\tab': '\t',
    '\\bullet': '•',
    '\\endash': '–',
    '\\emdash': '—',
    '\\lquote': '\u2018',
    '\\rquote': '\u2019',
    '\\ldblquote': '\u201C',
    '\\rdblquote': '\u201D',
  };

  // 제어 단어 치환
  Object.entries(controlWords).forEach(([rtfCode, replacement]) => {
    text = text.replace(new RegExp(rtfCode.replace(/\\/g, '\\\\'), 'g'), replacement);
  });

  // 4. 그룹 처리 및 불필요한 제어 단어 제거
  text = text.replace(/\{\\fonttbl[^}]+\}/g, '');
  text = text.replace(/\{\\colortbl[^}]+\}/g, '');
  text = text.replace(/\{\\stylesheet[^}]+\}/g, '');
  text = text.replace(/\{\\\*\\[^}]+\}/g, '');
  
  // 5. 나머지 제어 단어 제거 (숫자 파라미터 포함)
  text = text.replace(/\\[a-z]+(-?\d+)?[ ]?/gi, '');
  
  // 6. 중괄호 제거
  text = text.replace(/[{}]/g, '');
  
  // 7. 연속된 공백 및 줄바꿈 정리
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  
  return text.trim();
}

// CSV 파일 파싱 (개선된 버전)
function parseCSV(csvContent: string): string {
  const result = Papa.parse(csvContent, {
    skipEmptyLines: true,
    encoding: 'UTF-8',
  });
  
  if (result.errors.length > 0) {
    // 기본 파싱으로 폴백
    const lines = csvContent.split(/\r?\n/);
    const parsedLines: string[] = [];
    
    lines.forEach(line => {
      if (line.trim()) {
        const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        parsedLines.push(values.join(' '));
      }
    });
    
    return parsedLines.join('\n');
  }
  
  // 파싱 성공
  return result.data.map(row => {
    if (Array.isArray(row)) {
      return row.join(' ');
    }
    return Object.values(row).join(' ');
  }).join('\n');
}

// 엑셀 파일 파싱 (XLSX, XLS)
async function parseExcel(buffer: Buffer): Promise<string> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const textParts: string[] = [];
    
    // 모든 시트를 순회
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      textParts.push(`=== ${sheetName} ===\n${data}`);
    });
    
    return textParts.join('\n\n');
  } catch (error) {
    throw new Error(`엑셀 파일 파싱 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

// PDF 파일 파싱 - 현재 미지원
async function parsePDF(buffer: Buffer): Promise<string> {
  throw new Error('PDF 파일은 현재 지원되지 않습니다. 텍스트 기반 형식(TXT, DOCX, RTF 등)으로 변환 후 업로드해주세요.');
}

// DOCX 파일 파싱
async function parseDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new Error(`DOCX 파일 파싱 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

// HWP 파일 기본 텍스트 추출 (완전한 파싱은 아님)
function parseHWP(buffer: Buffer): string {
  // HWP 5.0 이상 버전은 복잡한 구조를 가지고 있어 완전한 파싱이 어려움
  // 기본적인 텍스트만 추출 시도
  
  // HWP 시그니처 확인
  const signature = buffer.toString('utf8', 0, 8);
  if (!signature.includes('HWP')) {
    throw new Error('유효한 HWP 파일이 아닙니다');
  }
  
  // 텍스트 추출 시도 (간단한 방법)
  const text = buffer.toString('utf8', 256); // 헤더 이후부터
  const cleanedText = text
    .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ') // 제어문자 제거
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!cleanedText || cleanedText.length < 10) {
    throw new Error('HWP 파일에서 텍스트를 추출할 수 없습니다. 다른 형식으로 변환 후 업로드해주세요.');
  }
  
  return cleanedText;
}

// JSON 파일 파싱
function parseJSON(jsonContent: string): string {
  try {
    const data = JSON.parse(jsonContent);
    // JSON을 읽기 쉬운 텍스트로 변환
    return JSON.stringify(data, null, 2)
      .replace(/[{}"[\],]/g, ' ')
      .replace(/:\s*/g, ': ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (error) {
    // JSON 파싱 실패 시 원본 반환
    return jsonContent;
  }
}

// XML/HTML 파일 파싱
function parseXML(xmlContent: string): string {
  // 태그 제거하고 텍스트만 추출
  return xmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // script 태그 제거
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // style 태그 제거
    .replace(/<[^>]+>/g, ' ') // 모든 태그 제거
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// 일반 텍스트 정리
function cleanText(text: string): string {
  // BOM 제거
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  
  // 제어 문자 제거 (탭과 줄바꿈 제외)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Windows 줄바꿈을 Unix 스타일로 통일
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\r/g, '\n');
  
  // 연속된 공백 정리
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return text.trim();
}

// 인코딩 감지 및 변환
function decodeBuffer(buffer: Buffer): string {
  // 인코딩 자동 감지
  const detectedEncoding = chardet.detect(buffer);
  
  if (!detectedEncoding) {
    // 기본 UTF-8로 시도
    return buffer.toString('utf8');
  }
  
  // 감지된 인코딩으로 디코딩
  try {
    if (iconv.encodingExists(detectedEncoding)) {
      return iconv.decode(buffer, detectedEncoding);
    }
  } catch (error) {
    // 디코딩 실패 시 UTF-8로 폴백
  }
  
  return buffer.toString('utf8');
}

// 파일에서 텍스트 추출 (서버용)
export async function extractTextFromFileOnServer(
  fileContent: string | Buffer,
  fileName: string
): Promise<string> {
  const lowerFileName = fileName.toLowerCase();
  
  try {
    // Buffer로 변환
    let buffer: Buffer;
    if (typeof fileContent === 'string') {
      buffer = Buffer.from(fileContent, 'utf8');
    } else {
      buffer = fileContent;
    }
    
    // PDF 파일
    if (lowerFileName.endsWith('.pdf')) {
      const text = await parsePDF(buffer);
      return cleanText(text);
    }
    
    // Word 문서 (DOCX)
    if (lowerFileName.endsWith('.docx')) {
      const text = await parseDOCX(buffer);
      return cleanText(text);
    }
    
    // 엑셀 파일 (XLSX, XLS)
    if (lowerFileName.endsWith('.xlsx') || lowerFileName.endsWith('.xls')) {
      const text = await parseExcel(buffer);
      return cleanText(text);
    }
    
    // 텍스트 기반 파일들은 인코딩 감지 후 처리
    const textContent = typeof fileContent === 'string' ? fileContent : decodeBuffer(buffer);
    
    // RTF 파일
    if (lowerFileName.endsWith('.rtf')) {
      return cleanText(parseRTF(textContent));
    }
    
    // CSV 파일
    if (lowerFileName.endsWith('.csv')) {
      return cleanText(parseCSV(textContent));
    }
    
    // JSON 파일
    if (lowerFileName.endsWith('.json')) {
      return cleanText(parseJSON(textContent));
    }
    
    // XML/HTML 파일
    if (lowerFileName.endsWith('.xml') || lowerFileName.endsWith('.html') || lowerFileName.endsWith('.htm')) {
      return cleanText(parseXML(textContent));
    }
    
    // HWP 파일 (제한적 지원)
    if (lowerFileName.endsWith('.hwp')) {
      return cleanText(parseHWP(buffer));
    }
    
    // 기타 텍스트 파일 (txt, md, log, etc.)
    const textExtensions = ['.txt', '.md', '.markdown', '.log', '.text', '.asc', '.org', '.textile'];
    if (textExtensions.some(ext => lowerFileName.endsWith(ext))) {
      return cleanText(textContent);
    }
    
    // 프로그래밍 파일들도 텍스트로 처리
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.php', '.rb', '.go', '.swift', '.kt', '.rs', '.scala', '.r', '.m', '.h', '.hpp', '.sh', '.bash', '.zsh', '.ps1', '.sql', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf'];
    if (codeExtensions.some(ext => lowerFileName.endsWith(ext))) {
      return cleanText(textContent);
    }
    
    // 지원되지 않는 파일 형식
    throw new Error(`지원되지 않는 파일 형식입니다: ${lowerFileName.split('.').pop()?.toUpperCase()}`);
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('지원되지 않는 파일 형식')) {
      throw error;
    }
    throw new Error(`파일 처리 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

