<div align="center">

![Persona Insight Banner](./public/GitHub_README.png)

# 🎭 Persona Insight

### **AI 기반 고객 페르소나 분석 플랫폼**

*인터뷰 데이터로 실제 고객의 목소리를 듣고 대화하세요*

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.io/)

---

*© 2025 Persona Insight by MISO*  
*GS 52g - Daisy, Kyle, Kade, Ian*

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

| 기능 | 설명 |
|------|------|
| 🎤 **인터뷰 분석** | 음성/영상/텍스트 파일 자동 처리, MISO API 기반 AI 분석 |
| 🎭 **페르소나 생성** | 인터뷰 데이터 기반 자동 생성, 2D 매트릭스 분류 시스템 |
| 💬 **실시간 대화** | 페르소나와 자연스러운 대화, 스트리밍 응답 지원 |
| 📊 **인사이트 대시보드** | 시간별 트렌드 분석, 토픽 자동 분류, 팀 협업 지원 |

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
MISO_API_URL=https://api.holdings.miso.gs
MISO_API_KEY=your-miso-api-key-here

# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
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
│   │   ├── personas/         # 페르소나 관리
│   │   ├── interviews/       # 인터뷰 처리
│   │   ├── projects/         # 프로젝트 관리
│   │   └── workflow/         # AI 처리 파이프라인
│   ├── auth/                 # 인증 페이지
│   ├── chat/                 # 채팅 인터페이스
│   ├── projects/             # 프로젝트 대시보드
│   └── insights/             # 인사이트 대시보드
│
├── components/               # React 컴포넌트
│   ├── auth/                 # 인증 관련
│   ├── persona/              # 페르소나 UI
│   ├── project/              # 프로젝트 관리
│   ├── chat/                 # 채팅 UI
│   ├── shared/               # 공통 컴포넌트
│   └── ui/                   # shadcn/ui 디자인 시스템
│
├── hooks/                    # 커스텀 React 훅
│   ├── use-auth.tsx          # 인증 상태
│   ├── use-personas.ts       # 페르소나 데이터
│   ├── use-projects.ts       # 프로젝트 데이터
│   └── use-workflow-queue.ts # 작업 큐 관리
│
├── lib/                      # 핵심 유틸리티
│   ├── api/                  # API 클라이언트
│   ├── constants/            # 상수 관리
│   ├── errors/               # 에러 처리
│   └── utils/                # 헬퍼 함수
│
└── types/                    # TypeScript 타입
    ├── api.ts                # API 타입
    ├── persona.ts            # 페르소나 타입
    └── database.ts           # DB 스키마 타입
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

*"고객을 이해하는 것에서 혁신이 시작됩니다."*

</div>