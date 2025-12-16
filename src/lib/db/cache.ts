'use server'

/**
 * In-Memory Cache Layer for D1 Database
 * 
 * 자주 조회되는 데이터를 메모리에 캐싱하여 D1 REST API 호출을 줄입니다.
 * Serverless 환경에서는 요청 간 메모리가 공유되지 않으므로,
 * 이 캐시는 단일 요청 내 또는 warm instance에서만 효과가 있습니다.
 * 
 * 향후 Redis나 Cloudflare KV로 확장 가능합니다.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type CacheEntry<T> = {
    data: T
    expiresAt: number
    createdAt: number
}

type CacheOptions = {
    /** Time-to-live in milliseconds (default: 60000 = 1 minute) */
    ttl?: number
    /** Cache key prefix for namespacing */
    prefix?: string
}

type CacheStats = {
    hits: number
    misses: number
    size: number
    hitRate: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TTL = 60 * 1000 // 1 minute
const MAX_CACHE_SIZE = 1000 // Maximum entries
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

// ─────────────────────────────────────────────────────────────────────────────
// Cache Implementation
// ─────────────────────────────────────────────────────────────────────────────

class MemoryCache {
    private cache = new Map<string, CacheEntry<unknown>>()
    private stats = { hits: 0, misses: 0 }
    private lastCleanup = Date.now()

    /**
     * Get a cached value
     */
    get<T>(key: string): T | null {
        this.maybeCleanup()

        const entry = this.cache.get(key) as CacheEntry<T> | undefined

        if (!entry) {
            this.stats.misses++
            return null
        }

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key)
            this.stats.misses++
            return null
        }

        this.stats.hits++
        return entry.data
    }

    /**
     * Set a cached value
     */
    set<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
        this.maybeCleanup()

        // Evict oldest entries if cache is full
        if (this.cache.size >= MAX_CACHE_SIZE) {
            this.evictOldest(Math.floor(MAX_CACHE_SIZE / 10))
        }

        const now = Date.now()
        this.cache.set(key, {
            data,
            expiresAt: now + ttl,
            createdAt: now,
        })
    }

    /**
     * Delete a cached value
     */
    delete(key: string): boolean {
        return this.cache.delete(key)
    }

    /**
     * Delete all entries matching a prefix
     */
    deleteByPrefix(prefix: string): number {
        let count = 0
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key)
                count++
            }
        }
        return count
    }

    /**
     * Clear all cached values
     */
    clear(): void {
        this.cache.clear()
        this.stats = { hits: 0, misses: 0 }
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        const total = this.stats.hits + this.stats.misses
        return {
            ...this.stats,
            size: this.cache.size,
            hitRate: total > 0 ? this.stats.hits / total : 0,
        }
    }

    /**
     * Cleanup expired entries periodically
     */
    private maybeCleanup(): void {
        const now = Date.now()
        if (now - this.lastCleanup < CLEANUP_INTERVAL) return

        this.lastCleanup = now
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key)
            }
        }
    }

    /**
     * Evict oldest entries
     */
    private evictOldest(count: number): void {
        const entries = [...this.cache.entries()]
            .sort((a, b) => a[1].createdAt - b[1].createdAt)
            .slice(0, count)

        for (const [key] of entries) {
            this.cache.delete(key)
        }
    }
}

// Singleton instance
const cache = new MemoryCache()

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get or compute a cached value
 * 
 * @example
 * ```ts
 * const user = await getOrSet(
 *   `user:${userId}`,
 *   () => getUserById(userId),
 *   { ttl: 5 * 60 * 1000 } // 5 minutes
 * )
 * ```
 */
export async function getOrSet<T>(
    key: string,
    compute: () => Promise<T>,
    options?: CacheOptions
): Promise<T> {
    const fullKey = options?.prefix ? `${options.prefix}:${key}` : key

    const cached = cache.get<T>(fullKey)
    if (cached !== null) {
        return cached
    }

    const data = await compute()
    cache.set(fullKey, data, options?.ttl ?? DEFAULT_TTL)
    return data
}

/**
 * Get a cached value (synchronous)
 */
export function getCached<T>(key: string, prefix?: string): T | null {
    const fullKey = prefix ? `${prefix}:${key}` : key
    return cache.get<T>(fullKey)
}

/**
 * Set a cached value (synchronous)
 */
export function setCached<T>(
    key: string,
    data: T,
    options?: CacheOptions
): void {
    const fullKey = options?.prefix ? `${options.prefix}:${key}` : key
    cache.set(fullKey, data, options?.ttl ?? DEFAULT_TTL)
}

/**
 * Invalidate a cached value
 */
export function invalidateCache(key: string, prefix?: string): boolean {
    const fullKey = prefix ? `${prefix}:${key}` : key
    return cache.delete(fullKey)
}

/**
 * Invalidate all cached values with a prefix
 */
export function invalidateCacheByPrefix(prefix: string): number {
    return cache.deleteByPrefix(prefix)
}

/**
 * Clear entire cache
 */
export function clearCache(): void {
    cache.clear()
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
    return cache.getStats()
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache Key Generators (Helpers)
// ─────────────────────────────────────────────────────────────────────────────

export const CacheKeys = {
    user: (userId: string) => `user:${userId}`,
    userCredits: (userId: string) => `user:credits:${userId}`,
    userSubscription: (userId: string) => `user:subscription:${userId}`,
    project: (projectId: string) => `project:${projectId}`,
    projectsByUser: (userId: string) => `projects:user:${userId}`,
} as const

export const CachePrefixes = {
    USER: 'user',
    PROJECT: 'project',
    SUBSCRIPTION: 'subscription',
} as const

export const CacheTTL = {
    SHORT: 30 * 1000,      // 30 seconds
    MEDIUM: 5 * 60 * 1000,  // 5 minutes
    LONG: 30 * 60 * 1000,   // 30 minutes
    HOUR: 60 * 60 * 1000,   // 1 hour
} as const
