# Dark 모드 제거 계획서

## 현재 상태 분석

### 1. Dark 모드 구현 현황

#### 1.1 패키지 의존성
- `next-themes` (v0.4.4) - 테마 관리 라이브러리
- 관련 파일:
  - `/components/shared/theme-provider.tsx` - 테마 프로바이더 컴포넌트
  - `/components/shared/mode-toggle.tsx` - 테마 토글 버튼 컴포넌트

#### 1.2 Tailwind 설정
- `tailwind.config.ts`:
  - `darkMode: ["class"]` 설정으로 클래스 기반 다크 모드 활성화
  - 모든 색상 변수가 CSS 변수로 정의됨

#### 1.3 CSS 변수 정의
- `app/globals.css`:
  - `:root` - 라이트 모드 변수 (622-655줄)
  - `.dark` - 다크 모드 변수 (656-690줄)
  - 각 변수: `--background`, `--foreground`, `--card`, `--primary` 등

### 2. Dark 모드 사용 현황

#### 2.1 직접적인 dark: 클래스 사용 (17개 파일)
- Navigation 컴포넌트들
- Chat 관련 컴포넌트들  
- UI 컴포넌트들 (alert, chart 등)
- 페르소나 관련 컴포넌트들

#### 2.2 .dark 셀렉터 사용 (globals.css)
- 토스트 스타일 (109-137줄)
- 스크롤바 스타일 (200-210줄, 247-257줄)
- 배경 그리드 패턴 (614-618줄)
- 글로우 효과 (597-604줄)

#### 2.3 useTheme 훅 사용
- `persona-card.tsx` - 테마 상태에 따른 조건부 렌더링

## 제거 계획

### Phase 1: 준비 작업
1. 모든 dark 모드 관련 코드 위치 파악 (완료)
2. 영향받는 컴포넌트 목록 작성 (완료)
3. 백업 브랜치 생성

### Phase 2: CSS 변수 통합
1. `.dark` 클래스의 CSS 변수 값 분석
2. 라이트 모드 값으로 통일할지, 새로운 디자인 시스템 구축할지 결정
3. 필요시 새로운 색상 팔레트 정의

### Phase 3: 코드 제거 작업

#### 3.1 Tailwind 설정 수정
```typescript
// tailwind.config.ts
const config: Config = {
    // darkMode: ["class"], // 이 줄 제거
    content: [
        // ...
    ],
    // ...
}
```

#### 3.2 CSS 변수 정리
- `.dark` 클래스 블록 전체 제거 (656-690줄)
- `.dark` 관련 모든 스타일 제거:
  - 토스트 다크 모드 스타일
  - 스크롤바 다크 모드 스타일
  - 배경 패턴 다크 모드 스타일

#### 3.3 컴포넌트 수정
각 컴포넌트에서 `dark:` 프리픽스 제거:
```tsx
// Before
className="text-gray-600 dark:text-gray-400"

// After  
className="text-gray-600"
```

#### 3.4 테마 관련 컴포넌트 제거
1. `ModeToggle` 컴포넌트 제거
2. `ThemeProvider` 제거 및 `layout.tsx` 수정
3. `useTheme` 훅 사용 코드 제거

#### 3.5 패키지 제거
```bash
pnpm remove next-themes
```

### Phase 4: 테스트 및 검증
1. 모든 페이지 UI 확인
2. 컴포넌트 스타일 일관성 검증
3. 빌드 에러 확인
4. 런타임 에러 체크

### Phase 5: 정리 작업
1. 불필요한 import 제거
2. ESLint/Prettier 실행
3. 최종 테스트

## 예상 작업 시간
- 총 예상 시간: 4-6시간
- Phase 1-2: 1시간
- Phase 3: 2-3시간
- Phase 4-5: 1-2시간

## 주의사항
1. 일부 컴포넌트는 다크 모드에 최적화되어 있을 수 있으므로 라이트 모드에서 가독성 확인 필요
2. 사용자 경험에 영향을 줄 수 있으므로 단계적 제거 권장
3. 제거 전 팀원들과 디자인 방향성 논의 필요

## 대안 제안
Dark 모드를 완전히 제거하는 대신:
1. 시스템 설정 기반 자동 전환만 유지
2. 수동 토글 버튼만 제거
3. 단순화된 다크 모드 유지 (변수 수 감소)