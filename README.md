<div align="center">

![Persona Insight Banner](https://github.com/user-attachments/assets/persona-insight-banner.png)

# 🎭 Persona Insight

### **고객을 더 깊이 이해하는 AI 페르소나 분석 서비스**

*인터뷰 데이터를 지능형 페르소나로 변환하여 고객의 목소리를 생생하게 들어보세요*

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.io/)

---

*© 2025 Persona Insight by MISO*  
*GS 52g - Daisy, Kyle, Kade, Ian*

</div>

---

## 🌟 **왜 Persona Insight인가요?**

> **"고객을 이해하는 것이 성공적인 제품의 시작입니다."**

**Persona Insight**는 단순한 설문조사나 통계를 넘어서, **실제 고객의 목소리**를 AI를 통해 **살아있는 페르소나**를 만들어냅니다. 이제 가설이 아닌 **데이터에 기반한 고객 이해**로 더 나은 제품을 만들어보세요.

### 🎯 **이런 분들께 완벽해요**
- **💼 제품 기획자** - 사용자 니즈를 정확히 파악하고 싶은
- **🎨 UX 디자이너** - 실제 사용자 관점에서 디자인하고 싶은  
- **📊 리서처** - 인터뷰 데이터를 체계적으로 분석하고 싶은

---

## 🚀 **3분만에 시작하기**

### **📋 준비물 체크리스트**
- [ ] Node.js 18+ 설치됨
- [ ] pnpm 패키지 매니저 설치됨
- [ ] Supabase 계정 보유
- [ ] MISO API 액세스 권한

### **⚡ 초고속 설치 가이드**

```bash
# 🚀 1단계: 프로젝트 클론 (30초)
git clone https://github.com/your-org/persona-insight.git
cd persona-insight

# 📦 2단계: 패키지 설치 (2분)
pnpm install

# ⚙️ 3단계: 환경 설정 (30초)
cp .env.example .env.local
# 아래 환경 변수들을 설정해주세요

# 🎉 4단계: 개발 서버 실행 (즉시)
pnpm dev
```

### **🔧 환경 변수 설정하기**

<details>
<summary><strong>📝 환경 변수 상세 가이드 (클릭해서 펼치기)</strong></summary>

```env
# 🔹 Supabase 설정 (필수)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 🔹 MISO API 설정 (필수)
MISO_API_URL=https://api.holdings.miso.gs
MISO_API_KEY=your-miso-api-key-here

# 🔹 OpenAI 설정 (선택사항 - 추가 기능용)
OPENAI_API_KEY=sk-proj-...

# 🔹 기본 애플리케이션 설정
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=development
```

**💡 팁:** 
- Supabase 키는 [Supabase 대시보드](https://app.supabase.com) → 프로젝트 설정에서 확인
- MISO API 키는 MISO 담당자에게 문의
- 모든 키는 `.env.local` 파일에 안전하게 저장됩니다

</details>

### **✅ 설치 완료 확인하기**

브라우저에서 `http://localhost:3000`에 접속하시면 아래와 같은 화면을 보실 수 있습니다:

```
🎉 Persona Insight에 오신 것을 환영합니다!
👤 로그인/회원가입 버튼이 보이나요?
🎭 로고와 네비게이션이 제대로 표시되나요?
```

---

## 📁 **프로젝트 구조 한눈에 보기**

```
persona-insight/
├── 📁 app/                    # 🎯 Next.js 15 App Router (메인 앱)
│   ├── 📁 api/               # 🔌 RESTful API 엔드포인트
│   │   ├── chat/             # 💬 실시간 페르소나 대화 API
│   │   ├── personas/         # 🎭 페르소나 CRUD 및 AI 합성
│   │   ├── interviews/       # 🎤 인터뷰 파일 업로드 및 분석
│   │   ├── projects/         # 📋 프로젝트 및 팀 관리
│   │   └── workflow/         # ⚙️ AI 처리 파이프라인
│   ├── 📁 auth/              # 🔐 로그인/회원가입 페이지
│   ├── 📁 chat/              # 💬 페르소나 채팅 인터페이스
│   ├── 📁 projects/          # 📊 프로젝트 관리 대시보드
│   └── 📁 insights/          # 📈 분석 및 인사이트 대시보드
│
├── 📁 components/            # 🧩 재사용 가능한 React 컴포넌트
│   ├── auth/                 # 🔐 인증 관련 (로그인, 회원가입)
│   ├── persona/              # 🎭 페르소나 카드, 스위처 등
│   ├── project/              # 📋 프로젝트 관리 UI
│   ├── chat/                 # 💬 채팅 메시지, 입력창 등
│   ├── shared/               # 🔄 공통 컴포넌트 (네비게이션 등)
│   └── ui/                   # 🎨 shadcn/ui 디자인 시스템
│
├── 📁 hooks/                 # 🪝 커스텀 React 훅 (비즈니스 로직)
│   ├── use-auth.tsx          # 👤 사용자 인증 상태 관리
│   ├── use-personas.ts       # 🎭 페르소나 데이터 관리
│   ├── use-projects.ts       # 📋 프로젝트 데이터 관리
│   └── use-workflow-queue.ts # ⚙️ AI 처리 큐 관리
│
├── 📁 lib/                   # 🛠️ 핵심 유틸리티 및 설정
│   ├── api/                  # 🌐 API 클라이언트 함수들
│   ├── constants/            # ⚙️ 앱 전역 상수 관리
│   ├── errors/               # ❌ 에러 처리 시스템
│   └── utils/                # 🔧 헬퍼 함수들
│
├── 📁 types/                 # 📝 TypeScript 타입 정의
│   ├── api.ts                # 🔌 API 요청/응답 타입
│   ├── persona.ts            # 🎭 페르소나 관련 타입
│   └── database.ts           # 🗄️ 데이터베이스 스키마 타입
│
└── 📁 docs/                  # 📚 프로젝트 문서
    ├── api.md                # 🔌 API 사용법 가이드
    ├── deployment.md         # 🚀 배포 가이드
    └── 코드베이스_품질_보고서.md # 📊 코드 품질 분석
```

---

## 🚀 **배포 가이드**

### **☁️ Vercel 배포 (권장)**

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인 및 배포
vercel login
vercel

# 프로덕션 배포
vercel --prod
```

**환경 변수 설정**: Vercel 대시보드에서 모든 필수 환경 변수를 설정해주세요.

---

<div align="center">

## **🎭 Persona Insight와 함께 우리의 고객을 만나보세요!**

### **❤️ Made with Love by MISO GS 52g **

*"고객을 이해하는 것에서 혁신이 시작됩니다."*

</div>