/**
 * 클라이언트측 파일 파싱 유틸리티
 * PDF 등 특수 형식을 브라우저에서 텍스트로 변환
 */

// Dynamic import to prevent SSR issues
let pdfjsLib: any = null;

// PDF.js 초기화 함수
async function initializePdfJs() {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js can only be used in browser environment');
  }
  
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    
    // PDF.js 워커 설정
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    }
  }
  
  return pdfjsLib;
}

/**
 * PDF 파일을 텍스트로 변환
 * @param file PDF 파일
 * @returns 추출된 텍스트
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const pdfjs = await initializePdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const textParts: string[] = [];
    
    // 모든 페이지를 순회하며 텍스트 추출
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // 텍스트 아이템들을 문자열로 결합
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      textParts.push(`=== 페이지 ${pageNum} ===\n${pageText}`);
    }
    
    return textParts.join('\n\n');
  } catch (error) {
    throw new Error(`PDF 파일 처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

/**
 * 파일이 PDF인지 확인
 * @param file 확인할 파일
 * @returns PDF 여부
 */
export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * 클라이언트에서 처리 가능한 파일인지 확인
 * @param file 확인할 파일
 * @returns 클라이언트 처리 가능 여부
 */
export function isClientProcessableFile(file: File): boolean {
  return isPDFFile(file);
}

/**
 * 클라이언트에서 파일 사전 처리
 * @param file 처리할 파일
 * @returns 처리된 내용 또는 원본 파일
 */
export async function preprocessFileOnClient(file: File): Promise<{ type: 'text' | 'file'; content: string | File; fileName: string }> {
  // Ensure we're only running on client
  if (typeof window === 'undefined') {
    return {
      type: 'file',
      content: file,
      fileName: file.name
    };
  }
  
  if (isPDFFile(file)) {
    try {
      const text = await extractTextFromPDF(file);
      return {
        type: 'text',
        content: text,
        fileName: file.name
      };
    } catch (error) {
      // PDF 처리 실패 시 원본 파일 반환
      return {
        type: 'file',
        content: file,
        fileName: file.name
      };
    }
  }
  
  // PDF가 아닌 파일은 그대로 반환
  return {
    type: 'file',
    content: file,
    fileName: file.name
  };
}