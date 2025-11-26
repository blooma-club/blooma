/**
 * 환경 변수 검증 및 타입 안전성 보장
 */

import { z } from 'zod'

/**
 * 환경 변수 스키마
 */
const envSchema = z.object({
  // Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'Clerk publishable key is required'),
  CLERK_SECRET_KEY: z.string().min(1).optional(), // Server-side only
  
  // Fal AI (서버 사이드 전용 - NEXT_PUBLIC_ 접두사 사용 금지)
  FAL_KEY: z.string().min(1, 'FAL_KEY is required').optional(),
  
  // Cloudflare D1
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1, 'Cloudflare Account ID is required').optional(),
  CLOUDFLARE_D1_DATABASE_ID: z.string().min(1, 'Cloudflare D1 Database ID is required').optional(),
  CLOUDFLARE_D1_API_TOKEN: z.string().min(1, 'Cloudflare D1 API Token is required').optional(),
  CLOUDFLARE_API_BASE_URL: z.string().url().optional(),
  
  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().min(1, 'R2 Account ID is required').optional(),
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2 Access Key ID is required').optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2 Secret Access Key is required').optional(),
  R2_BUCKET_NAME: z.string().min(1, 'R2 Bucket Name is required').optional(),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),
  
  // OpenRouter
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1).optional(),
  
  // App Configuration
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid APP URL format').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // API Configuration
  API_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default(30000),
})

/**
 * 검증된 환경 변수 타입
 */
type Env = z.infer<typeof envSchema>

/**
 * 환경 변수 검증 및 반환
 * 
 * @throws {Error} 환경 변수가 유효하지 않은 경우
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const messages = result.error.issues.map((err) => `${err.path.map(String).join('.')}: ${err.message}`).join('\n')
    throw new Error(`Environment variable validation failed:\n${messages}`)
  }
  return result.data
}

/**
 * 환경 변수 접근 (타입 안전)
 * 
 * 모든 환경에서 엄격하게 검증하여 필수 환경변수 누락 시 배포가 실패하도록 합니다.
 */
let cachedEnv: Env | null = null

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv
  }

  // 모든 환경에서 엄격하게 검증
  cachedEnv = validateEnv()
  return cachedEnv
}

/**
 * 특정 환경 변수 안전하게 가져오기
 */
export function getEnvVar<K extends keyof Env>(key: K): Env[K] {
  return getEnv()[key]
}

/**
 * 환경 변수가 개발 모드인지 확인
 */
export function isDevelopment(): boolean {
  return getEnvVar('NODE_ENV') === 'development'
}

/**
 * 환경 변수가 프로덕션 모드인지 확인
 */
export function isProduction(): boolean {
  return getEnvVar('NODE_ENV') === 'production'
}
