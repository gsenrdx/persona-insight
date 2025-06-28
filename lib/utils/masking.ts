// Regex patterns for Korean sensitive data
const PATTERNS = {
  // Korean phone numbers (010-1234-5678, 01012345678, etc.)
  PHONE: /(?:010|011|016|017|018|019)[-\s]?\d{3,4}[-\s]?\d{4}/g,
  
  // Email addresses
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  
  // Korean resident registration number (주민등록번호)
  RRN: /\d{6}[-\s]?[1-4]\d{6}/g,
  
  // Korean names - match interview participants and names with titles
  KOREAN_NAME: /(?:참[가여석]자\s*\d+|(?:김|이|박|최|정|강|조|윤|장|임|한|오|서|신|권|황|안|송|류|전|홍|고|문|양|손|배|백|허|유|남|심|노|하|곽|성|차|주|우|구|민|진|나|지|엄|채|원|천|방|공|현|함|염|여|추|도|석|선|설|마|길|연|위|표|명|기|반|라|왕|금|옥|육|인|맹|제|모|탁|국|어|은|편|용|예|소|봉|경|사|부|가|복|태|목|형|계|피|두|감|음|빈|동|온|호|범|좌|팽|승|간|상|갈|단|견|당|화|창|옹|갑)[가-힣]{1,2}(?:\s*(?:님|씨|부장님|과장님|대리님|사원님|주임님|팀장님|실장님|이사님|대표님|사장님|회장님|교수님|박사님|원장님|장관님|의원님|검사님|판사님|변호사님|기자님|작가님|PD님|감독님|선생님|간호사님|의사님|약사님|부장|과장|대리|사원|주임|팀장|실장|이사|대표|사장|회장|교수|박사|원장|장관|의원|검사|판사|변호사|기자|작가|PD|감독|선생|간호사|의사|약사)|(?=이|가|을|를|에게|한테|께|와|과|이랑|랑|님|씨)))/g,
  
  // Credit card numbers (4 groups of 4 digits)
  CARD: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g,
  
  // Bank account numbers (various formats)
  ACCOUNT: /\d{3,6}[-\s]?\d{2,6}[-\s]?\d{2,6}[-\s]?\d{1,6}/g,
  
  // Korean addresses (도로명, 지번)
  ADDRESS: /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(?:특별시|광역시|특별자치시|도|특별자치도)?\s+[가-힣]+(?:시|군|구)?\s+[가-힣]+(?:읍|면|동|로|길)?\s*\d*[-\d]*/g,
  
  // Company registration number (사업자등록번호)
  COMPANY_REG: /\d{3}[-\s]?\d{2}[-\s]?\d{5}/g,
  
  // Passport number
  PASSPORT: /[A-Z]{1,2}\d{7,8}/g,
  
  // Driver license number
  DRIVER_LICENSE: /\d{2}[-\s]?\d{2}[-\s]?\d{6}[-\s]?\d{2}/g
};

// Masking replacements
const REPLACEMENTS: Record<keyof typeof PATTERNS, string> = {
  PHONE: '[전화번호]',
  EMAIL: '[이메일]',
  RRN: '[주민등록번호]',
  KOREAN_NAME: '[이름]',
  CARD: '[카드번호]',
  ACCOUNT: '[계좌번호]',
  ADDRESS: '[주소]',
  COMPANY_REG: '[사업자번호]',
  PASSPORT: '[여권번호]',
  DRIVER_LICENSE: '[운전면허번호]'
};

export interface MaskingResult {
  maskedText: string;
  detectedCount: Record<string, number>;
  processingTime: number;
}

// Additional context-based name detection
function detectContextualNames(text: string): string[] {
  const contextualNames: string[] = [];
  
  // Pattern for names in interview metadata (e.g., "2025.05.07 수 오전 9:58 ・ 45분 46초\n유선영")
  const metadataNamePattern = /\d{4}\.\d{2}\.\d{2}.*\n([가-힣]{2,4})\s*$/gm;
  const metadataMatches = text.matchAll(metadataNamePattern);
  for (const match of metadataMatches) {
    if (match[1]) contextualNames.push(match[1]);
  }
  
  // Pattern for names mentioned after "저는" or "제 이름은"
  const introNamePattern = /(?:저는|제 이름은|나는|내 이름은)\s*([가-힣]{2,4})(?:입니다|이에요|예요|라고|이라고)/g;
  const introMatches = text.matchAll(introNamePattern);
  for (const match of introMatches) {
    if (match[1]) contextualNames.push(match[1]);
  }
  
  return [...new Set(contextualNames)]; // Remove duplicates
}

export function maskSensitiveData(text: string): MaskingResult {
  const startTime = Date.now();
  let maskedText = text;
  const detectedCount: Record<string, number> = {};

  // First, detect contextual names
  const contextualNames = detectContextualNames(text);
  if (contextualNames.length > 0) {
    detectedCount['CONTEXTUAL_NAME'] = contextualNames.length;
    contextualNames.forEach(name => {
      // Escape special regex characters in the name
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      maskedText = maskedText.replace(new RegExp(escapedName, 'g'), '[이름]');
    });
  }

  // Apply patterns in specific order for better accuracy
  const patternOrder: (keyof typeof PATTERNS)[] = [
    'EMAIL',      // Process emails first to avoid partial matches
    'PHONE',      // Phone numbers
    'RRN',        // Resident registration numbers
    'CARD',       // Credit cards
    'PASSPORT',   // Passport
    'DRIVER_LICENSE', // Driver license
    'COMPANY_REG',    // Company registration
    'ACCOUNT',    // Bank accounts (before addresses to avoid conflicts)
    'ADDRESS',    // Addresses
    'KOREAN_NAME' // Korean names last to avoid over-matching
  ];

  patternOrder.forEach((key) => {
    const pattern = PATTERNS[key];
    const matches = maskedText.match(pattern);
    if (matches) {
      detectedCount[key] = matches.length;
      maskedText = maskedText.replace(pattern, REPLACEMENTS[key]);
    }
  });

  const processingTime = Date.now() - startTime;

  return {
    maskedText,
    detectedCount,
    processingTime
  };
}

// Test function for validation
export function testMasking() {
  const testCases = [
    "안녕하세요, 제 이름은 김철수입니다. 전화번호는 010-1234-5678입니다.",
    "참여자 1: 안녕하세요. 이종승 부장님 맞으시죠?",
    "이메일은 test@example.com이고 주민번호는 901225-1234567입니다.",
    "서울특별시 강남구 테헤란로 123번지에 살고 있습니다.",
    "카드번호는 1234-5678-9012-3456이고 계좌번호는 123-456-789012입니다.",
    "사업자등록번호는 123-45-67890입니다.",
    "참가자 2: 네, 맞습니다. 김영희 과장님도 오셨네요.",
    "박민수씨, 최지현님, 그리고 홍길동 대리가 참석했습니다."
  ];

  testCases.forEach(testCase => {
    const result = maskSensitiveData(testCase);
    console.log('Original:', testCase);
    console.log('Masked:', result.maskedText);
    console.log('Detected:', result.detectedCount);
    console.log('Time:', result.processingTime + 'ms');
    console.log('---');
  });
}

// Import advanced masking
import { maskSensitiveDataAdvanced, validateMasking } from './masking-advanced';

// Wrapper function to maintain backward compatibility
export function maskSensitiveDataWithAdvanced(text: string): MaskingResult {
  const advancedResult = maskSensitiveDataAdvanced(text);
  
  // Convert advanced result to legacy format
  const detectedCount: Record<string, number> = {};
  advancedResult.detectedItems.forEach(item => {
    const key = item.type === 'KOREAN_NAME_PROBABLE' ? 'KOREAN_NAME' : item.type;
    detectedCount[key] = (detectedCount[key] || 0) + item.count;
  });
  
  return {
    maskedText: advancedResult.maskedText,
    detectedCount,
    processingTime: advancedResult.processingTime
  };
}

export { maskSensitiveDataAdvanced, validateMasking } from './masking-advanced';