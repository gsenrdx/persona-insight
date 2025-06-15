/**
 * 환경 변수 타입 정의
 * 
 * TypeScript 타입 안정성과 자동완성을 제공합니다.
 */

declare namespace NodeJS {
  interface ProcessEnv {
    // System
    NODE_ENV: 'development' | 'production' | 'test'

    // Next.js Public (client-accessible)
    NEXT_PUBLIC_SUPABASE_URL: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string
    NEXT_PUBLIC_BASE_URL?: string

    // Private (server-only)
    SUPABASE_SERVICE_ROLE_KEY: string
    MISO_API_KEY: string
    MISO_API_URL?: string
  }
}

// TypeScript에서 전역 타입이 인식되도록 export 추가
export {}