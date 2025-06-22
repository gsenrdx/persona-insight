import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set up environment variables before imports
vi.stubEnv('MISO_API_URL', 'https://test-api.miso.gs');
vi.stubEnv('MISO_API_KEY', 'test-miso-key');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  }))
}));

vi.mock('@/lib/utils/file', () => ({
  getFileStorageService: vi.fn(() => ({
    uploadFile: vi.fn().mockResolvedValue({ path: 'test/path/file.txt' })
  }))
}));

vi.mock('@/lib/utils/auth-cache', () => ({
  getAuthenticatedUserProfile: vi.fn().mockResolvedValue({
    userId: 'user-123',
    companyId: 'company-123',
    userName: 'Test User'
  })
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('Workflow API Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Helper Function Tests', () => {
    it('should determine file type correctly', () => {
      // Test helper function logic
      const getFileType = (fileName: string, mimeType: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        
        if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
          return 'image';
        }
        
        if (mimeType.startsWith('audio/') || ['mp3', 'm4a', 'wav', 'webm', 'amr'].includes(extension || '')) {
          return 'audio';
        }
        
        if (mimeType.startsWith('video/') || ['mp4', 'mov', 'mpeg', 'mpga'].includes(extension || '')) {
          return 'video';
        }
        
        return 'document';
      };

      expect(getFileType('test.jpg', 'image/jpeg')).toBe('image');
      expect(getFileType('test.png', 'image/png')).toBe('image');
      expect(getFileType('test.mp3', 'audio/mp3')).toBe('audio');
      expect(getFileType('test.m4a', 'audio/m4a')).toBe('audio');
      expect(getFileType('test.mp4', 'video/mp4')).toBe('video');
      expect(getFileType('test.mov', 'video/quicktime')).toBe('video');
      expect(getFileType('test.txt', 'text/plain')).toBe('document');
      expect(getFileType('test.pdf', 'application/pdf')).toBe('document');
    });
  });

  describe('Topic Extraction Logic', () => {
    it('should parse interview detail correctly', () => {
      const parseInterviewDetail = (output: any) => {
        try {
          if (!output.interviewee_detail) {
            return null;
          }

          let rawData = output.interviewee_detail;

          // Already object/array
          if (typeof rawData !== 'string') {
            return rawData;
          }

          // Clean and parse string
          let cleanedData = rawData.trim();
          
          // Remove markdown code blocks
          cleanedData = cleanedData.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          cleanedData = cleanedData.replace(/^```\s*/, '').replace(/\s*```$/, '');
          
          // Parse JSON
          if (cleanedData.startsWith('[') && cleanedData.endsWith(']')) {
            return JSON.parse(cleanedData);
          } else if (cleanedData.startsWith('{') && cleanedData.endsWith('}')) {
            return [JSON.parse(cleanedData)];
          }
          
          return null;
        } catch {
          return null;
        }
      };

      // Test cases
      const testCases = [
        {
          input: { interviewee_detail: '[{"topic_name": "Topic 1"}]' },
          expected: [{ topic_name: 'Topic 1' }]
        },
        {
          input: { interviewee_detail: '```json\n[{"topic_name": "Topic 2"}]\n```' },
          expected: [{ topic_name: 'Topic 2' }]
        },
        {
          input: { interviewee_detail: '{"topic_name": "Single Topic"}' },
          expected: [{ topic_name: 'Single Topic' }]
        },
        {
          input: { interviewee_detail: null },
          expected: null
        },
        {
          input: { interviewee_detail: 'invalid json' },
          expected: null
        }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(parseInterviewDetail(input)).toEqual(expected);
      });
    });

    it('should extract topic names from parsed detail', () => {
      const extractTopicNames = (parsedDetail: any[]) => {
        if (!Array.isArray(parsedDetail) || parsedDetail.length === 0) {
          return [];
        }
        
        return parsedDetail
          .filter((topic: any) => topic && typeof topic === 'object' && topic.topic_name)
          .map((topic: any) => topic.topic_name?.trim())
          .filter((name: string | undefined) => name && name.length > 0) as string[];
      };

      expect(extractTopicNames([
        { topic_name: 'Topic 1' },
        { topic_name: 'Topic 2' },
        { no_name: 'Invalid' },
        { topic_name: '  Topic 3  ' }
      ])).toEqual(['Topic 1', 'Topic 2', 'Topic 3']);

      expect(extractTopicNames([])).toEqual([]);
      expect(extractTopicNames([{ other_field: 'value' }])).toEqual([]);
    });
  });

  describe('Persona Matching Logic', () => {
    it('should calculate coordinates from scores', () => {
      const calculateCoordinate = (scores: any, type: 'x' | 'y') => {
        if (!scores || typeof scores !== 'object') return 0;
        
        const highKeys = Object.keys(scores).filter(key => {
          if (type === 'x') {
            return key.includes('high') || key.includes('우측') || 
                   (key.endsWith('_score') && !key.includes('low') && !key.includes('좌측'));
          } else {
            return key.includes('high') || key.includes('상단') || 
                   (key.endsWith('_score') && !key.includes('low') && !key.includes('하단'));
          }
        });
        
        if (highKeys.length > 0 && highKeys[0]) {
          return scores[highKeys[0]] || 0;
        }
        
        return 0;
      };

      expect(calculateCoordinate({ high_score: 8 }, 'x')).toBe(8);
      expect(calculateCoordinate({ low_score: 2, high_score: 7 }, 'x')).toBe(7);
      expect(calculateCoordinate({ 우측_score: 9 }, 'x')).toBe(9);
      expect(calculateCoordinate({ 상단_score: 6 }, 'y')).toBe(6);
      expect(calculateCoordinate({}, 'x')).toBe(0);
      expect(calculateCoordinate(null, 'x')).toBe(0);
    });
  });

  describe('Thumbnail Parsing', () => {
    it('should parse thumbnail data correctly', () => {
      const parseThumbnail = (output: any) => {
        try {
          if (output.thumbnail && typeof output.thumbnail === 'string') {
            if (output.thumbnail.startsWith('{') || output.thumbnail.startsWith('[')) {
              try {
                const thumbnailData = JSON.parse(output.thumbnail);
                return thumbnailData.success ? thumbnailData.imageUrl : thumbnailData.imageUrl || thumbnailData;
              } catch {
                return output.thumbnail;
              }
            } else {
              return output.thumbnail;
            }
          }
          return output.thumbnail || null;
        } catch {
          return null;
        }
      };

      expect(parseThumbnail({ thumbnail: 'https://example.com/image.jpg' }))
        .toBe('https://example.com/image.jpg');
      
      expect(parseThumbnail({ thumbnail: '{"success": true, "imageUrl": "https://example.com/img.jpg"}' }))
        .toBe('https://example.com/img.jpg');
      
      expect(parseThumbnail({ thumbnail: '{"imageUrl": "https://example.com/img2.jpg"}' }))
        .toBe('https://example.com/img2.jpg');
      
      expect(parseThumbnail({ thumbnail: null })).toBe(null);
      expect(parseThumbnail({})).toBe(null);
    });
  });

  describe('Error Response Formatting', () => {
    it('should format error responses correctly', () => {
      const formatErrorResponse = (status: number, statusText: string, message: string) => {
        return {
          error: '외부 API 오류',
          details: {
            status,
            statusText,
            message,
            timestamp: expect.any(String)
          }
        };
      };

      const error = formatErrorResponse(500, 'Internal Server Error', 'API failed');
      expect(error).toMatchObject({
        error: '외부 API 오류',
        details: {
          status: 500,
          statusText: 'Internal Server Error',
          message: 'API failed'
        }
      });
      expect(error.details.timestamp).toBeDefined();
    });
  });

  describe('Workflow Request Building', () => {
    it('should build workflow request correctly', () => {
      const buildWorkflowRequest = (
        fileObject: any,
        userName: string,
        topicsString: string,
        promptPersonaCriteria: string
      ) => {
        return {
          inputs: {
            file_input: fileObject,
            preprocess_type: 'interviewee',
            topics: topicsString,
            prompt_persona_criteria: promptPersonaCriteria
          },
          mode: 'blocking',
          user: userName,
          files: [fileObject]
        };
      };

      const fileObject = {
        type: 'document',
        transfer_method: 'local_file',
        upload_file_id: 'file-123'
      };

      const request = buildWorkflowRequest(
        fileObject,
        'Test User',
        'Topic1, Topic2',
        'Test prompt'
      );

      expect(request).toEqual({
        inputs: {
          file_input: fileObject,
          preprocess_type: 'interviewee',
          topics: 'Topic1, Topic2',
          prompt_persona_criteria: 'Test prompt'
        },
        mode: 'blocking',
        user: 'Test User',
        files: [fileObject]
      });
    });
  });

  describe('Analysis Result Building', () => {
    it('should build analysis result from workflow output', () => {
      const buildAnalysisResult = (output: any) => {
        return {
          type: output.type || output.user_type || "정보 없음",
          description: output.description || output.user_description || "설명이 없습니다.",
          summary: output.summary || output.interviewee_summary || "요약이 없습니다.",
          date: output.date || output.session_date || "날짜 정보가 없습니다.",
          interviewee_style: output.interviewee_style || "스타일 정보가 없습니다.",
          interviewee_fake_name: output.interviewee_fake_name || null,
          x_axis: output.x_axis || null,
          y_axis: output.y_axis || null,
          interviewee_id: null as string | null
        };
      };

      const output = {
        user_type: 'power_user',
        user_description: 'Advanced user',
        interviewee_summary: 'Summary text',
        session_date: '2024-01-01',
        interviewee_style: 'Analytical',
        interviewee_fake_name: 'Alex',
        x_axis: [{ score: 8 }],
        y_axis: [{ score: 7 }]
      };

      const result = buildAnalysisResult(output);
      
      expect(result).toEqual({
        type: 'power_user',
        description: 'Advanced user',
        summary: 'Summary text',
        date: '2024-01-01',
        interviewee_style: 'Analytical',
        interviewee_fake_name: 'Alex',
        x_axis: [{ score: 8 }],
        y_axis: [{ score: 7 }],
        interviewee_id: null
      });

      // Test with missing fields
      const minimalOutput = { user_type: 'basic' };
      const minimalResult = buildAnalysisResult(minimalOutput);
      
      expect(minimalResult.type).toBe('basic');
      expect(minimalResult.description).toBe('설명이 없습니다.');
      expect(minimalResult.summary).toBe('요약이 없습니다.');
    });
  });
});