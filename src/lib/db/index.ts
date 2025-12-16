/**
 * Database Layer Index
 * 
 * 모든 데이터베이스 관련 유틸리티를 중앙에서 export합니다.
 */

// Core D1 utilities
export {
    queryD1,
    queryD1Single,
    queryD1Batch,
    D1ConfigurationError,
    D1QueryError,
} from './d1'

// Cached queries
export {
    cachedQueryD1,
    cachedQueryD1Single,
    invalidateUserCache,
    invalidateProjectCache,
    invalidateSubscriptionCache,
    getCachedUserById,
    getCachedUserCredits,
    getCachedUserSubscription,
} from './cachedQueries'

// Cache utilities
export {
    getOrSet,
    getCached,
    setCached,
    invalidateCache,
    invalidateCacheByPrefix,
    clearCache,
    getCacheStats,
    CacheKeys,
    CachePrefixes,
    CacheTTL,
} from './cache'

// Query batcher
export {
    batchedQuery,
    batchedQuerySingle,
    createBatcher,
    getUsersByIds,
    // NOTE: getProjectsByIds removed - projects table deleted
} from './batcher'
