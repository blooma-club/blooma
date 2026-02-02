import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

class DbConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DbConfigurationError'
  }
}

let adminClient: SupabaseClient | null = null

export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient
  }

  if (typeof window !== 'undefined') {
    throw new DbConfigurationError('Supabase admin client must be called from a server environment')
  }

  const url = env.supabase.url
  const key = env.supabase.serviceRoleKey || env.supabase.anonKey

  if (!url || !key) {
    throw new DbConfigurationError('Supabase URL and key must be configured')
  }

  adminClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}

export { DbConfigurationError }
