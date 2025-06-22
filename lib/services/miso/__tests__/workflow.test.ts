import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MISO Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('syncInterviewTopicsToPersona', () => {
    it('should handle interview not found', async () => {
      // Create a simple mock that throws the expected error
      vi.doMock('@/lib/supabase-server', () => ({
        supabaseAdmin: {
          from: () => ({
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: null,
                  error: { message: 'Not found' }
                })
              })
            })
          })
        }
      }));

      const { syncInterviewTopicsToPersona } = await import('../workflow');

      await expect(
        syncInterviewTopicsToPersona('interview-1', 'persona-1', 'test-dataset')
      ).rejects.toThrow('인터뷰를 찾을 수 없습니다');
      
      vi.doUnmock('@/lib/supabase-server');
    });

    it('should handle empty interview detail', async () => {
      vi.doMock('@/lib/supabase-server', () => ({
        supabaseAdmin: {
          from: () => ({
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: 'interview-1',
                    interview_detail: null,
                    company_id: 'company-1',
                    project_id: 'project-1'
                  },
                  error: null
                })
              })
            })
          })
        }
      }));

      const { syncInterviewTopicsToPersona } = await import('../workflow');

      // Should complete without error
      await expect(
        syncInterviewTopicsToPersona('interview-1', 'persona-1', 'test-dataset')
      ).resolves.toBeUndefined();
      
      vi.doUnmock('@/lib/supabase-server');
    });

    it('should handle parse failure', async () => {
      vi.doMock('@/lib/supabase-server', () => ({
        supabaseAdmin: {
          from: () => ({
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: 'interview-1',
                    interview_detail: 'invalid json',
                    company_id: 'company-1',
                    project_id: 'project-1'
                  },
                  error: null
                })
              })
            })
          })
        }
      }));

      vi.doMock('../parser', () => ({
        parseInterviewDetail: () => null
      }));

      const { syncInterviewTopicsToPersona } = await import('../workflow');

      // Should complete without error when parse fails
      await expect(
        syncInterviewTopicsToPersona('interview-1', 'persona-1', 'test-dataset')
      ).resolves.toBeUndefined();
      
      vi.doUnmock('@/lib/supabase-server');
      vi.doUnmock('../parser');
    });

    it('should process valid interview successfully', async () => {
      // Mock counter to handle different calls
      let fromCallCount = 0;
      
      vi.doMock('@/lib/supabase-server', () => ({
        supabaseAdmin: {
          from: (table: string) => {
            fromCallCount++;
            
            // First call - get interview
            if (fromCallCount === 1) {
              return {
                select: () => ({
                  eq: () => ({
                    single: () => Promise.resolve({
                      data: {
                        id: 'interview-1',
                        interview_detail: '[{"topic_name": "user needs", "painpoint": ["slow"]}]',
                        company_id: 'company-1',
                        project_id: 'project-1'
                      },
                      error: null
                    })
                  })
                })
              };
            }
            
            // Default mock for other calls with proper chaining
            const mockChain = {
              select: () => mockChain,
              eq: () => mockChain,
              in: () => mockChain,
              not: () => mockChain,
              insert: () => mockChain,
              then: (resolve: any) => resolve({ data: [], error: null })
            };
            return mockChain;
          }
        }
      }));

      vi.doMock('../parser', () => ({
        parseInterviewDetail: (detail: string) => {
          try {
            return JSON.parse(detail);
          } catch {
            return null;
          }
        }
      }));

      vi.doMock('../api', () => ({
        createMisoDocumentOnly: vi.fn().mockResolvedValue('doc-123'),
        checkDocumentStatus: vi.fn().mockResolvedValue({ word_count: 100 }),
        addSegmentsToDocument: vi.fn().mockResolvedValue(undefined)
      }));

      const { syncInterviewTopicsToPersona } = await import('../workflow');

      // Should complete without throwing
      await expect(
        syncInterviewTopicsToPersona('interview-1', 'persona-1', 'test-dataset')
      ).resolves.toBeUndefined();
      
      vi.doUnmock('@/lib/supabase-server');
      vi.doUnmock('../parser');
      vi.doUnmock('../api');
    });
  });
});