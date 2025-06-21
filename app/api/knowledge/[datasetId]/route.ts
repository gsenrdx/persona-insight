import { NextRequest, NextResponse } from 'next/server'

// Get specific MISO dataset by ID

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

    // Call MISO API to find specific dataset
    // Note: Using list endpoint since specific dataset endpoint not documented
    const misoResponse = await fetch(`${misoApiUrl}/ext/v1/datasets?page=1&limit=100`, {
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

    const datasetsResponse = await misoResponse.json()
    const targetDataset = datasetsResponse.data.find((dataset: any) => dataset.id === datasetId)

    if (!targetDataset) {
      return NextResponse.json({
        error: '요청한 데이터셋을 찾을 수 없습니다',
        success: false
      }, { status: 404 })
    }
    

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
    return NextResponse.json({
      error: '데이터셋 조회 중 오류가 발생했습니다',
      details: error.message,
      success: false
    }, { status: 500 })
  }
}