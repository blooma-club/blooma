/**
 * Rate Limiting 설정
 * 
 * Upstash Redis를 사용한 분산 Rate Limiting을 구현합니다.
 * AI 생성 엔드포인트에서 악용을 방지하고 비용을 보호합니다.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Upstash Redis 환경변수 확인
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

// Redis 클라이언트 (환경변수가 있을 때만 초기화)
let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis

  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    console.warn('[RateLimit] Upstash Redis not configured. Rate limiting disabled.')
    return null
  }

  try {
    redis = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    })
    return redis
  } catch (error) {
    console.error('[RateLimit] Failed to initialize Redis:', error)
    return null
  }
}

/**
 * Rate Limit 정책
 * 
 * - imageGeneration: 이미지 생성 (분당 10회, 시간당 100회)
 * - videoGeneration: 비디오 생성 (분당 3회, 시간당 20회)
 * - scriptGeneration: 스크립트 생성 (분당 5회, 시간당 50회)
 */
export type RateLimitType = 'imageGeneration' | 'videoGeneration' | 'scriptGeneration'

const RATE_LIMIT_CONFIGS: Record<RateLimitType, { requests: number; window: string; windowMs: number }[]> = {
  imageGeneration: [
    { requests: 10, window: '1 m', windowMs: 60 * 1000 },       // 분당 10회
    { requests: 100, window: '1 h', windowMs: 60 * 60 * 1000 }, // 시간당 100회
  ],
  videoGeneration: [
    { requests: 3, window: '1 m', windowMs: 60 * 1000 },       // 분당 3회
    { requests: 20, window: '1 h', windowMs: 60 * 60 * 1000 }, // 시간당 20회
  ],
  scriptGeneration: [
    { requests: 5, window: '1 m', windowMs: 60 * 1000 },       // 분당 5회
    { requests: 50, window: '1 h', windowMs: 60 * 60 * 1000 }, // 시간당 50회
  ],
}

// Rate Limiter 인스턴스 캐시
const rateLimiters = new Map<string, Ratelimit>()

function getRateLimiter(type: RateLimitType, configIndex: number): Ratelimit | null {
  const redisClient = getRedis()
  if (!redisClient) return null

  const config = RATE_LIMIT_CONFIGS[type][configIndex]
  if (!config) return null

  const key = `${type}-${configIndex}`

  if (rateLimiters.has(key)) {
    return rateLimiters.get(key)!
  }

  const limiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(config.requests, config.window as any),
    analytics: true,
    prefix: `blooma:ratelimit:${type}`,
  })

  rateLimiters.set(key, limiter)
  return limiter
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
  limit: number
}

/**
 * Rate Limit 확인
 * 
 * @param userId - 사용자 ID
 * @param type - Rate Limit 타입
 * @returns Rate Limit 결과 (success가 false면 제한됨)
 * 
 * @example
 * ```ts
 * const result = await checkRateLimit(userId, 'imageGeneration')
 * if (!result.success) {
 *   return ApiError.tooManyRequests('Rate limit exceeded', result.reset)
 * }
 * ```
 */
export async function checkRateLimit(
  userId: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  const configs = RATE_LIMIT_CONFIGS[type]

  // Redis가 설정되지 않은 경우 우회 (크레딧 시스템으로 보호됨)
  const redisClient = getRedis()
  if (!redisClient) {
    console.warn('[RateLimit] Redis not available - allowing request (protected by credit system)')
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 60000,
      limit: 999,
    }
  }

  // 모든 제한을 확인하고 가장 제한적인 결과 반환
  let mostRestrictive: RateLimitResult = {
    success: true,
    remaining: Number.MAX_SAFE_INTEGER,
    reset: Date.now(),
    limit: Number.MAX_SAFE_INTEGER,
  }

  for (let i = 0; i < configs.length; i++) {
    const limiter = getRateLimiter(type, i)
    if (!limiter) continue

    try {
      const result = await limiter.limit(userId)

      if (!result.success) {
        return {
          success: false,
          remaining: result.remaining,
          reset: result.reset,
          limit: configs[i].requests,
        }
      }

      // 가장 적은 remaining을 가진 결과 저장
      if (result.remaining < mostRestrictive.remaining) {
        mostRestrictive = {
          success: true,
          remaining: result.remaining,
          reset: result.reset,
          limit: configs[i].requests,
        }
      }
    } catch (error) {
      console.error(`[RateLimit] Error checking ${type} limit - blocking request:`, error)
      // Rate limit 확인 실패 시 요청 거부 (fail-closed)
      return {
        success: false,
        remaining: 0,
        reset: Date.now() + 60000,
        limit: configs[i].requests,
      }
    }
  }

  return mostRestrictive
}

/**
 * Rate Limit 에러 응답 생성을 위한 헬퍼
 */
export function createRateLimitError(result: RateLimitResult) {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)
  return {
    error: 'Too many requests',
    message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
    retryAfter,
    remaining: result.remaining,
    limit: result.limit,
  }
}

/**
 * Rate Limit 헤더 생성
 */
export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  }
}

