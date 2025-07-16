import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserProfile } from '@/lib/utils/auth-cache'

// Storage에서 이미지 목록 조회
export async function GET(req: NextRequest) {
  try {
    // 인증 확인
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({
        error: '인증이 필요합니다',
        success: false
      }, { status: 401 })
    }

    // Supabase 클라이언트 초기화
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 사용자 프로필 조회
    const userProfile = await getAuthenticatedUserProfile(authHeader, supabase)
    
    // persona-images 버킷에서만 이미지 조회
    const bucketName = 'persona-images'
    const allImages: Array<{
      url: string
      name: string
      created_at: string
      size: number
    }> = []

    try {
      // 루트 경로의 파일 조회
      const { data: files, error } = await supabase.storage
        .from(bucketName)
        .list('', {
          limit: 100,
          offset: 0
        })

      if (error) {
        console.error(`Error listing files:`, error)
      } else {
        // 이미지 파일만 필터링 (jpg, jpeg, png, webp, gif)
        const imageFiles = (files || []).filter(file => {
          const ext = file.name.toLowerCase().split('.').pop()
          return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')
        })

        // 각 파일에 대한 공개 URL 생성
        for (const file of imageFiles) {
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(file.name)

          allImages.push({
            url: publicUrl,
            name: file.name,
            created_at: file.created_at || new Date().toISOString(),
            size: file.metadata?.size || 0
          })
        }
      }

      // 회사별 폴더의 이미지도 조회
      if (userProfile.companyId) {
        const { data: companyFiles, error: companyError } = await supabase.storage
          .from(bucketName)
          .list(userProfile.companyId, {
            limit: 100,
            offset: 0
          })

        if (!companyError && companyFiles) {
          const companyImageFiles = (companyFiles || []).filter(file => {
            const ext = file.name.toLowerCase().split('.').pop()
            return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')
          })

          for (const file of companyImageFiles) {
            const { data: { publicUrl } } = supabase.storage
              .from(bucketName)
              .getPublicUrl(`${userProfile.companyId}/${file.name}`)

            allImages.push({
              url: publicUrl,
              name: file.name,
              created_at: file.created_at || new Date().toISOString(),
              size: file.metadata?.size || 0
            })
          }
        }
      }
    } catch (error) {
      console.error(`Error processing persona-images bucket:`, error)
    }

    // 최신 이미지가 먼저 오도록 정렬
    allImages.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json({
      images: allImages,
      total: allImages.length,
      success: true
    })

  } catch (error) {
    console.error('Get storage images error:', error)
    return NextResponse.json({
      error: '이미지 목록을 가져오는 중 오류가 발생했습니다',
      success: false
    }, { status: 500 })
  }
}