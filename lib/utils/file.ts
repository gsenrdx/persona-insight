import { createClient } from '@supabase/supabase-js'

export interface FileInfo {
  path: string
}

export class FileStorageService {
  private supabase

  constructor() {
    // 서버 사이드에서만 실행되도록 체크
    if (typeof window !== 'undefined') {
      throw new Error('FileStorageService can only be used on the server side')
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration is missing. Please check your environment variables.')
    }
    
    this.supabase = createClient(supabaseUrl, supabaseServiceKey)
  }

  /**
   * 파일을 Supabase Storage에 업로드
   */
  async uploadFile(
    file: File, 
    companyId: string, 
    projectId: string
  ): Promise<FileInfo> {
    try {
      // 고유한 파일 경로 생성
      const timestamp = new Date().getTime()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `${companyId}/${projectId}/${timestamp}_${sanitizedFileName}`
      
      // 파일 업로드
      const fileBuffer = await file.arrayBuffer()
      const { data, error } = await this.supabase.storage
        .from('interview-files')
        .upload(filePath, fileBuffer, {
          contentType: file.type,
          upsert: false
        })

      if (error) {
        throw new Error(`파일 업로드 실패: ${error.message}`)
      }

      return {
        path: filePath
      }
    } catch (error) {
      console.error('File upload error:', error)
      throw error
    }
  }

  /**
   * 파일 다운로드 URL 생성
   */
  async getDownloadUrl(filePath: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.storage
        .from('interview-files')
        .createSignedUrl(filePath, 3600) // 1시간 유효

      if (error) {
        console.error('Failed to create download URL:', error)
        return null
      }

      return data.signedUrl
    } catch (error) {
      console.error('Download URL generation error:', error)
      return null
    }
  }

  /**
   * 파일 삭제
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from('interview-files')
        .remove([filePath])

      if (error) {
        console.error('File deletion error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('File deletion error:', error)
      return false
    }
  }

  /**
   * 파일 존재 여부 확인
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.storage
        .from('interview-files')
        .list(filePath.split('/').slice(0, -1).join('/'))

      if (error) {
        return false
      }

      const fileName = filePath.split('/').pop()
      return data.some(file => file.name === fileName)
    } catch (error) {
      return false
    }
  }
}

// 서버 사이드에서만 사용할 수 있는 싱글톤 인스턴스
let _fileStorageService: FileStorageService | null = null

export function getFileStorageService(): FileStorageService {
  if (typeof window !== 'undefined') {
    throw new Error('FileStorageService can only be used on the server side')
  }
  
  if (!_fileStorageService) {
    _fileStorageService = new FileStorageService()
  }
  
  return _fileStorageService
}

// Legacy export (deprecated, use getFileStorageService() instead)
export const fileStorageService = {
  get instance() {
    return getFileStorageService()
  }
}