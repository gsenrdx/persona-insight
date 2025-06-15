<div align="center">

![Persona Insight Banner](./public/GitHub_README.png)

# 🎭 Persona Insight

### **AI 기반 고객 페르소나 분석 플랫폼**

_인터뷰 데이터로 실제 고객의 목소리를 듣고 대화하세요_

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.io/)

---

_© 2025 Persona Insight by MISO_  
_GS 52g - Daisy, Kyle, Kade, Ian_

</div>

---

## 🌟 **핵심 가치**

> **"고객을 이해하는 것이 성공적인 제품의 시작입니다."**

**Persona Insight**는 인터뷰 데이터를 AI로 분석하여 **실제 고객의 목소리**를 담은 페르소나를 생성합니다. 가설이 아닌 **데이터 기반 고객 이해**로 더 나은 제품을 만드세요.

### 🎯 **적합한 사용자**

- **💼 제품 기획자** - 정확한 사용자 니즈 파악
- **🎨 UX 디자이너** - 실제 사용자 관점 반영
- **📊 리서처** - 체계적인 인터뷰 데이터 분석

---

## ✨ **주요 기능**

### 🎤 **인터뷰 업로드만 하면 끝**

파일을 드래그하면 AI가 자동으로 분석합니다. STT(speech-to-text) 변환본 형태의 인터뷰 데이터를 지원합니다.

### 🎭 **데이터가 살아있는 페르소나로**

분석 결과를 바탕으로 실제 고객처럼 행동하는 페르소나를 자동 생성합니다. 각 페르소나는 고유한 성격과 니즈를 가집니다.

### 💬 **페르소나와 직접 대화하기**

생성된 페르소나와 실시간으로 대화할 수 있습니다. 제품 아이디어를 검증하거나 사용자 피드백을 받아보세요.

### 🧠 **대화 요약 및 마인드맵 생성**

페르소나와의 대화 내용을 AI가 분석하여 핵심 인사이트를 마인드맵 형태로 시각화합니다.

### 📊 **한눈에 보는 고객 인사이트**

모든 페르소나의 데이터를 종합하여 트렌드와 패턴을 시각화합니다. 키워드 분석, 시계열 트렌드, 핵심 인용구를 통해 깊이 있는 인사이트를 발견하세요.

### 🔍 **페르소나 검색** _(준비중)_

다양한 조건으로 페르소나를 검색하고 필터링할 수 있는 기능이 곧 추가됩니다.

---

## 🏗️ **기술 스택**

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI/UX**: shadcn/ui, Radix UI, Framer Motion
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (Supabase)
- **AI**: MISO API
- **State**: TanStack Query

---

## 🚀 **빠른 시작**

### **필수 요구사항**

- Node.js 18+
- pnpm
- Supabase 계정
- MISO API 키

### **설치 및 실행**

```bash
# 1. 프로젝트 클론
git clone https://github.com/your-org/persona-insight.git
cd persona-insight

# 2. 패키지 설치
pnpm install

# 3. 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 열어서 필요한 값들을 설정하세요

# 4. 개발 서버 실행
pnpm dev
```

### **환경 변수 설정**

```env
# Miso API 설정
# MISO 서비스와 연동하기 위한 API URL입니다.
MISO_API_URL=https://api.holdings.miso.gs
# MISO 서비스와 연동하기 위한 API 키입니다. MISO 플랫폼의 API 설정에서 발급받아 여기에 입력하세요. 이 키가 없으면 AI 기능이 작동하지 않습니다.
MISO_API_KEY=your-miso-api-key-here
# MISO Agent 서비스와 연동하기 위한 API 키입니다. 페르소나와의 대화 기능에 사용됩니다.
MISO_AGENT_API_KEY=your-miso-agent-api-key-here

# Supabase 설정
# Supabase 프로젝트 URL입니다. Supabase 대시보드의 프로젝트 설정에서 확인할 수 있습니다.
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# Supabase 프로젝트의 익명 키(anon key)입니다. Supabase 대시보드의 API 설정에서 확인할 수 있습니다.
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
# Supabase 프로젝트의 서비스 역할 키(service role key)입니다. Supabase 대시보드의 API 설정에서 확인할 수 있습니다. **이 키는 클라이언트에 노출되어서는 안 됩니다.**
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**접속 확인**: `http://localhost:3000`에서 로그인 화면이 나타나면 성공!

---

## 📁 **프로젝트 구조**

```
persona-insight/
├── app/                      # Next.js 15 App Router
│   ├── api/                  # API 엔드포인트
│   │   ├── chat/             # 페르소나 대화
│   │   │   └── summary/      # 대화 요약 및 마인드맵
│   │   ├── personas/         # 페르소나 관리
│   │   │   ├── criteria/     # 분류 기준 관리
│   │   │   ├── search/       # 페르소나 검색
│   │   │   ├── sync/         # 페르소나 동기화
│   │   │   └── synthesis/    # AI 페르소나 생성
│   │   ├── interviews/       # 인터뷰 처리
│   │   │   └── [id]/         # 개별 인터뷰 조회
│   │   ├── projects/         # 프로젝트 관리
│   │   │   ├── [id]/         # 개별 프로젝트
│   │   │   │   └── members/  # 멤버 관리
│   │   │   └── members/      # 멤버 목록
│   │   ├── insights/         # 인사이트 분석
│   │   │   └── years/        # 연도별 인사이트
│   │   ├── files/            # 파일 관리
│   │   │   └── download/     # 파일 다운로드
│   │   └── workflow/         # AI 처리 파이프라인
│   ├── auth/                 # 인증 관련 페이지
│   │   ├── callback/         # OAuth 콜백
│   │   └── confirm/          # 이메일 확인
│   ├── chat/                 # 채팅 인터페이스
│   │   └── [personaId]/      # 개별 페르소나 채팅
│   ├── login/                # 로그인 페이지
│   ├── projects/             # 프로젝트 대시보드
│   │   └── [id]/             # 프로젝트 상세
│   └── insights/             # 인사이트 대시보드
│
├── components/               # React 컴포넌트
│   ├── auth/                 # 인증 관련
│   ├── chat/                 # 채팅 UI
│   │   └── summary/          # 요약 기능
│   ├── modal/                # 모달 컴포넌트
│   ├── persona/              # 페르소나 UI
│   ├── project/              # 프로젝트 관리
│   ├── providers/            # React 프로바이더
│   ├── search/               # 검색 기능
│   ├── shared/               # 공통 컴포넌트
│   └── ui/                   # shadcn/ui 디자인 시스템
│
├── hooks/                    # 커스텀 React 훅
├── lib/                      # 핵심 유틸리티
│   ├── api/                  # API 클라이언트
│   ├── constants/            # 상수 관리
│   ├── data/                 # 데이터 처리
│   ├── errors/               # 에러 처리
│   └── utils/                # 헬퍼 함수
│
├── types/                    # TypeScript 타입 정의
│
├── docs/                     # 문서
│   └── miso/                 # MISO API 가이드
│
├── public/                   # 정적 파일
└── styles/                   # 전역 스타일
```

### **아키텍처 특징**

- **도메인 중심 설계**: 기능별 명확한 분리
- **컴포넌트 재사용성**: 일관된 디자인 시스템
- **비즈니스 로직 분리**: 커스텀 훅 활용
- **타입 안전성**: 포괄적인 TypeScript 지원

---

## 🛠️ **개발 명령어**

```bash
# 개발 서버
pnpm dev

# 빌드
pnpm build

# 프로덕션 서버
pnpm start

# 코드 검사
pnpm lint
```

---

## 🚀 **배포**

### **Vercel (권장)**

```bash
npm i -g vercel
vercel login
vercel --prod
```

환경 변수는 Vercel 대시보드에서 설정하세요.

---

<div align="center">

## **🎭 더 나은 고객 이해의 시작**

_"고객을 이해하는 것에서 혁신이 시작됩니다."_

</div>
