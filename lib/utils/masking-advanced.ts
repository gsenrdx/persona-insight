/**
 * Advanced masking utility with balanced approach
 * Focuses on actual PII while preserving readability
 */

// Common Korean surnames (top 50 covering ~90% of population)
const KOREAN_SURNAMES = [
  '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임',
  '한', '오', '서', '신', '권', '황', '안', '송', '류', '전',
  '홍', '고', '문', '양', '손', '배', '백', '허', '유', '남',
  '심', '노', '하', '곽', '성', '차', '주', '우', '구', '민',
  '진', '나', '지', '엄', '채', '원', '천', '방', '공', '현'
];

// Professional titles and honorifics
const TITLES = [
  '님', '씨', '군', '양', '선생', '선생님', '교수', '교수님', '박사', '박사님',
  '사장', '사장님', '대표', '대표님', '이사', '이사님', '부장', '부장님',
  '과장', '과장님', '대리', '대리님', '주임', '주임님', '사원', '팀장',
  '팀장님', '실장', '실장님', '원장', '원장님', '회장', '회장님', '부회장',
  '전무', '상무', '이사', '감사', '고문', '부사장', 'PD', 'CP', '작가',
  '기자', '앵커', '교사', '의사', '간호사', '변호사', '검사', '판사'
];

// Context indicators for name detection
const NAME_CONTEXTS = [
  '제 이름은', '저는', '나는', '내 이름은', '안녕하세요', '처음 뵙겠습니다',
  '라고 합니다', '입니다', '이에요', '예요', '이라고', '라고', '에게', '한테',
  '께서', '께서는', '님이', '님께서', '씨가', '씨는'
];

export interface AdvancedMaskingResult {
  maskedText: string;
  detectedItems: {
    type: string;
    count: number;
    confidence: 'high' | 'medium' | 'low';
  }[];
  processingTime: number;
  totalMasked: number;
}

// Enhanced patterns with better accuracy
const ENHANCED_PATTERNS = {
  // Email - high confidence
  EMAIL: {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[이메일]',
    confidence: 'high' as const
  },
  
  // Phone numbers - high confidence
  PHONE: {
    pattern: /(?:(?:010|011|016|017|018|019)[-\s]?\d{3,4}[-\s]?\d{4})|(?:0[2-6]\d[-\s]?\d{3,4}[-\s]?\d{4})/g,
    replacement: '[전화번호]',
    confidence: 'high' as const
  },
  
  // Korean RRN - high confidence
  RRN: {
    pattern: /(?<!\d)\d{6}[-\s]?[1-4]\d{6}(?!\d)/g,
    replacement: '[주민등록번호]',
    confidence: 'high' as const
  },
  
  // Credit card - high confidence
  CARD: {
    pattern: /(?<!\d)\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}(?!\d)/g,
    replacement: '[카드번호]',
    confidence: 'high' as const
  },
  
  // Business registration number - high confidence
  COMPANY_REG: {
    pattern: /(?<!\d)\d{3}[-\s]?\d{2}[-\s]?\d{5}(?!\d)/g,
    replacement: '[사업자번호]',
    confidence: 'high' as const
  },
  
  // Passport - medium confidence
  PASSPORT: {
    pattern: /(?<![A-Z])[A-Z]{1,2}\d{7,8}(?!\d)/g,
    replacement: '[여권번호]',
    confidence: 'medium' as const
  },
  
  // Interview participants - high confidence
  PARTICIPANT: {
    pattern: /참[가여석]자\s*\d+/g,
    replacement: '[참가자]',
    confidence: 'high' as const
  }
};

// Smart name detection function
function detectKoreanNames(text: string): { name: string; confidence: 'high' | 'medium' | 'low' }[] {
  const detectedNames: { name: string; confidence: 'high' | 'medium' | 'low' }[] = [];
  const processedNames = new Set<string>();
  
  // High confidence: Full name pattern with context
  KOREAN_SURNAMES.forEach(surname => {
    // Names with titles (high confidence)
    const titlePattern = new RegExp(
      `${surname}[가-힣]{1,2}\\s*(?:${TITLES.join('|')})(?![가-힣])`,
      'g'
    );
    const titleMatches = text.matchAll(titlePattern);
    for (const match of titleMatches) {
      const name = match[0];
      if (!processedNames.has(name)) {
        processedNames.add(name);
        detectedNames.push({ name, confidence: 'high' });
      }
    }
    
    // Names in introduction context (high confidence)
    NAME_CONTEXTS.forEach(context => {
      const contextPattern = new RegExp(
        `(?:${context})\\s*${surname}[가-힣]{1,2}(?![가-힣])`,
        'g'
      );
      const contextMatches = text.matchAll(contextPattern);
      for (const match of contextMatches) {
        const fullMatch = match[0];
        const nameMatch = fullMatch.match(new RegExp(`${surname}[가-힣]{1,2}`));
        if (nameMatch && !processedNames.has(nameMatch[0])) {
          processedNames.add(nameMatch[0]);
          detectedNames.push({ name: nameMatch[0], confidence: 'high' });
        }
      }
    });
  });
  
  // Medium confidence: Names in metadata format
  const metadataPattern = /^\s*([가-힣]{2,4})\s*$/gm;
  const metadataMatches = text.matchAll(metadataPattern);
  for (const match of metadataMatches) {
    const name = match[1];
    if (name && !processedNames.has(name) && KOREAN_SURNAMES.some(surname => name.startsWith(surname))) {
      processedNames.add(name);
      detectedNames.push({ name, confidence: 'medium' });
    }
  }
  
  // Names after timestamps (medium confidence)
  const timestampNamePattern = /\d{2}:\d{2}\s+([가-힣]{2,4})(?:\s|$)/g;
  const timestampMatches = text.matchAll(timestampNamePattern);
  for (const match of timestampMatches) {
    const name = match[1];
    if (name && !processedNames.has(name) && KOREAN_SURNAMES.some(surname => name.startsWith(surname))) {
      processedNames.add(name);
      detectedNames.push({ name, confidence: 'medium' });
    }
  }
  
  return detectedNames;
}

// Smart address detection
function detectAddresses(text: string): string[] {
  const addresses: string[] = [];
  
  // Korean address patterns
  const addressPattern = /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(?:특별시|광역시|특별자치시|도|특별자치도)?(?:\s+[가-힣]+(?:시|군|구))?(?:\s+[가-힣]+(?:읍|면|동|로|길))?(?:\s+\d+(?:-\d+)?)?(?:\s+[가-힣]+(?:아파트|빌딩|타워|오피스텔))?(?:\s+\d+동)?(?:\s+\d+호)?/g;
  
  const matches = text.matchAll(addressPattern);
  for (const match of matches) {
    addresses.push(match[0]);
  }
  
  return addresses;
}

// Main masking function
export function maskSensitiveDataAdvanced(text: string): AdvancedMaskingResult {
  const startTime = Date.now();
  let maskedText = text;
  const detectedItems: AdvancedMaskingResult['detectedItems'] = [];
  let totalMasked = 0;
  
  // Apply high-confidence patterns first
  Object.entries(ENHANCED_PATTERNS).forEach(([type, config]) => {
    const matches = maskedText.match(config.pattern);
    if (matches && matches.length > 0) {
      detectedItems.push({
        type,
        count: matches.length,
        confidence: config.confidence
      });
      totalMasked += matches.length;
      maskedText = maskedText.replace(config.pattern, config.replacement);
    }
  });
  
  // Detect and mask Korean names
  const detectedNames = detectKoreanNames(maskedText);
  if (detectedNames.length > 0) {
    const namesByConfidence = {
      high: detectedNames.filter(n => n.confidence === 'high'),
      medium: detectedNames.filter(n => n.confidence === 'medium'),
      low: detectedNames.filter(n => n.confidence === 'low')
    };
    
    // Mask high confidence names
    if (namesByConfidence.high.length > 0) {
      detectedItems.push({
        type: 'KOREAN_NAME',
        count: namesByConfidence.high.length,
        confidence: 'high'
      });
      totalMasked += namesByConfidence.high.length;
      
      namesByConfidence.high.forEach(({ name }) => {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        maskedText = maskedText.replace(new RegExp(escapedName, 'g'), '[이름]');
      });
    }
    
    // Mask medium confidence names (optional, based on sensitivity requirements)
    if (namesByConfidence.medium.length > 0) {
      detectedItems.push({
        type: 'KOREAN_NAME_PROBABLE',
        count: namesByConfidence.medium.length,
        confidence: 'medium'
      });
      totalMasked += namesByConfidence.medium.length;
      
      namesByConfidence.medium.forEach(({ name }) => {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        maskedText = maskedText.replace(new RegExp(escapedName, 'g'), '[이름]');
      });
    }
  }
  
  // Detect and mask addresses
  const addresses = detectAddresses(maskedText);
  if (addresses.length > 0) {
    detectedItems.push({
      type: 'ADDRESS',
      count: addresses.length,
      confidence: 'high'
    });
    totalMasked += addresses.length;
    
    addresses.forEach(address => {
      const escapedAddress = address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      maskedText = maskedText.replace(new RegExp(escapedAddress, 'g'), '[주소]');
    });
  }
  
  const processingTime = Date.now() - startTime;
  
  return {
    maskedText,
    detectedItems,
    processingTime,
    totalMasked
  };
}

// Validation function
export function validateMasking(original: string, masked: string): {
  isValid: boolean;
  preservedRatio: number;
  readability: 'high' | 'medium' | 'low';
} {
  const originalLength = original.length;
  const maskedLength = masked.length;
  const preservedRatio = (maskedLength / originalLength);
  
  // Count masked placeholders
  const placeholderCount = (masked.match(/\[[\w\s]+\]/g) || []).length;
  const placeholderRatio = placeholderCount / (masked.split(/\s+/).length || 1);
  
  let readability: 'high' | 'medium' | 'low' = 'high';
  if (placeholderRatio > 0.5) readability = 'low';
  else if (placeholderRatio > 0.3) readability = 'medium';
  
  return {
    isValid: preservedRatio > 0.5 && preservedRatio < 1.5,
    preservedRatio,
    readability
  };
}