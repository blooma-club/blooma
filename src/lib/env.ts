import { z } from 'zod'

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required').optional(),
  SUPABASE_DATABASE_URL: z.string().url().optional(),

  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ENDPOINT: z.string().url().optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET_NAME: z.string().min(1).optional(),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),

  CLOUDFLARE_ACCOUNT_ID: z.string().min(1).optional(),
  CLOUDFLARE_API_BASE_URL: z.string().url().optional(),

  GEMINI_API_KEY: z.string().min(1).optional(),

  POLAR_ACCESS_TOKEN: z.string().min(1).optional(),
  POLAR_API_KEY: z.string().min(1).optional(),
  POLAR_SERVER: z.enum(['sandbox', 'production']).optional(),

  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
})

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_R2_PUBLIC_BASE_URL: z.string().url().optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>
export type ClientEnv = z.infer<typeof clientEnvSchema>

let cachedServerEnv: ServerEnv | null = null
let cachedClientEnv: ClientEnv | null = null

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv
  cachedServerEnv = serverEnvSchema.parse(process.env)
  return cachedServerEnv
}

export function getClientEnv(): ClientEnv {
  if (cachedClientEnv) return cachedClientEnv
  cachedClientEnv = clientEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_R2_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL,
  })
  return cachedClientEnv
}

/**
 * Helper function to check if required storage env vars are set
 */
export function validateStorageEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  const serverEnv = getServerEnv()

  if (!serverEnv.R2_ACCOUNT_ID && !serverEnv.R2_ENDPOINT) {
    missing.push('R2_ACCOUNT_ID or R2_ENDPOINT')
  }
  if (!serverEnv.R2_BUCKET_NAME) missing.push('R2_BUCKET_NAME')
  if (!serverEnv.R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID')
  if (!serverEnv.R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY')

  return { valid: missing.length === 0, missing }
}

/**
 * Helper function to check if Supabase env vars are set
 */
export function validateSupabaseEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  const serverEnv = getServerEnv()

  if (!serverEnv.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  return { valid: missing.length === 0, missing }
}

/**
 * Type-safe access to environment variables
 */
export function getEnv() {
  const serverEnv = getServerEnv()
  return {
    supabase: {
      url: serverEnv.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: serverEnv.SUPABASE_SERVICE_ROLE_KEY,
      databaseUrl: serverEnv.SUPABASE_DATABASE_URL,
    },
    r2: {
      accountId: serverEnv.R2_ACCOUNT_ID,
      endpoint: serverEnv.R2_ENDPOINT,
      accessKeyId: serverEnv.R2_ACCESS_KEY_ID,
      secretAccessKey: serverEnv.R2_SECRET_ACCESS_KEY,
      bucketName: serverEnv.R2_BUCKET_NAME,
      publicBaseUrl: serverEnv.R2_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL,
    },
    gemini: {
      apiKey: serverEnv.GEMINI_API_KEY,
    },
    polar: {
      accessToken: serverEnv.POLAR_ACCESS_TOKEN || serverEnv.POLAR_API_KEY,
      server: serverEnv.POLAR_SERVER,
    },
    app: {
      url: serverEnv.NEXT_PUBLIC_APP_URL,
    },
  }
}
