import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAuthenticatedUserProfile,
  invalidateUserCache,
  clearAuthCache,
  getAuthCacheStats,
  type CachedUserProfile
} from '../auth-cache';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
};

// Helper to create a valid JWT token
function createMockToken(userId: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: userId, exp: Date.now() + 3600000 }));
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
}

describe('Auth Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAuthCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('JWT Token Extraction', () => {
    it('should extract user ID from valid JWT token', async () => {
      const userId = 'test-user-123';
      const token = createMockToken(userId);
      
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: userId } },
        error: null
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                company_id: 'company-123',
                name: 'Test User',
                company: {
                  id: 'company-123',
                  name: 'Test Company',
                  description: 'Test Description'
                }
              },
              error: null
            })
          })
        })
      });

      const result = await getAuthenticatedUserProfile(`Bearer ${token}`, mockSupabase);
      
      expect(result.userId).toBe(userId);
      expect(result.userName).toBe('Test User');
      expect(result.companyName).toBe('Test Company');
    });

    it('should throw error for invalid JWT token', async () => {
      const invalidToken = 'invalid-token';
      
      await expect(
        getAuthenticatedUserProfile(`Bearer ${invalidToken}`, mockSupabase)
      ).rejects.toThrow('유효하지 않은 토큰입니다.');
    });

    it('should throw error for malformed JWT token', async () => {
      const malformedToken = 'header.payload';
      
      await expect(
        getAuthenticatedUserProfile(`Bearer ${malformedToken}`, mockSupabase)
      ).rejects.toThrow('유효하지 않은 토큰입니다.');
    });
  });

  describe('Cache Functionality', () => {
    it('should cache user profile on first request', async () => {
      const userId = 'test-user-123';
      const token = createMockToken(userId);
      
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: userId } },
        error: null
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                company_id: 'company-123',
                name: 'Test User',
                company: {
                  id: 'company-123',
                  name: 'Test Company',
                  description: 'Test Description'
                }
              },
              error: null
            })
          })
        })
      });

      // First call - should hit database
      await getAuthenticatedUserProfile(`Bearer ${token}`, mockSupabase);
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await getAuthenticatedUserProfile(`Bearer ${token}`, mockSupabase);
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1);
    });

    it('should expire cache after TTL', async () => {
      const userId = 'test-user-123';
      const token = createMockToken(userId);
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                company_id: 'company-123',
                name: 'Test User',
                company: {
                  id: 'company-123',
                  name: 'Test Company',
                  description: 'Test Description'
                }
              },
              error: null
            })
          })
        })
      });

      // First call
      await getAuthenticatedUserProfile(`Bearer ${token}`, mockSupabase);
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1);

      // Advance time past TTL (5 minutes)
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Should hit database again
      await getAuthenticatedUserProfile(`Bearer ${token}`, mockSupabase);
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache for specific user', async () => {
      const userId = 'test-user-123';
      const token = createMockToken(userId);
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                company_id: 'company-123',
                name: 'Test User',
                company: {
                  id: 'company-123',
                  name: 'Test Company',
                  description: 'Test Description'
                }
              },
              error: null
            })
          })
        })
      });

      // Cache the profile
      await getAuthenticatedUserProfile(`Bearer ${token}`, mockSupabase);
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1);

      // Invalidate cache
      invalidateUserCache(userId);

      // Should hit database again
      await getAuthenticatedUserProfile(`Bearer ${token}`, mockSupabase);
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache entries', async () => {
      const stats = getAuthCacheStats();
      expect(stats.size).toBe(0);

      const userId = 'test-user-123';
      const token = createMockToken(userId);
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                company_id: 'company-123',
                name: 'Test User',
                company: {
                  id: 'company-123',
                  name: 'Test Company',
                  description: 'Test Description'
                }
              },
              error: null
            })
          })
        })
      });

      await getAuthenticatedUserProfile(`Bearer ${token}`, mockSupabase);
      
      const statsAfterCache = getAuthCacheStats();
      expect(statsAfterCache.size).toBe(1);

      clearAuthCache();
      
      const statsAfterClear = getAuthCacheStats();
      expect(statsAfterClear.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when authentication fails', async () => {
      const userId = 'test-user-123';
      const token = createMockToken(userId);
      
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid token' }
      });

      await expect(
        getAuthenticatedUserProfile(`Bearer ${token}`, mockSupabase)
      ).rejects.toThrow('인증에 실패했습니다.');
    });

    it('should throw error when user ID mismatch', async () => {
      const userId = 'test-user-123';
      const token = createMockToken(userId);
      
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'different-user-id' } },
        error: null
      });

      await expect(
        getAuthenticatedUserProfile(`Bearer ${token}`, mockSupabase)
      ).rejects.toThrow('인증에 실패했습니다.');
    });

    it('should throw error when profile not found', async () => {
      const userId = 'test-user-123';
      const token = createMockToken(userId);
      
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: userId } },
        error: null
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: null,
              error: { message: 'Profile not found' }
            })
          })
        })
      });

      await expect(
        getAuthenticatedUserProfile(`Bearer ${token}`, mockSupabase)
      ).rejects.toThrow('사용자 정보를 찾을 수 없습니다.');
    });

    it('should handle array company data', async () => {
      const userId = 'test-user-123';
      const token = createMockToken(userId);
      
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: userId } },
        error: null
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                company_id: 'company-123',
                name: 'Test User',
                company: [{
                  id: 'company-123',
                  name: 'Test Company',
                  description: 'Test Description'
                }]
              },
              error: null
            })
          })
        })
      });

      const result = await getAuthenticatedUserProfile(`Bearer ${token}`, mockSupabase);
      
      expect(result.companyName).toBe('Test Company');
    });
  });

  describe('Cache Statistics', () => {
    it('should return correct cache statistics', () => {
      const stats = getAuthCacheStats();
      
      expect(stats).toEqual({
        size: 0,
        maxSize: 1000,
        ttl: 5 * 60 * 1000,
        cleanupInterval: 10 * 60 * 1000
      });
    });
  });
});