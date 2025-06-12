import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    // 인증 코드가 있으면 confirm 페이지로 리다이렉트 (코드 포함)
    const confirmUrl = new URL('/auth/confirm', requestUrl.origin)
    confirmUrl.searchParams.set('code', code)
    return NextResponse.redirect(confirmUrl)
  }

  // 코드가 없으면 로그인 페이지로 리다이렉트
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}