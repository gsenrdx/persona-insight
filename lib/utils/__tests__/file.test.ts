import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileStorageService, getFileStorageService } from '../file';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        createSignedUrl: vi.fn(),
        remove: vi.fn(),
        list: vi.fn()
      }))
    }
  }))
}));

describe('File Utilities', () => {
  let originalWindow: typeof globalThis.window;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Save original values
    originalWindow = global.window;
    originalEnv = process.env;
    
    // Set up environment
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key'
    };
    
    // Mock server environment
    global.window = undefined as any;
  });

  afterEach(() => {
    // Restore original values
    global.window = originalWindow;
    process.env = originalEnv;
  });

  describe('FileStorageService', () => {
    describe('Constructor', () => {
      it('should throw error in browser environment', () => {
        global.window = {} as any;
        
        expect(() => new FileStorageService()).toThrow(
          'FileStorageService can only be used on the server side'
        );
      });

      it('should throw error if Supabase URL is missing', () => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        
        expect(() => new FileStorageService()).toThrow(
          'Supabase configuration is missing'
        );
      });

      it('should throw error if Supabase service key is missing', () => {
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        expect(() => new FileStorageService()).toThrow(
          'Supabase configuration is missing'
        );
      });

      it('should create instance successfully with valid config', () => {
        expect(() => new FileStorageService()).not.toThrow();
      });
    });

    describe('uploadFile', () => {
      it('should upload file successfully', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const mockUpload = vi.fn().mockResolvedValue({ error: null });
        
        vi.mocked(createClient).mockReturnValue({
          storage: {
            from: vi.fn(() => ({
              upload: mockUpload
            }))
          }
        } as any);

        const service = new FileStorageService();
        const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
        // Mock File.arrayBuffer() method
        file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(12));
        
        const result = await service.uploadFile(file, 'company-123', 'project-456');
        
        expect(result.path).toMatch(/company-123\/project-456\/\d+_test.txt/);
        expect(mockUpload).toHaveBeenCalledWith(
          expect.stringMatching(/company-123\/project-456\/\d+_test.txt/),
          expect.any(ArrayBuffer),
          {
            contentType: 'text/plain',
            upsert: false
          }
        );
      });

      it('should sanitize file names', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const mockUpload = vi.fn().mockResolvedValue({ error: null });
        
        vi.mocked(createClient).mockReturnValue({
          storage: {
            from: vi.fn(() => ({
              upload: mockUpload
            }))
          }
        } as any);

        const service = new FileStorageService();
        const file = new File(['test'], 'test file@#$.txt', { type: 'text/plain' });
        // Mock File.arrayBuffer() method
        file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(4));
        
        const result = await service.uploadFile(file, 'company-123', 'project-456');
        
        expect(result.path).toMatch(/company-123\/project-456\/\d+_test_file___.txt/);
      });

      it('should throw error on upload failure', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const mockUpload = vi.fn().mockResolvedValue({ 
          error: { message: 'Upload failed' } 
        });
        
        vi.mocked(createClient).mockReturnValue({
          storage: {
            from: vi.fn(() => ({
              upload: mockUpload
            }))
          }
        } as any);

        const service = new FileStorageService();
        const file = new File(['test'], 'test.txt');
        // Mock File.arrayBuffer() method
        file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(4));
        
        await expect(
          service.uploadFile(file, 'company-123', 'project-456')
        ).rejects.toThrow('파일 업로드 실패: Upload failed');
      });
    });

    describe('getDownloadUrl', () => {
      it('should generate signed URL successfully', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const mockCreateSignedUrl = vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://test.url/signed' },
          error: null
        });
        
        vi.mocked(createClient).mockReturnValue({
          storage: {
            from: vi.fn(() => ({
              createSignedUrl: mockCreateSignedUrl
            }))
          }
        } as any);

        const service = new FileStorageService();
        const result = await service.getDownloadUrl('test/path/file.txt');
        
        expect(result).toBe('https://test.url/signed');
        expect(mockCreateSignedUrl).toHaveBeenCalledWith('test/path/file.txt', 3600);
      });

      it('should return null on error', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const mockCreateSignedUrl = vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        });
        
        vi.mocked(createClient).mockReturnValue({
          storage: {
            from: vi.fn(() => ({
              createSignedUrl: mockCreateSignedUrl
            }))
          }
        } as any);

        const service = new FileStorageService();
        const result = await service.getDownloadUrl('test/path/file.txt');
        
        expect(result).toBeNull();
      });

      it('should return null on exception', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const mockCreateSignedUrl = vi.fn().mockRejectedValue(new Error('Network error'));
        
        vi.mocked(createClient).mockReturnValue({
          storage: {
            from: vi.fn(() => ({
              createSignedUrl: mockCreateSignedUrl
            }))
          }
        } as any);

        const service = new FileStorageService();
        const result = await service.getDownloadUrl('test/path/file.txt');
        
        expect(result).toBeNull();
      });
    });

    describe('deleteFile', () => {
      it('should delete file successfully', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const mockRemove = vi.fn().mockResolvedValue({ error: null });
        
        vi.mocked(createClient).mockReturnValue({
          storage: {
            from: vi.fn(() => ({
              remove: mockRemove
            }))
          }
        } as any);

        const service = new FileStorageService();
        const result = await service.deleteFile('test/path/file.txt');
        
        expect(result).toBe(true);
        expect(mockRemove).toHaveBeenCalledWith(['test/path/file.txt']);
      });

      it('should return false on error', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const mockRemove = vi.fn().mockResolvedValue({ 
          error: { message: 'Delete failed' }
        });
        
        vi.mocked(createClient).mockReturnValue({
          storage: {
            from: vi.fn(() => ({
              remove: mockRemove
            }))
          }
        } as any);

        const service = new FileStorageService();
        const result = await service.deleteFile('test/path/file.txt');
        
        expect(result).toBe(false);
      });

      it('should return false on exception', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const mockRemove = vi.fn().mockRejectedValue(new Error('Network error'));
        
        vi.mocked(createClient).mockReturnValue({
          storage: {
            from: vi.fn(() => ({
              remove: mockRemove
            }))
          }
        } as any);

        const service = new FileStorageService();
        const result = await service.deleteFile('test/path/file.txt');
        
        expect(result).toBe(false);
      });
    });

    describe('fileExists', () => {
      it('should return true if file exists', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const mockList = vi.fn().mockResolvedValue({
          data: [
            { name: 'file1.txt' },
            { name: 'file2.txt' },
            { name: 'target.txt' }
          ],
          error: null
        });
        
        vi.mocked(createClient).mockReturnValue({
          storage: {
            from: vi.fn(() => ({
              list: mockList
            }))
          }
        } as any);

        const service = new FileStorageService();
        const result = await service.fileExists('test/path/target.txt');
        
        expect(result).toBe(true);
        expect(mockList).toHaveBeenCalledWith('test/path');
      });

      it('should return false if file does not exist', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const mockList = vi.fn().mockResolvedValue({
          data: [
            { name: 'file1.txt' },
            { name: 'file2.txt' }
          ],
          error: null
        });
        
        vi.mocked(createClient).mockReturnValue({
          storage: {
            from: vi.fn(() => ({
              list: mockList
            }))
          }
        } as any);

        const service = new FileStorageService();
        const result = await service.fileExists('test/path/missing.txt');
        
        expect(result).toBe(false);
      });

      it('should return false on error', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const mockList = vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'List failed' }
        });
        
        vi.mocked(createClient).mockReturnValue({
          storage: {
            from: vi.fn(() => ({
              list: mockList
            }))
          }
        } as any);

        const service = new FileStorageService();
        const result = await service.fileExists('test/path/file.txt');
        
        expect(result).toBe(false);
      });

      it('should return false on exception', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const mockList = vi.fn().mockRejectedValue(new Error('Network error'));
        
        vi.mocked(createClient).mockReturnValue({
          storage: {
            from: vi.fn(() => ({
              list: mockList
            }))
          }
        } as any);

        const service = new FileStorageService();
        const result = await service.fileExists('test/path/file.txt');
        
        expect(result).toBe(false);
      });
    });
  });

  describe('getFileStorageService', () => {
    it('should throw error in browser environment', () => {
      global.window = {} as any;
      
      expect(() => getFileStorageService()).toThrow(
        'FileStorageService can only be used on the server side'
      );
    });

    it('should return singleton instance', () => {
      const instance1 = getFileStorageService();
      const instance2 = getFileStorageService();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('fileStorageService (deprecated)', () => {
    it('should provide instance through getter', async () => {
      // Dynamic import to ensure module is loaded
      const fileModule = await import('../file');
      const instance = fileModule.fileStorageService.instance;
      
      expect(instance).toBeInstanceOf(FileStorageService);
    });
  });
});