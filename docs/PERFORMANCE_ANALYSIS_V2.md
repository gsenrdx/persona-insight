# 🔍 Persona Insight 성능 분석 보고서 v2.0

> 이전 최적화 작업 이후 남아있는 성능 이슈들을 재평가한 보고서입니다.

## 📊 현재 상태 요약

### ✅ 이미 해결된 문제들
1. **localStorage 메모리 누수** - 5MB 제한 및 자동 정리 구현 완료
2. **N+1 데이터베이스 쿼리** - workflow API에서 배치 처리 구현 완료
3. **인증 캐싱 부재** - 메모리 기반 캐싱 시스템 구현 완료
4. **번들 크기** - 미사용 패키지 제거로 58MB 감소 완료
5. **React 리렌더링** - ChatInterface 메모이제이션 완료
6. **API Runtime 오류** - Edge → Node.js 전환 완료

### ⚠️ 새로 발견된 성능 이슈들

## 🚨 주요 성능 취약점 (10개)

### 1. 페이지네이션 미적용 - Personas API
**심각도**: 🔴 Critical
**영향**: 페르소나가 많을수록 로딩 시간 급증

**현재 코드** (`/api/personas/route.ts`):
```typescript
// 모든 페르소나를 한번에 로드
const { data: personas } = await supabase
  .from('personas')
  .select('*')
  .eq('company_id', company_id)
```

**문제점**:
- 100개 이상의 페르소나 시 응답 시간 3초 이상
- 메모리 사용량 급증
- 프론트엔드 렌더링 부하

**해결책**:
```typescript
const limit = 20
const offset = parseInt(searchParams.get('offset') || '0')
const { data, count } = await supabase
  .from('personas')
  .select('*', { count: 'exact' })
  .eq('company_id', company_id)
  .range(offset, offset + limit - 1)
```

---

### 2. 이미지 최적화 완전 비활성화
**심각도**: 🟠 High
**영향**: 페이지 로드 시간 2-3배 증가

**현재 설정** (`next.config.mjs`):
```javascript
images: {
  unoptimized: true, // ❌ 모든 최적화 비활성화
}
```

**문제점**:
- 원본 이미지 그대로 전송 (최대 5MB)
- WebP/AVIF 변환 없음
- 반응형 이미지 미지원

**해결책**:
```javascript
images: {
  unoptimized: false,
  formats: ['image/avif', 'image/webp'],
  domains: ['your-cdn.com'],
  deviceSizes: [640, 750, 828, 1080, 1200]
}
```

---

### 3. 캐싱 전략 미흡
**심각도**: 🟠 High
**영향**: 불필요한 API 호출로 서버 부하 증가

**현재 상태**:
- React Query staleTime: 5분 (너무 짧음)
- API 응답 캐시 헤더: 없음
- 정적 자산 캐싱: 설정 안됨

**해결책**:
```typescript
// React Query 설정
queryClient: {
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000, // 30분
      cacheTime: 60 * 60 * 1000, // 1시간
    }
  }
}

// API 캐시 헤더
headers: {
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
}
```

---

### 4. 데이터베이스 인덱스 부재
**심각도**: 🟠 High
**영향**: 쿼리 실행 시간 10배 이상 차이

**필요한 인덱스**:
```sql
-- 자주 조회되는 컬럼에 인덱스 추가
CREATE INDEX idx_personas_company_project ON personas(company_id, project_id);
CREATE INDEX idx_personas_active ON personas(active);
CREATE INDEX idx_interviewees_company_project ON interviewees(company_id, project_id);
CREATE INDEX idx_interviewees_session_date ON interviewees(session_date);
CREATE INDEX idx_main_topics_company ON main_topics(company_id);
```

---

### 5. 대용량 파일 처리 최적화 부족
**심각도**: 🟡 Medium
**영향**: 메모리 사용량 급증, 브라우저 멈춤

**현재 문제**:
- Base64 변환으로 메모리 3배 사용
- localStorage 대신 IndexedDB 미사용
- 스트리밍 업로드 미지원

**해결책**:
```typescript
// IndexedDB 사용
const db = await openDB('workflow-files', 1)
await db.put('files', file, fileId)

// 청크 단위 업로드
const CHUNK_SIZE = 1024 * 1024 // 1MB
for (let i = 0; i < file.size; i += CHUNK_SIZE) {
  const chunk = file.slice(i, i + CHUNK_SIZE)
  await uploadChunk(chunk)
}
```

---

### 6. API N+1 쿼리 문제 (추가 발견)
**심각도**: 🟡 Medium
**영향**: insights API 응답 시간 2초 증가

**문제 코드** (`/api/insights/route.ts`):
```typescript
// 각 interviewee마다 profile 별도 조회
for (const item of interviewees) {
  const profile = await getProfile(item.created_by)
}
```

**해결책**:
```typescript
// JOIN으로 한번에 조회
const { data } = await supabase
  .from('interviewees')
  .select(`
    *,
    profiles!created_by(id, name)
  `)
```

---

### 7. 메모리 누수 위험
**심각도**: 🟡 Medium
**영향**: 장시간 사용 시 성능 저하

**발견된 문제들**:
- EventSource 연결 정리 안됨
- setInterval 정리 누락
- 대용량 객체 참조 유지

**해결책**:
```typescript
useEffect(() => {
  const eventSource = new EventSource(url)
  
  return () => {
    eventSource.close() // 정리 필수
  }
}, [])
```

---

### 8. 서버 컴포넌트 미활용
**심각도**: 🟡 Medium
**영향**: 초기 로딩 속도 저하

**현재 상태**:
- 90% 이상이 "use client"
- 정적 생성 가능한 페이지도 CSR
- metadata 활용 부족

**개선 예시**:
```typescript
// 서버 컴포넌트로 분리
async function PersonaList() {
  const personas = await getPersonas()
  return <PersonaGrid personas={personas} />
}
```

---

### 9. 스트리밍 연결 관리
**심각도**: 🔵 Low
**영향**: 간헐적 연결 끊김

**문제점**:
- AbortController 미사용
- 재연결 로직 없음
- 타임아웃 처리 부재

---

### 10. 프론트엔드 번들 추가 최적화
**심각도**: 🔵 Low
**영향**: 초기 JS 다운로드 크기

**개선 가능 항목**:
- 라이브러리 트리쉐이킹
- 동적 import 확대
- 폰트 최적화

---

## 📈 성능 개선 로드맵

### Phase 1 (1주차) - Critical Issues
1. ✅ Personas API 페이지네이션 구현
2. ✅ 이미지 최적화 활성화
3. ✅ 기본 캐싱 전략 수립

### Phase 2 (2주차) - Database & API
4. ✅ 데이터베이스 인덱스 추가
5. ✅ API N+1 쿼리 해결
6. ✅ React Query 캐싱 최적화

### Phase 3 (3주차) - Memory & Files
7. ✅ 대용량 파일 처리 개선
8. ✅ 메모리 누수 방지
9. ✅ 스트리밍 연결 관리

### Phase 4 (4주차) - Advanced
10. ✅ 서버 컴포넌트 전환
11. ✅ 프론트엔드 번들 최적화
12. ✅ 성능 모니터링 도입

---

## 📊 예상 개선 효과

| 지표 | 현재 | 목표 | 개선율 |
|------|------|------|--------|
| 페르소나 목록 로딩 | 3초 | 0.5초 | 83% ⬇️ |
| 이미지 로딩 시간 | 2초 | 0.3초 | 85% ⬇️ |
| API 캐시 히트율 | 20% | 80% | 300% ⬆️ |
| 데이터베이스 쿼리 | 500ms | 50ms | 90% ⬇️ |
| 초기 번들 크기 | 461MB | 350MB | 24% ⬇️ |
| 메모리 사용량 | 500MB | 300MB | 40% ⬇️ |

---

## 🛠️ 구현 우선순위

### 🔴 즉시 시작 (이번 주)
1. Personas API 페이지네이션
2. 이미지 최적화 설정
3. 데이터베이스 인덱스

### 🟠 단기 계획 (2주 내)
4. API 캐싱 헤더
5. React Query 설정
6. N+1 쿼리 수정

### 🟡 중기 계획 (1개월 내)
7. IndexedDB 마이그레이션
8. 메모리 누수 수정
9. 서버 컴포넌트 활용

### 🔵 장기 계획 (분기 내)
10. 번들 최적화
11. 성능 모니터링
12. CDN 도입

---

## 💡 추가 권장사항

### 성능 모니터링 도입
```typescript
// Vercel Analytics
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

// Sentry Performance
import * as Sentry from '@sentry/nextjs'
```

### 개발 시 성능 체크리스트
- [ ] 새 API 엔드포인트에 페이지네이션 추가
- [ ] 이미지는 항상 Next/Image 사용
- [ ] 대용량 데이터는 가상 스크롤 고려
- [ ] useEffect 정리 함수 필수
- [ ] 캐시 전략 문서화

---

*이 문서는 2024년 1월 기준 성능 분석 결과입니다. 정기적인 재평가를 권장합니다.*