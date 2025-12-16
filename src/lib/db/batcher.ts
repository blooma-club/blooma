'use server'

/**
 * D1 Query Batcher
 * 
 * 짧은 시간 내에 들어오는 여러 쿼리를 하나의 배치 요청으로 묶어
 * D1 REST API 호출 횟수를 줄입니다.
 * 
 * 사용 예시:
 * - 여러 사용자 정보를 동시에 조회
 * - 여러 프로젝트 메타데이터 조회
 */

import { queryD1Batch } from './d1'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type BatchedQuery<T> = {
    sql: string
    params: unknown[]
    resolve: (result: T[]) => void
    reject: (error: Error) => void
}

type BatcherOptions = {
    /** Maximum wait time before executing batch (ms) */
    maxWaitMs?: number
    /** Maximum number of queries per batch */
    maxBatchSize?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Batcher Implementation
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MAX_WAIT_MS = 10
const DEFAULT_MAX_BATCH_SIZE = 50

class QueryBatcher {
    private queue: BatchedQuery<unknown>[] = []
    private timer: ReturnType<typeof setTimeout> | null = null
    private options: Required<BatcherOptions>

    constructor(options: BatcherOptions = {}) {
        this.options = {
            maxWaitMs: options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS,
            maxBatchSize: options.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE,
        }
    }

    /**
     * Add a query to the batch queue
     */
    async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
        return new Promise((resolve, reject) => {
            this.queue.push({
                sql,
                params,
                resolve: resolve as (result: unknown[]) => void,
                reject,
            })

            // Execute immediately if batch is full
            if (this.queue.length >= this.options.maxBatchSize) {
                this.flush()
            } else {
                // Schedule execution after wait time
                this.scheduleFlush()
            }
        })
    }

    /**
     * Schedule batch execution
     */
    private scheduleFlush(): void {
        if (this.timer) return

        this.timer = setTimeout(() => {
            this.flush()
        }, this.options.maxWaitMs)
    }

    /**
     * Execute all queued queries as a batch
     */
    private async flush(): Promise<void> {
        if (this.timer) {
            clearTimeout(this.timer)
            this.timer = null
        }

        if (this.queue.length === 0) return

        const queries = [...this.queue]
        this.queue = []

        try {
            const statements = queries.map(q => ({
                sql: q.sql,
                params: q.params,
            }))

            const results = await queryD1Batch(statements)

            // Match results to queries
            queries.forEach((query, index) => {
                const result = results[index]
                if (result?.success) {
                    query.resolve(result.results ?? [])
                } else {
                    query.reject(new Error(result?.error ?? 'Query failed'))
                }
            })
        } catch (error) {
            // Reject all pending queries
            const err = error instanceof Error ? error : new Error('Batch query failed')
            queries.forEach(query => query.reject(err))
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Batcher
// ─────────────────────────────────────────────────────────────────────────────

let defaultBatcher: QueryBatcher | null = null

function getDefaultBatcher(): QueryBatcher {
    if (!defaultBatcher) {
        defaultBatcher = new QueryBatcher()
    }
    return defaultBatcher
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Execute a query that will be batched with other concurrent queries
 * 
 * @example
 * ```ts
 * // These queries will be batched together
 * const [user1, user2, user3] = await Promise.all([
 *   batchedQuery<User>('SELECT * FROM users WHERE id = ?', [id1]),
 *   batchedQuery<User>('SELECT * FROM users WHERE id = ?', [id2]),
 *   batchedQuery<User>('SELECT * FROM users WHERE id = ?', [id3]),
 * ])
 * ```
 */
export async function batchedQuery<T>(
    sql: string,
    params: unknown[] = []
): Promise<T[]> {
    return getDefaultBatcher().query<T>(sql, params)
}

/**
 * Get single result from a batched query
 */
export async function batchedQuerySingle<T>(
    sql: string,
    params: unknown[] = []
): Promise<T | null> {
    const results = await batchedQuery<T>(sql, params)
    return results.length > 0 ? results[0] : null
}

/**
 * Create a custom batcher with different options
 */
export function createBatcher(options?: BatcherOptions): {
    query: <T>(sql: string, params?: unknown[]) => Promise<T[]>
    querySingle: <T>(sql: string, params?: unknown[]) => Promise<T | null>
} {
    const batcher = new QueryBatcher(options)

    return {
        query: <T>(sql: string, params: unknown[] = []) => batcher.query<T>(sql, params),
        querySingle: async <T>(sql: string, params: unknown[] = []) => {
            const results = await batcher.query<T>(sql, params)
            return results.length > 0 ? results[0] : null
        },
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get multiple users by IDs in a single batch
 */
export async function getUsersByIds<T>(userIds: string[]): Promise<Map<string, T>> {
    if (userIds.length === 0) return new Map()

    const placeholders = userIds.map(() => '?').join(', ')
    const results = await batchedQuery<T & { id: string }>(
        `SELECT * FROM users WHERE id IN (${placeholders})`,
        userIds
    )

    return new Map(results.map(user => [user.id, user]))
}

// NOTE: getProjectsByIds function removed - projects table deleted with storyboard feature
