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
  '/dashboard(.*)',
  '/project(.*)',
  '/storyboard(.*)',
  '/api/projects(.*)',
])

const isAuthRoute = createRouteMatcher([
  '/auth(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
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

  // 무한 리다이렉트 방지: 이미 sign-in 페이지로 가는 중이면 리다이렉트하지 않음
  if (req.nextUrl.pathname === '/sign-in' || req.nextUrl.pathname === '/auth') {
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }

  // 그 외의 경우 sign-in으로 리다이렉트
  return authResult.redirectToSignIn({ returnBackUrl: req.url })
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}

