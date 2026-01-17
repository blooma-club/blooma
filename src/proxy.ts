import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const

const PROTECTED_ROUTES = [
  /^\/studio(.*)/,
  /^\/assets(.*)/,
  /^\/api\/studio(.*)/,
  /^\/api\/models(.*)/,
  /^\/api\/locations(.*)/,
  /^\/api\/generate-image(.*)/,
  /^\/api\/user(.*)/,
]

const AUTH_ROUTES = [/^\/auth(.*)/]

function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

function matchesRoute(patterns: RegExp[], pathname: string): boolean {
  return patterns.some((pattern) => pattern.test(pathname))
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return addSecurityHeaders(response)
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options })
      },
      remove(name, options) {
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const pathname = request.nextUrl.pathname

  if (matchesRoute(AUTH_ROUTES, pathname)) {
    return addSecurityHeaders(response)
  }

  if (!matchesRoute(PROTECTED_ROUTES, pathname)) {
    return addSecurityHeaders(response)
  }

  const { data } = await supabase.auth.getUser()

  if (data.user) {
    return addSecurityHeaders(response)
  }

  if (pathname.startsWith('/api')) {
    return addSecurityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  }

  const pricingUrl = new URL('/pricing', request.url)
  pricingUrl.searchParams.set('redirect_url', request.url)
  return addSecurityHeaders(NextResponse.redirect(pricingUrl))
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
