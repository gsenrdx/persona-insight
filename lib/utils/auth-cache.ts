/**
 * 인증 정보 캐싱 유틸리티 - DB 조회 최소화
 */


const CACHE_TTL = 5 * 60 * 1000; // 5분
const MAX_CACHE_SIZE = 1000;
const CLEANUP_INTERVAL = 10 * 60 * 1000;

export interface CachedUserProfile {
  userId: string;
  companyId: string;
  userName: string;
  companyName: string;
  companyInfo: string;
  cachedAt: number;
}

const userProfileCache = new Map<string, CachedUserProfile>();
const lastAccessTime = new Map<string, number>();

let cleanupTimer: NodeJS.Timeout | null = null;

const startCacheCleanup = () => {
  if (cleanupTimer) return;
  
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, cachedData] of userProfileCache.entries()) {
      const lastAccess = lastAccessTime.get(key) || cachedData.cachedAt;
      if (now - cachedData.cachedAt > CACHE_TTL || now - lastAccess > CACHE_TTL * 2) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      userProfileCache.delete(key);
      lastAccessTime.delete(key);
    });
    
    if (userProfileCache.size > MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(lastAccessTime.entries())
        .sort(([,a], [,b]) => a - b)
        .slice(0, userProfileCache.size - MAX_CACHE_SIZE);
      
      sortedEntries.forEach(([key]) => {
        userProfileCache.delete(key);
        lastAccessTime.delete(key);
      });
    }
    
  }, CLEANUP_INTERVAL);
};

startCacheCleanup();

// 프로세스 종료 시 메모리 정리
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
    userProfileCache.clear();
    lastAccessTime.clear();
  });
}

// JWT payload에서 사용자 ID 추출
function extractUserIdFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1] || ''));
    return payload.sub || null;
  } catch {
    return null;
  }
}

function generateCacheKey(userId: string, token: string): string {
  const tokenSuffix = token.slice(-8);
  return `${userId}:${tokenSuffix}`;
}

function getCachedProfile(cacheKey: string): CachedUserProfile | null {
  const cached = userProfileCache.get(cacheKey);
  if (!cached) return null;
  
  const now = Date.now();
  
  if (now - cached.cachedAt > CACHE_TTL) {
    userProfileCache.delete(cacheKey);
    lastAccessTime.delete(cacheKey);
    return null;
  }
  
  lastAccessTime.set(cacheKey, now);
  return cached;
}

function setCachedProfile(cacheKey: string, profile: CachedUserProfile): void {
  const now = Date.now();
  userProfileCache.set(cacheKey, { ...profile, cachedAt: now });
  lastAccessTime.set(cacheKey, now);
}

/**
 * 인증 정보 추출 및 캐싱
 */
export async function getAuthenticatedUserProfile(
  authorization: string,
  supabase: any
): Promise<CachedUserProfile> {
  const token = authorization.replace('Bearer ', '');
  
  const userId = extractUserIdFromToken(token);
  if (!userId) {
    throw new Error('유효하지 않은 토큰입니다.');
  }
  
  const cacheKey = generateCacheKey(userId, token);
  const cachedProfile = getCachedProfile(cacheKey);
  
  if (cachedProfile) {
    return cachedProfile;
  }
  
  // 캐시 미스 시 DB 조회
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user || user.id !== userId) {
      throw new Error('인증에 실패했습니다.');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        company_id,
        name,
        role,
        company:companies(
          id,
          name,
          description
        )
      `)
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('사용자 정보를 찾을 수 없습니다.');
    }

    // super_admin의 경우 company 정보가 없어도 허용
    if (profile.role !== 'super_admin' && (!profile.company_id || !profile.company)) {
      throw new Error('사용자의 회사 정보를 찾을 수 없습니다.');
    }

    const company = Array.isArray(profile.company) ? profile.company[0] : profile.company;
    
    const userProfile: CachedUserProfile = {
      userId,
      companyId: profile.company_id || 'system', // super_admin은 'system'으로 설정
      userName: profile.name || '',
      companyName: company?.name || 'System Admin',
      companyInfo: company?.description || 'System Administration',
      cachedAt: Date.now()
    };
    
    setCachedProfile(cacheKey, userProfile);
    return userProfile;
    
  } catch (error) {
    throw error;
  }
}

// 특정 사용자의 캐시 무효화
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
  
}

export function clearAuthCache(): void {
  userProfileCache.clear();
  lastAccessTime.clear();
}

export function getAuthCacheStats() {
  return {
    size: userProfileCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL,
    cleanupInterval: CLEANUP_INTERVAL
  };
}

process.on('exit', () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
  }
});