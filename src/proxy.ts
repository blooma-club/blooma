import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
// Security Headers
// ─────────────────────────────────────────────────────────────────────────────

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const

function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

// ─────────────────────────────────────────────────────────────────────────────
// Route Matchers
// ─────────────────────────────────────────────────────────────────────────────

const isProtectedRoute = createRouteMatcher([
  '/studio(.*)',
  '/assets(.*)',
  '/api/studio(.*)',
  '/api/models(.*)',
  '/api/locations(.*)',
  '/api/generate-image(.*)',
  '/api/user(.*)',
])

const isAuthRoute = createRouteMatcher([
  '/auth(.*)',
])

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

export default clerkMiddleware(async (auth, req) => {
  // 인증 관련 라우트는 미들웨어에서 건드리지 않음
  if (isAuthRoute(req)) {
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }

  // 보호되지 않은 라우트는 그대로 통과
  if (!isProtectedRoute(req)) {
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }

  const authResult = await auth()

  // 인증된 사용자는 통과
  if (authResult.userId) {
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }

  // API 라우트는 401 반환
  if (req.nextUrl.pathname.startsWith('/api')) {
    const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return addSecurityHeaders(response)
  }

  // 무한 리다이렉트 방지: 이미 auth 페이지로 가는 중이면 리다이렉트하지 않음
  if (req.nextUrl.pathname === '/auth') {
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }

  // 그 외의 경우 pricing 페이지로 리다이렉트 (Clerk 모달로 로그인 유도)
  const pricingUrl = new URL('/pricing', req.url)
  pricingUrl.searchParams.set('redirect_url', req.url)
  return addSecurityHeaders(NextResponse.redirect(pricingUrl))
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}

