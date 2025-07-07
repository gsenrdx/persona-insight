import { NextResponse } from 'next/server'

/**
 * Health check endpoint
 * 네트워크 품질 측정을 위한 경량 엔드포인트
 */
export async function GET() {
  return NextResponse.json(
    { 
      status: 'ok',
      timestamp: Date.now()
    },
    { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }
  )
}

export async function HEAD() {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
}