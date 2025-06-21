import { NextRequest, NextResponse } from 'next/server'

// List MISO datasets with pagination

interface MisoDatasetListResponse {
  data: {
    id: string
    name: string
    description: string | null
    permission: string
    data_source_type: string | null
    indexing_technique: string | null
    app_count: number
    document_count: number
    word_count: number
    created_by: string
    created_at: string
    updated_by: string
    updated_at: string
  }[]
  has_more: boolean
  limit: number
  total: number
  page: number
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '30', 10)


    // Check MISO API configuration
    const misoApiKey = process.env.MISO_KNOWLEDGE_API_KEY
    const misoApiUrl = process.env.MISO_API_URL

    if (!misoApiKey) {
      return NextResponse.json({
        error: 'MISO Knowledge API 키가 설정되지 않았습니다',
        success: false
      }, { status: 500 })
    }

    if (!misoApiUrl) {
      return NextResponse.json({
        error: 'MISO API URL이 설정되지 않았습니다',
        success: false
      }, { status: 500 })
    }

    // Call MISO API
    const misoResponse = await fetch(`${misoApiUrl}/ext/v1/datasets?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${misoApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!misoResponse.ok) {
      const errorText = await misoResponse.text()
      
      return NextResponse.json({
        error: 'MISO API 호출에 실패했습니다',
        details: errorText,
        success: false
      }, { status: misoResponse.status })
    }

    const datasetsData: MisoDatasetListResponse = await misoResponse.json()

    return NextResponse.json({
      success: true,
      message: '데이터셋 목록을 성공적으로 조회했습니다',
      datasets: datasetsData.data.map(dataset => ({
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        permission: dataset.permission,
        document_count: dataset.document_count,
        word_count: dataset.word_count,
        created_at: dataset.created_at,
        updated_at: dataset.updated_at
      })),
      pagination: {
        page: datasetsData.page,
        limit: datasetsData.limit,
        total: datasetsData.total,
        has_more: datasetsData.has_more
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: '데이터셋 목록 조회 중 오류가 발생했습니다',
      details: error.message,
      success: false
    }, { status: 500 })
  }
}