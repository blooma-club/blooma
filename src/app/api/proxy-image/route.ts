import { NextRequest, NextResponse } from 'next/server'
import { validateImageUrl } from '@/lib/security'

// 허용된 오리진 (CORS)
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const imageUrl = searchParams.get('url')

  if (!imageUrl) {
    return new NextResponse('Missing url parameter', { status: 400 })
  }

  // SSRF 방어: URL 검증
  const validation = validateImageUrl(imageUrl)
  if (!validation.valid) {
    console.warn('[proxy-image] Blocked request:', { url: imageUrl, reason: validation.reason })
    return new NextResponse(`Forbidden: ${validation.reason}`, { status: 403 })
  }

  try {
    // 타임아웃 추가 (30초)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(validation.url.toString(), {
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const arrayBuffer = await response.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        // CORS: 특정 오리진만 허용 (와일드카드 제거)
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[proxy-image] Request timeout:', imageUrl)
      return new NextResponse('Request timeout', { status: 504 })
    }
    console.error('[proxy-image] Fetch error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
