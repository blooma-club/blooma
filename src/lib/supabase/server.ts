import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { AuthUserProfile } from '@/lib/auth/types'
import { syncAuthUser } from '@/lib/db/users'

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase client is not configured')
  }

  return { supabaseUrl, supabaseAnonKey }
}

export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name, options) {
        cookieStore.set({ name, value: '', ...options })
      },
    },
  })
}

export async function getSupabaseUser(): Promise<User | null> {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    return null
  }

  return data.user ?? null
}

function toAuthUserProfile(user: User): AuthUserProfile {
  const metadata = user.user_metadata ?? {}
  const name =
    (typeof metadata.full_name === 'string' && metadata.full_name) ||
    (typeof metadata.name === 'string' && metadata.name) ||
    null
  const imageUrl =
    (typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
    (typeof metadata.picture === 'string' && metadata.picture) ||
    null

  return {
    id: user.id,
    email: user.email ?? null,
    name,
    imageUrl,
  }
}

export async function getSupabaseUserAndSync(): Promise<User | null> {
  const user = await getSupabaseUser()
  if (!user) {
    return null
  }

  await syncAuthUser(toAuthUserProfile(user))
  return user
}

export async function requireSupabaseUser(): Promise<User> {
  const user = await getSupabaseUserAndSync()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}
