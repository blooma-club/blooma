import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 보호할 라우트 정의
const isProtectedRoute = (pathname: string) => {
  return pathname.startsWith('/dashboard') || 
         pathname.startsWith('/project') || 
         pathname.startsWith('/storyboard')
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        getAll() {
          return req.cookies.getAll()
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: Record<string, unknown>) {
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      } as Parameters<typeof createServerClient>[2]['cookies'],
    }
  )

  // 보호된 라우트에 접근할 때 인증 확인
  if (isProtectedRoute(req.nextUrl.pathname)) {

    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Middleware: Error getting session:', error)
      console.error('Middleware: Error details:', {
        message: error.message,
        status: error.status,
        name: error.name
      })
    }
    

    
    if (!session) {

      // For API routes, return 401 instead of redirecting
      if (req.nextUrl.pathname.startsWith('/api')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      // For page routes, redirect to auth
      return NextResponse.redirect(new URL('/auth', req.url))
    }
    

  }

  return res
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}