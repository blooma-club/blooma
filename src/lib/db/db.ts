import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

class DbConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DbConfigurationError'
  }
}

class DbQueryError extends Error {
  details?: unknown

  constructor(message: string, details?: unknown) {
    super(message)
    this.name = 'DbQueryError'
    this.details = details
  }
}

let adminClient: SupabaseClient | null = null

function getSupabaseAdminConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new DbConfigurationError('Supabase admin client is not configured')
  }

  return { supabaseUrl, serviceRoleKey }
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient
  }

  if (typeof window !== 'undefined') {
    throw new DbConfigurationError('Supabase admin client must be called from a server environment')
  }

  const { supabaseUrl, serviceRoleKey } = getSupabaseAdminConfig()
  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}

export function throwIfSupabaseError(
  error: { message: string } | null,
  context?: Record<string, unknown>
) {
  if (!error) return
  throw new DbQueryError('Database query failed', { error, ...context })
}

export { DbConfigurationError, DbQueryError }
