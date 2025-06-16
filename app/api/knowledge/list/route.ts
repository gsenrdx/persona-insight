import { NextRequest, NextResponse } from 'next/server'

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

    const requestId = `list-datasets-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    console.log(`=== MISO 데이터셋 목록 조회 시작 [${requestId}] ===`)
    console.log('페이지:', page, '한계:', limit)

    // MISO API 키 확인
    const misoApiKey = process.env.MISO_KNOWLEDGE_API_KEY
    const misoApiUrl = process.env.MISO_API_URL

    if (!misoApiKey) {
      console.error('MISO_KNOWLEDGE_API_KEY 환경 변수가 설정되지 않았습니다')
      return NextResponse.json({
        error: 'MISO Knowledge API 키가 설정되지 않았습니다',
        success: false
      }, { status: 500 })
    }

    if (!misoApiUrl) {
      console.error('MISO_API_URL 환경 변수가 설정되지 않았습니다')
      return NextResponse.json({
        error: 'MISO API URL이 설정되지 않았습니다',
        success: false
      }, { status: 500 })
    }

    // MISO API 호출
    const misoResponse = await fetch(`${misoApiUrl}/ext/v1/datasets?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${misoApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!misoResponse.ok) {
      const errorText = await misoResponse.text()
      console.error(`MISO API 호출 실패 [${requestId}]:`, {
        status: misoResponse.status,
        statusText: misoResponse.statusText,
        error: errorText
      })
      
      return NextResponse.json({
        error: 'MISO API 호출에 실패했습니다',
        details: errorText,
        success: false
      }, { status: misoResponse.status })
    }

    const datasetsData: MisoDatasetListResponse = await misoResponse.json()
    
    console.log(`=== MISO 데이터셋 목록 조회 완료 [${requestId}] ===`)
    console.log('조회된 데이터셋 수:', datasetsData.data.length)
    console.log('전체 데이터셋 수:', datasetsData.total)
    console.log('다음 페이지 존재:', datasetsData.has_more)

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
    const requestId = `list-datasets-error-${Date.now()}`
    console.error(`데이터셋 목록 조회 오류 [${requestId}]:`, error)
    
    return NextResponse.json({
      error: '데이터셋 목록 조회 중 오류가 발생했습니다',
      details: error.message,
      success: false
    }, { status: 500 })
  }
}