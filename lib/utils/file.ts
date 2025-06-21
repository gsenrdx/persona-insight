import { createClient } from '@supabase/supabase-js'

export interface FileInfo {
  path: string
}

/**
 * Supabase Storage를 통한 인터뷰 파일 관리 서비스
 */
export class FileStorageService {
  private supabase

  constructor() {
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

  async uploadFile(
    file: File, 
    companyId: string, 
    projectId: string
  ): Promise<FileInfo> {
    try {
      const timestamp = new Date().getTime()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `${companyId}/${projectId}/${timestamp}_${sanitizedFileName}`
      
      const fileBuffer = await file.arrayBuffer()
      const { error } = await this.supabase.storage
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
      throw error
    }
  }

  // 1시간 유효한 다운로드 URL 생성
  async getDownloadUrl(filePath: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.storage
        .from('interview-files')
        .createSignedUrl(filePath, 3600)

      if (error) {
        return null
      }

      return data.signedUrl
    } catch (error) {
      return null
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from('interview-files')
        .remove([filePath])

      if (error) {
        return false
      }

      return true
    } catch (error) {
      return false
    }
  }

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

// 싱글톤 인스턴스
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

// TODO: deprecated - getFileStorageService() 사용 권장
export const fileStorageService = {
  get instance() {
    return getFileStorageService()
  }
}