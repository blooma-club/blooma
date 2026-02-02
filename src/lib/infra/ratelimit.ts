/**
 * Rate Limiting Configuration
 * Uses Upstash Redis for distributed rate limiting.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import type { Duration } from '@upstash/ratelimit'

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

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

export type RateLimitType = 'imageGeneration' | 'scriptGeneration'

type RateLimitWindow = '1 m' | '1 h'

const RATE_LIMIT_CONFIGS: Record<
  RateLimitType,
  { requests: number; window: RateLimitWindow & Duration; windowMs: number }[]
> = {
    imageGeneration: [
        { requests: 10, window: '1 m', windowMs: 60 * 1000 },
        { requests: 100, window: '1 h', windowMs: 60 * 60 * 1000 },
    ],
    scriptGeneration: [
        { requests: 5, window: '1 m', windowMs: 60 * 1000 },
        { requests: 50, window: '1 h', windowMs: 60 * 60 * 1000 },
    ],
}

const rateLimiters = new Map<string, Ratelimit>()

function getRateLimiter(type: RateLimitType, configIndex: number): Ratelimit | null {
    const redisClient = getRedis()
    if (!redisClient) return null

    const config = RATE_LIMIT_CONFIGS[type][configIndex]
    if (!config) return null

    const key = `${type}-${configIndex}`
    if (rateLimiters.has(key)) return rateLimiters.get(key)!

    const limiter = new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(config.requests, config.window),
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

export async function checkRateLimit(
    userId: string,
    type: RateLimitType
): Promise<RateLimitResult> {
    const configs = RATE_LIMIT_CONFIGS[type]
    const redisClient = getRedis()

    if (!redisClient) {
        console.warn('[RateLimit] Redis not available - allowing request (protected by credit system)')
        return { success: true, remaining: 999, reset: Date.now() + 60000, limit: 999 }
    }

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

export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
    return {
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
    }
}
