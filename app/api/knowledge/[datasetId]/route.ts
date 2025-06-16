import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { datasetId: string } }
) {
  try {
    const { datasetId } = params

    if (!datasetId) {
      return NextResponse.json({
        error: 'datasetId가 필요합니다',
        success: false
      }, { status: 400 })
    }

    const requestId = `get-dataset-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    console.log(`=== MISO 데이터셋 조회 시작 [${requestId}] ===`)
    console.log('데이터셋 ID:', datasetId)

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

    // MISO API 호출 - 특정 데이터셋 조회
    // 참고: MISO API 문서에서 특정 데이터셋 조회 엔드포인트가 명시되지 않았으므로
    // 목록 조회를 통해 해당 데이터셋을 찾는 방식으로 구현
    const misoResponse = await fetch(`${misoApiUrl}/ext/v1/datasets?page=1&limit=100`, {
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

    const datasetsResponse = await misoResponse.json()
    const targetDataset = datasetsResponse.data.find((dataset: any) => dataset.id === datasetId)

    if (!targetDataset) {
      console.log(`데이터셋을 찾을 수 없음 [${requestId}]: ${datasetId}`)
      return NextResponse.json({
        error: '요청한 데이터셋을 찾을 수 없습니다',
        success: false
      }, { status: 404 })
    }
    
    console.log(`=== MISO 데이터셋 조회 완료 [${requestId}] ===`)
    console.log('데이터셋 정보:', {
      id: targetDataset.id,
      name: targetDataset.name,
      document_count: targetDataset.document_count,
      word_count: targetDataset.word_count
    })

    return NextResponse.json({
      success: true,
      message: '데이터셋을 성공적으로 조회했습니다',
      dataset: {
        id: targetDataset.id,
        name: targetDataset.name,
        description: targetDataset.description,
        permission: targetDataset.permission,
        document_count: targetDataset.document_count,
        word_count: targetDataset.word_count,
        created_at: targetDataset.created_at,
        updated_at: targetDataset.updated_at,
        embedding_available: targetDataset.embedding_available
      }
    })

  } catch (error: any) {
    const requestId = `get-dataset-error-${Date.now()}`
    console.error(`데이터셋 조회 오류 [${requestId}]:`, error)
    
    return NextResponse.json({
      error: '데이터셋 조회 중 오류가 발생했습니다',
      details: error.message,
      success: false
    }, { status: 500 })
  }
}