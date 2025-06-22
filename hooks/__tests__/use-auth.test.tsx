import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../use-auth';
import { ReactNode } from 'react';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn()
    },
    from: vi.fn()
  }
}));

// Import mocked supabase
import { supabase } from '@/lib/supabase';

const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z'
};

const mockProfile = {
  id: 'test-user-123',
  name: 'Test User',
  role: 'company_user' as const,
  company_id: 'company-123',
  phone: '010-1234-5678',
  avatar_url: null,
  is_active: true,
  last_login_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  company: {
    id: 'company-123',
    name: 'Test Company',
    domains: ['test.com']
  }
};

describe('useAuth Hook', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    localStorage.clear();
    
    // Mock window.location
    delete (window as any).location;
    (window as any).location = { href: '' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Hook Usage', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Initial Load', () => {
    it('should initialize with loading state', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null
      });

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: {
          subscription: { unsubscribe: vi.fn() }
        }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBe(null);
      expect(result.current.profile).toBe(null);
      expect(result.current.error).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should load user and profile on successful session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { 
          session: { 
            user: mockUser,
            access_token: 'test-token',
            expires_at: Date.now() + 3600000
          } 
        },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      } as any);

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: {
          subscription: { unsubscribe: vi.fn() }
        }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.error).toBe(null);
    });

    it('should handle session error', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session error', name: 'SessionError', details: null, hint: null, code: '500' }
      });

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: {
          subscription: { unsubscribe: vi.fn() }
        }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('세션 확인 실패: Session error');
      expect(result.current.user).toBe(null);
      expect(result.current.profile).toBe(null);
    });

    it('should handle profile load error', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { 
          session: { 
            user: mockUser,
            access_token: 'test-token',
            expires_at: Date.now() + 3600000
          } 
        },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile not found' }
            })
          })
        })
      } as any);

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: {
          subscription: { unsubscribe: vi.fn() }
        }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.profile).toBe(null);
      expect(result.current.error).toBe('프로필 로드 실패: Profile not found');
    });
  });

  describe('Auth State Changes', () => {
    it('should handle SIGNED_OUT event', async () => {
      let authChangeCallback: any;

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { 
          session: { 
            user: mockUser,
            access_token: 'test-token',
            expires_at: Date.now() + 3600000
          } 
        },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      } as any);

      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
        authChangeCallback = cb;
        return {
          data: {
            subscription: { unsubscribe: vi.fn() }
          }
        };
      });

      // Set localStorage item
      localStorage.setItem('workflow_queue_jobs', 'test-data');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify initial state
      expect(result.current.user).toEqual(mockUser);
      expect(localStorage.getItem('workflow_queue_jobs')).toBe('test-data');

      // Trigger SIGNED_OUT event
      act(() => {
        authChangeCallback('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(result.current.user).toBe(null);
        expect(result.current.profile).toBe(null);
        expect(result.current.error).toBe(null);
        expect(localStorage.getItem('workflow_queue_jobs')).toBe(null);
      });
    });

    it('should handle session update', async () => {
      let authChangeCallback: any;

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null
      });

      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
        authChangeCallback = cb;
        return {
          data: {
            subscription: { unsubscribe: vi.fn() }
          }
        };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Initial state should be null
      expect(result.current.user).toBe(null);

      // Mock profile fetch for auth change
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      } as any);

      // Trigger session update
      act(() => {
        authChangeCallback('SIGNED_IN', { 
          user: mockUser,
          access_token: 'test-token',
          expires_at: Date.now() + 3600000
        });
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.profile).toEqual(mockProfile);
      });
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { 
          session: { 
            user: mockUser,
            access_token: 'test-token',
            expires_at: Date.now() + 3600000
          } 
        },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      } as any);

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: {
          subscription: { unsubscribe: vi.fn() }
        }
      });

      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Set localStorage to verify cleanup
      localStorage.setItem('workflow_queue_jobs', 'test-data');

      await act(async () => {
        await result.current.signOut();
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(result.current.user).toBe(null);
      expect(result.current.profile).toBe(null);
      expect(localStorage.getItem('workflow_queue_jobs')).toBe(null);
      expect(window.location.href).toBe('/login');
    });

    it('should handle signOut error', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { 
          session: { 
            user: mockUser,
            access_token: 'test-token',
            expires_at: Date.now() + 3600000
          } 
        },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      } as any);

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: {
          subscription: { unsubscribe: vi.fn() }
        }
      });

      vi.mocked(supabase.auth.signOut).mockRejectedValueOnce(new Error('Sign out failed'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.error).toBe('로그아웃에 실패했습니다.');
    });
  });

  describe('refreshProfile', () => {
    it('should refresh profile successfully', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { 
          session: { 
            user: mockUser,
            access_token: 'test-token',
            expires_at: Date.now() + 3600000
          } 
        },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      } as any);

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: {
          subscription: { unsubscribe: vi.fn() }
        }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Update mock profile
      const updatedProfile = { ...mockProfile, name: 'Updated User' };
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedProfile,
              error: null
            })
          })
        })
      } as any);

      await act(async () => {
        await result.current.refreshProfile();
      });

      expect(result.current.profile).toEqual(updatedProfile);
      expect(result.current.error).toBe(null);
    });

    it('should handle refresh error', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { 
          session: { 
            user: mockUser,
            access_token: 'test-token',
            expires_at: Date.now() + 3600000
          } 
        },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      } as any);

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: {
          subscription: { unsubscribe: vi.fn() }
        }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock error on refresh
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Refresh failed' }
            })
          })
        })
      } as any);

      await act(async () => {
        await result.current.refreshProfile();
      });

      expect(result.current.error).toBe('프로필 로드 실패: Refresh failed');
    });

    it('should not refresh if no user', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null
      });

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: {
          subscription: { unsubscribe: vi.fn() }
        }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshProfile();
      });

      // Should not call supabase.from since there's no user
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup subscription on unmount', async () => {
      const unsubscribeMock = vi.fn();

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null
      });

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: {
          subscription: { unsubscribe: unsubscribeMock }
        }
      });

      const { unmount } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });
});