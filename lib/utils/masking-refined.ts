/**
 * Refined masking utility - more accurate PII detection
 * Minimizes false positives while maintaining security
 */

// High-confidence patterns only
const REFINED_PATTERNS = {
  // Email addresses
  EMAIL: /[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}/g,
  
  // Phone numbers (mobile and landline)
  PHONE: /(?:010|011|016|017|018|019|02|031|032|033|041|042|043|044|051|052|053|054|055|061|062|063|064)[-\s]?\d{3,4}[-\s]?\d{4}/g,
  
  // Korean resident registration number
  RRN: /(?<!\d)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[-\s]?[1-4]\d{6}(?!\d)/g,
  
  // Credit card numbers
  CARD: /(?<!\d)(?:\d{4}[-\s]?){3}\d{4}(?!\d)/g,
  
  // Business registration number
  COMPANY_REG: /(?<!\d)\d{3}[-\s]?\d{2}[-\s]?\d{5}(?!\d)/g,
};

// Common words that might be mistaken for names
const FALSE_POSITIVE_WORDS = new Set([
  '이름', '성명', '대명', '유명', '무명', '익명', '가명', '본명', '예명', '별명',
  '회사명', '상호명', '제품명', '브랜드명', '프로젝트명', '파일명', '폴더명',
  '이미지', '동영상', '음성', '문서', '자료', '파일', '폴더', '디렉토리',
  '서비스', '시스템', '프로그램', '애플리케이션', '소프트웨어', '하드웨어',
  '네트워크', '서버', '데이터베이스', '클라우드', '플랫폼', '인프라',
  '차지비', '충전기', '충전소', '전기차', '자동차', '차량', '주차장',
  '아파트', '빌딩', '건물', '주택', '오피스텔', '원룸', '투룸',
  '회사', '기업', '조직', '부서', '팀', '그룹', '센터', '본부',
  '고객', '사용자', '회원', '구성원', '직원', '임직원', '관리자',
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
]);

// Korean name detection with strict validation
function detectKoreanNamesStrict(text: string): string[] {
  const detectedNames: string[] = [];
  const processedPositions = new Set<string>();
  
  // Pattern 1: Names with professional titles (high confidence)
  const titlePattern = /(?<![가-힣])([김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민진나지엄채원천방공현함염여추도석선설마길연위표명기반라왕금][가-힣]{1,2})\s*(님|씨|부장님?|과장님?|대리님?|사원님?|주임님?|팀장님?|실장님?|이사님?|대표님?|사장님?|회장님?|교수님?|박사님?|PD님?|작가님?|기자님?)(?![가-힣])/g;
  
  const titleMatches = [...text.matchAll(titlePattern)];
  for (const match of titleMatches) {
    const fullMatch = match[0];
    const name = match[1];
    const position = `${match.index}`;
    
    // Skip if already processed or is a false positive
    if (name && match.index !== undefined && !processedPositions.has(position) && !FALSE_POSITIVE_WORDS.has(name)) {
      processedPositions.add(position);
      detectedNames.push(fullMatch);
    }
  }
  
  // Pattern 2: Names in introduction context (high confidence)
  const introPattern = /(?:제 이름은|저는|제가|본인은)\s*([김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민진나지엄채원천방공현함염여추도석선설마길연위표명기반라왕금][가-힣]{1,2})(?:입니다|이에요|예요|라고|이라고)/g;
  
  const introMatches = [...text.matchAll(introPattern)];
  for (const match of introMatches) {
    const name = match[1];
    if (name && !FALSE_POSITIVE_WORDS.has(name)) {
      detectedNames.push(name);
    }
  }
  
  // Pattern 3: Names in header/metadata (medium confidence)
  // Only if on its own line after timestamp
  const headerPattern = /^\s*([김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민진나지엄채원천방공현함염여추도석선설마길연위표명기반라왕금][가-힣]{1,2})\s*$/gm;
  
  const headerMatches = [...text.matchAll(headerPattern)];
  for (const match of headerMatches) {
    const name = match[1];
    // Check if this appears after a date/time pattern
    if (name && match.index !== undefined) {
      const beforeMatch = text.substring(Math.max(0, match.index - 100), match.index);
      if (beforeMatch.match(/\d{4}\.\d{2}\.\d{2}|\d{1,2}분\s*\d{1,2}초/) && !FALSE_POSITIVE_WORDS.has(name)) {
        detectedNames.push(name);
      }
    }
  }
  
  return [...new Set(detectedNames)];
}

// Detect addresses with validation
function detectAddressesStrict(text: string): string[] {
  const addresses: string[] = [];
  
  // More specific address pattern
  const addressPattern = /(?:서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)\s+[가-힣]+(?:시|군|구)\s+[가-힣]+(?:읍|면|동|로|길)(?:\s+\d+(?:-\d+)?)?/g;
  
  const matches = [...text.matchAll(addressPattern)];
  for (const match of matches) {
    addresses.push(match[0]);
  }
  
  return addresses;
}

export interface RefinedMaskingResult {
  maskedText: string;
  detectedCount: Record<string, number>;
  processingTime: number;
  confidence: {
    high: number;
    total: number;
  };
}

export function maskSensitiveDataRefined(text: string): RefinedMaskingResult {
  const startTime = Date.now();
  let maskedText = text;
  const detectedCount: Record<string, number> = {};
  let highConfidenceCount = 0;
  let totalCount = 0;
  
  // Apply high-confidence patterns first
  Object.entries(REFINED_PATTERNS).forEach(([key, pattern]) => {
    const matches = [...maskedText.matchAll(pattern)];
    if (matches.length > 0) {
      detectedCount[key] = matches.length;
      highConfidenceCount += matches.length;
      totalCount += matches.length;
      
      // Replace matches
      matches.forEach(match => {
        const replacement = key === 'EMAIL' ? '[이메일]' :
                          key === 'PHONE' ? '[전화번호]' :
                          key === 'RRN' ? '[주민등록번호]' :
                          key === 'CARD' ? '[카드번호]' :
                          key === 'COMPANY_REG' ? '[사업자번호]' :
                          '[개인정보]';
        
        maskedText = maskedText.replace(match[0], replacement);
      });
    }
  });
  
  // Detect and mask Korean names with strict validation
  const detectedNames = detectKoreanNamesStrict(maskedText);
  if (detectedNames.length > 0) {
    detectedCount['KOREAN_NAME'] = detectedNames.length;
    highConfidenceCount += detectedNames.length;
    totalCount += detectedNames.length;
    
    // Sort by length (longest first) to avoid partial replacements
    detectedNames.sort((a, b) => b.length - a.length);
    
    detectedNames.forEach(name => {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      maskedText = maskedText.replace(new RegExp(escapedName, 'g'), '[이름]');
    });
  }
  
  // Detect and mask addresses
  const addresses = detectAddressesStrict(maskedText);
  if (addresses.length > 0) {
    detectedCount['ADDRESS'] = addresses.length;
    highConfidenceCount += addresses.length;
    totalCount += addresses.length;
    
    addresses.forEach(address => {
      const escapedAddress = address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      maskedText = maskedText.replace(new RegExp(escapedAddress, 'g'), '[주소]');
    });
  }
  
  const processingTime = Date.now() - startTime;
  
  return {
    maskedText,
    detectedCount,
    processingTime,
    confidence: {
      high: highConfidenceCount,
      total: totalCount
    }
  };
}

// Test the refined masking
export function testRefinedMasking() {
  const testCases = [
    {
      name: "Interview with participant labels",
      text: `참가자 1 00:00
안녕하세요. 저는 김철수입니다.

참가자 2 00:10
네, 저는 이영희 과장입니다. 반갑습니다.`
    },
    {
      name: "Text with false positives",
      text: `회사 이름은 GS차지비입니다. 
이름상으로는 충전 서비스를 제공합니다.
이미지 파일을 업로드해주세요.`
    },
    {
      name: "Real PII",
      text: `연락처: 010-1234-5678
이메일: test@example.com
주소: 서울특별시 강남구 테헤란로 123`
    }
  ];
  
  testCases.forEach(({ name, text }) => {
    console.log(`\n--- ${name} ---`);
    const result = maskSensitiveDataRefined(text);
    console.log('Original:\n', text);
    console.log('\nMasked:\n', result.maskedText);
    console.log('\nDetected:', result.detectedCount);
    console.log('Confidence:', result.confidence);
    console.log('Processing time:', result.processingTime + 'ms');
  });
}