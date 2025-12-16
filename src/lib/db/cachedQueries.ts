'use server'

/**
 * Cached D1 Query Utilities
 * 
 * D1 쿼리에 캐싱 레이어를 적용하여 중복 쿼리를 줄입니다.
 * 읽기 전용 쿼리에만 사용하세요.
 */

import { queryD1, queryD1Single } from './d1'
import {
    getOrSet,
    invalidateCache,
    invalidateCacheByPrefix,
    CacheTTL,
} from './cache'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type CachedQueryOptions = {
    /** Cache key - must be unique for the query */
    cacheKey: string
    /** Time-to-live in milliseconds */
    ttl?: number
    /** Skip cache and always execute query */
    skipCache?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Cached Query Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Execute a D1 query with caching
 * 
 * @example
 * ```ts
 * const users = await cachedQueryD1<User>(
 *   'SELECT * FROM users WHERE active = 1',
 *   [],
 *   { cacheKey: 'active-users', ttl: CacheTTL.MEDIUM }
 * )
 * ```
 */
export async function cachedQueryD1<T = unknown>(
    sql: string,
    params: unknown[] = [],
    options: CachedQueryOptions
): Promise<T[]> {
    if (options.skipCache) {
        return queryD1<T>(sql, params)
    }

    return getOrSet(
        options.cacheKey,
        () => queryD1<T>(sql, params),
        { ttl: options.ttl ?? CacheTTL.MEDIUM }
    )
}

/**
 * Execute a D1 single-row query with caching
 * 
 * @example
 * ```ts
 * const user = await cachedQueryD1Single<User>(
 *   'SELECT * FROM users WHERE id = ?',
 *   [userId],
 *   { cacheKey: `user:${userId}`, ttl: CacheTTL.MEDIUM }
 * )
 * ```
 */
export async function cachedQueryD1Single<T = unknown>(
    sql: string,
    params: unknown[] = [],
    options: CachedQueryOptions
): Promise<T | null> {
    if (options.skipCache) {
        return queryD1Single<T>(sql, params)
    }

    return getOrSet(
        options.cacheKey,
        () => queryD1Single<T>(sql, params),
        { ttl: options.ttl ?? CacheTTL.MEDIUM }
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache Invalidation Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Invalidate user-related caches when user data changes
 */
export function invalidateUserCache(userId: string): void {
    invalidateCache(`user:${userId}`)
    invalidateCache(`user:credits:${userId}`)
    invalidateCache(`user:subscription:${userId}`)
    invalidateCacheByPrefix(`projects:user:${userId}`)
}

/**
 * Invalidate project-related caches
 */
export function invalidateProjectCache(projectId: string, userId?: string): void {
    invalidateCache(`project:${projectId}`)
    if (userId) {
        invalidateCacheByPrefix(`projects:user:${userId}`)
    }
}

/**
 * Invalidate subscription cache when billing events occur
 */
export function invalidateSubscriptionCache(userId: string): void {
    invalidateCache(`user:subscription:${userId}`)
    invalidateCache(`user:${userId}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Prebuilt Cached Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get user by ID with caching
 */
export async function getCachedUserById<T>(userId: string): Promise<T | null> {
    return cachedQueryD1Single<T>(
        `SELECT * FROM users WHERE id = ?`,
        [userId],
        {
            cacheKey: `user:${userId}`,
            ttl: CacheTTL.SHORT, // 30 seconds - user data changes frequently
        }
    )
}

/**
 * Get user credits with caching
 */
export async function getCachedUserCredits(userId: string): Promise<{
    credits: number
    credits_used: number
} | null> {
    return cachedQueryD1Single(
        `SELECT credits, credits_used FROM users WHERE id = ?`,
        [userId],
        {
            cacheKey: `user:credits:${userId}`,
            ttl: CacheTTL.SHORT, // 30 seconds - credits change often
        }
    )
}

/**
 * Get user subscription info with caching
 */
export async function getCachedUserSubscription(userId: string): Promise<{
    subscription_tier: string | null
    subscription_status: string | null
    current_period_end: string | null
    cancel_at_period_end: number
} | null> {
    return cachedQueryD1Single(
        `SELECT subscription_tier, subscription_status, current_period_end, cancel_at_period_end 
     FROM users WHERE id = ?`,
        [userId],
        {
            cacheKey: `user:subscription:${userId}`,
            ttl: CacheTTL.MEDIUM, // 5 minutes - subscription changes rarely
        }
    )
}
