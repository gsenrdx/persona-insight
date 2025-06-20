/**
 * 인증 정보 캐싱 유틸리티
 * 성능 최적화: 매 요청마다 DB 조회 대신 메모리 캐시 사용
 */

import { createClient } from '@supabase/supabase-js'

// 캐시 설정
const CACHE_TTL = 5 * 60 * 1000; // 5분 캐시
const MAX_CACHE_SIZE = 1000; // 최대 1000개 사용자 캐시
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10분마다 정리

// 사용자 정보 타입
export interface CachedUserProfile {
  userId: string;
  companyId: string;
  userName: string;
  companyName: string;
  companyInfo: string;
  cachedAt: number;
}

// 메모리 캐시 저장소
const userProfileCache = new Map<string, CachedUserProfile>();
const lastAccessTime = new Map<string, number>();

// 정기적으로 캐시 정리
let cleanupTimer: NodeJS.Timeout | null = null;

const startCacheCleanup = () => {
  if (cleanupTimer) return;
  
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, cachedData] of userProfileCache.entries()) {
      // TTL 초과 또는 오래 사용되지 않은 항목 정리
      const lastAccess = lastAccessTime.get(key) || cachedData.cachedAt;
      if (now - cachedData.cachedAt > CACHE_TTL || now - lastAccess > CACHE_TTL * 2) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      userProfileCache.delete(key);
      lastAccessTime.delete(key);
    });
    
    // 캐시 크기 제한
    if (userProfileCache.size > MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(lastAccessTime.entries())
        .sort(([,a], [,b]) => a - b)
        .slice(0, userProfileCache.size - MAX_CACHE_SIZE);
      
      sortedEntries.forEach(([key]) => {
        userProfileCache.delete(key);
        lastAccessTime.delete(key);
      });
    }
    
    console.debug(`인증 캐시 정리 완료: ${userProfileCache.size}개 항목 유지`);
  }, CLEANUP_INTERVAL);
};

// 캐시 시작
startCacheCleanup();

/**
 * 토큰에서 사용자 ID 추출 (JWT 디코딩 없이 빠른 추출)
 */
function extractUserIdFromToken(token: string): string | null {
  try {
    // JWT의 payload 부분만 빠르게 디코딩
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

/**
 * 캐시 키 생성
 */
function generateCacheKey(userId: string, token: string): string {
  // 토큰의 마지막 8자리와 사용자 ID 조합으로 캐시 키 생성
  const tokenSuffix = token.slice(-8);
  return `${userId}:${tokenSuffix}`;
}

/**
 * 캐시에서 사용자 프로필 조회
 */
function getCachedProfile(cacheKey: string): CachedUserProfile | null {
  const cached = userProfileCache.get(cacheKey);
  if (!cached) return null;
  
  const now = Date.now();
  
  // TTL 확인
  if (now - cached.cachedAt > CACHE_TTL) {
    userProfileCache.delete(cacheKey);
    lastAccessTime.delete(cacheKey);
    return null;
  }
  
  // 접근 시간 업데이트
  lastAccessTime.set(cacheKey, now);
  return cached;
}

/**
 * 캐시에 사용자 프로필 저장
 */
function setCachedProfile(cacheKey: string, profile: CachedUserProfile): void {
  const now = Date.now();
  userProfileCache.set(cacheKey, { ...profile, cachedAt: now });
  lastAccessTime.set(cacheKey, now);
}

/**
 * 인증 정보 추출 및 캐싱 (성능 최적화)
 */
export async function getAuthenticatedUserProfile(
  authorization: string,
  supabase: any
): Promise<CachedUserProfile> {
  const token = authorization.replace('Bearer ', '');
  
  // 1. 토큰에서 사용자 ID 빠르게 추출
  const userId = extractUserIdFromToken(token);
  if (!userId) {
    throw new Error('유효하지 않은 토큰입니다.');
  }
  
  // 2. 캐시 확인
  const cacheKey = generateCacheKey(userId, token);
  const cachedProfile = getCachedProfile(cacheKey);
  
  if (cachedProfile) {
    console.debug(`인증 캐시 적중: ${userId}`);
    return cachedProfile;
  }
  
  console.debug(`인증 캐시 미스: ${userId} - DB 조회 시작`);
  
  // 3. 캐시 미스 시 DB에서 조회
  try {
    // JWT 검증
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user || user.id !== userId) {
      throw new Error('인증에 실패했습니다.');
    }

    // 프로필 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        company_id,
        name,
        company:companies(
          id,
          name,
          description
        )
      `)
      .eq('id', userId)
      .single();

    if (profileError || !profile?.company_id || !profile?.company) {
      throw new Error('사용자 정보를 찾을 수 없습니다.');
    }

    // 4. 결과 가공 및 캐시 저장
    const company = Array.isArray(profile.company) ? profile.company[0] : profile.company;
    
    const userProfile: CachedUserProfile = {
      userId,
      companyId: profile.company_id,
      userName: profile.name || '',
      companyName: company?.name || '',
      companyInfo: company?.description || '',
      cachedAt: Date.now()
    };
    
    setCachedProfile(cacheKey, userProfile);
    console.debug(`인증 정보 캐시됨: ${userId}`);
    
    return userProfile;
    
  } catch (error) {
    console.error('인증 처리 중 오류:', error);
    throw error;
  }
}

/**
 * 특정 사용자의 캐시 무효화
 */
export function invalidateUserCache(userId: string): void {
  const keysToDelete: string[] = [];
  
  for (const key of userProfileCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => {
    userProfileCache.delete(key);
    lastAccessTime.delete(key);
  });
  
  console.debug(`사용자 캐시 무효화: ${userId} (${keysToDelete.length}개 항목)`);
}

/**
 * 전체 캐시 초기화
 */
export function clearAuthCache(): void {
  userProfileCache.clear();
  lastAccessTime.clear();
  console.info('인증 캐시 전체 초기화');
}

/**
 * 캐시 통계 조회
 */
export function getAuthCacheStats() {
  return {
    size: userProfileCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL,
    cleanupInterval: CLEANUP_INTERVAL
  };
}

// 프로세스 종료 시 타이머 정리
process.on('exit', () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
  }
});