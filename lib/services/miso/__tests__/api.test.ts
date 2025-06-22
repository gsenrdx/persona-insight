import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

describe('MISO API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('createMisoDocumentOnly', () => {
    it('should create a document successfully', async () => {
      // Mock environment variables for this test
      vi.stubEnv('MISO_KNOWLEDGE_API_KEY', 'test-api-key');
      vi.stubEnv('MISO_API_URL', 'https://test-api.miso.gs');
      
      // Import after setting env vars
      const { createMisoDocumentOnly } = await import('../api');

      const mockResponse = {
        document: {
          id: 'doc-123'
        }
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await createMisoDocumentOnly(
        'test-dataset',
        'user needs',
        5
      );

      expect(result).toEqual('doc-123');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.miso.gs/ext/v1/datasets/test-dataset/docs/text',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          }
        })
      );

      vi.unstubAllEnvs();
    });

    it('should throw error when document ID is missing in response', async () => {
      vi.stubEnv('MISO_KNOWLEDGE_API_KEY', 'test-api-key');
      const { createMisoDocumentOnly } = await import('../api');

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      } as Response);

      await expect(
        createMisoDocumentOnly('test-dataset', 'user needs', 5)
      ).rejects.toThrow('MISO 응답에서 문서 ID를 찾을 수 없습니다');

      vi.unstubAllEnvs();
    });

    it('should throw error when environment variables are missing', async () => {
      // Import without setting env vars
      const { createMisoDocumentOnly } = await import('../api');

      await expect(
        createMisoDocumentOnly('test-dataset', 'user needs', 5)
      ).rejects.toThrow('MISO_KNOWLEDGE_API_KEY 환경 변수가 설정되지 않았습니다');
    });

    it('should handle API error response', async () => {
      vi.stubEnv('MISO_KNOWLEDGE_API_KEY', 'test-api-key');
      const { createMisoDocumentOnly } = await import('../api');

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Error details'
      } as Response);

      await expect(
        createMisoDocumentOnly('test-dataset', 'user needs', 5)
      ).rejects.toThrow('MISO 문서 생성 실패: 400 Bad Request');

      vi.unstubAllEnvs();
    });
  });

  describe('checkDocumentStatus', () => {
    it('should check document status successfully', async () => {
      vi.stubEnv('MISO_KNOWLEDGE_API_KEY', 'test-api-key');
      vi.stubEnv('MISO_API_URL', 'https://test-api.miso.gs');
      const { checkDocumentStatus } = await import('../api');

      const mockResponse = {
        data: [
          { id: 'doc-123', status: 'indexed' },
          { id: 'doc-456', status: 'processing' }
        ]
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await checkDocumentStatus('test-dataset', 'doc-123');

      expect(result).toEqual({ id: 'doc-123', status: 'indexed' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.miso.gs/ext/v1/datasets/test-dataset/docs',
        {
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          }
        }
      );

      vi.unstubAllEnvs();
    });

    it('should return undefined when document not found', async () => {
      vi.stubEnv('MISO_KNOWLEDGE_API_KEY', 'test-api-key');
      const { checkDocumentStatus } = await import('../api');

      const mockResponse = {
        data: [
          { id: 'doc-456', status: 'processing' }
        ]
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await checkDocumentStatus('test-dataset', 'doc-123');

      expect(result).toBeUndefined();

      vi.unstubAllEnvs();
    });

    it('should handle API error response', async () => {
      vi.stubEnv('MISO_KNOWLEDGE_API_KEY', 'test-api-key');
      const { checkDocumentStatus } = await import('../api');

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response);

      await expect(
        checkDocumentStatus('test-dataset', 'doc-123')
      ).rejects.toThrow('문서 상태 확인 실패: 404');

      vi.unstubAllEnvs();
    });
  });

  describe('addSegmentsToDocument', () => {
    it('should add segments successfully', async () => {
      vi.stubEnv('MISO_KNOWLEDGE_API_KEY', 'test-api-key');
      vi.stubEnv('MISO_API_URL', 'https://test-api.miso.gs');
      const { addSegmentsToDocument } = await import('../api');

      const topicInterviews = [
        {
          topic_data: {
            painpoint: ['slow loading', 'bad UX'],
            need: ['faster performance'],
            keyword_cluster: ['speed'],
            painpoint_keyword: ['slow'],
            need_keyword: ['fast']
          }
        },
        {
          topic_data: {
            painpoint: ['complex UI'],
            need: ['simple interface'],
            keyword_cluster: ['UI'],
            painpoint_keyword: ['complex'],
            need_keyword: ['simple']
          }
        }
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await addSegmentsToDocument(
        'sync-123',
        'test-dataset',
        'doc-123',
        topicInterviews as any,
        'user experience'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.miso.gs/ext/v1/datasets/test-dataset/docs/doc-123/segments',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          }
        })
      );

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);
      
      expect(body.segments).toHaveLength(2);
      expect(body.segments[0].content).toContain('페인포인트: slow loading, bad UX');
      expect(body.segments[0].keywords).toContain('user experience');

      vi.unstubAllEnvs();
    });

    it('should handle empty arrays in topic data', async () => {
      vi.stubEnv('MISO_KNOWLEDGE_API_KEY', 'test-api-key');
      const { addSegmentsToDocument } = await import('../api');

      const topicInterviews = [
        {
          topic_data: {
            painpoint: [],
            need: [],
            keyword_cluster: [],
            painpoint_keyword: [],
            need_keyword: []
          }
        }
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await addSegmentsToDocument(
        'sync-123',
        'test-dataset',
        'doc-123',
        topicInterviews as any,
        'topic'
      );

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);
      
      expect(body.segments[0].content).toContain('페인포인트: 없음');
      expect(body.segments[0].content).toContain('니즈: 없음');

      vi.unstubAllEnvs();
    });

    it('should handle API error response', async () => {
      vi.stubEnv('MISO_KNOWLEDGE_API_KEY', 'test-api-key');
      const { addSegmentsToDocument } = await import('../api');

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server error'
      } as Response);

      await expect(
        addSegmentsToDocument('sync-123', 'test-dataset', 'doc-123', [], 'topic')
      ).rejects.toThrow('세그먼트 추가 실패: 500');

      vi.unstubAllEnvs();
    });
  });
});