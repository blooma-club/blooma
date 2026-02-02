import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

let warnedMissingSupabaseEnv = false

function getSupabaseConfig(): { supabaseUrl: string; supabaseAnonKey: string } | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!warnedMissingSupabaseEnv) {
      warnedMissingSupabaseEnv = true
      console.warn(
        '[supabase-middleware] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set; skipping auth middleware.'
      )
    }
    return null
  }

  return { supabaseUrl, supabaseAnonKey }
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const config = getSupabaseConfig()
  if (!config) {
    return response
  }

  const { supabaseUrl, supabaseAnonKey } = config
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (request.nextUrl.pathname.startsWith('/studio') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (request.nextUrl.pathname.startsWith('/auth') && user) {
    if (request.nextUrl.pathname.startsWith('/auth/callback')) {
      return response
    }
    const url = request.nextUrl.clone()
    url.pathname = '/studio/create'
    return NextResponse.redirect(url)
  }

  return response
}
