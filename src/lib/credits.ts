'use server'

import { queryD1, queryD1Single } from '@/lib/db/d1'
import { getUserById } from '@/lib/db/users'
import { ensureUserExists } from '@/lib/db/sync'
import { InsufficientCreditsError } from '@/lib/credits-utils'

async function getUsersIdColumn(): Promise<'id' | 'user_id'> {
  const rows = await queryD1<{ name?: string }>('PRAGMA table_info(users)')
  const names = new Set(rows.map(r => r.name).filter(Boolean) as string[])
  if (names.has('id')) return 'id'
  if (names.has('user_id')) return 'user_id'
  throw new Error('users table is missing an identifier column ("id" or "user_id")')
}

export async function ensureCredits(userId: string, required: number): Promise<{
  total: number
  used: number
  remaining: number
}> {
  // Use JIT sync to ensure user exists
  const user = await ensureUserExists(userId)
  const total = typeof user?.credits === 'number' && Number.isFinite(user.credits) ? user.credits : 0
  const used = typeof user?.credits_used === 'number' && Number.isFinite(user.credits_used)
    ? user.credits_used
    : 0
  const remaining = Math.max(total - used, 0)
  if (remaining < required) {
    throw new InsufficientCreditsError()
  }
  return { total, used, remaining }
}

/**
 * Atomically consume credits if available. Throws InsufficientCreditsError if not enough.
 */
export async function consumeCredits(userId: string, amount: number): Promise<{
  total: number
  used: number
  remaining: number
}> {
  if (amount <= 0) {
    return ensureCredits(userId, 0)
  }

  // Ensure user exists before attempting UPDATE
  await ensureUserExists(userId)

  const idColumn = await getUsersIdColumn()
  const sql = `UPDATE users
SET credits_used = COALESCE(credits_used, 0) + ?1
WHERE ${idColumn} = ?2
  AND (COALESCE(credits, 0) - COALESCE(credits_used, 0)) >= ?3
RETURNING COALESCE(credits, 0) AS credits, COALESCE(credits_used, 0) AS credits_used`

  const updated = await queryD1Single<{ credits: number; credits_used: number }>(sql, [
    amount,
    userId,
    amount,
  ])

  if (!updated) {
    throw new InsufficientCreditsError()
  }

  const total = typeof updated.credits === 'number' ? updated.credits : 0
  const used = typeof updated.credits_used === 'number' ? updated.credits_used : 0
  const remaining = Math.max(total - used, 0)
  return { total, used, remaining }
}

/**
 * Refund previously consumed credits (best-effort). Ensures credits_used does not go negative.
 */
export async function refundCredits(userId: string, amount: number): Promise<{
  total: number
  used: number
  remaining: number
}> {
  if (amount <= 0) {
    return ensureCredits(userId, 0)
  }

  const idColumn = await getUsersIdColumn()
  const sql = `UPDATE users
SET credits_used = MAX(COALESCE(credits_used, 0) - ?1, 0)
WHERE ${idColumn} = ?2
RETURNING COALESCE(credits, 0) AS credits, COALESCE(credits_used, 0) AS credits_used`

  const updated = await queryD1Single<{ credits: number; credits_used: number }>(sql, [
    amount,
    userId,
  ])

  const total = typeof updated?.credits === 'number' ? updated.credits : 0
  const used = typeof updated?.credits_used === 'number' ? updated.credits_used : 0
  const remaining = Math.max(total - used, 0)
  return { total, used, remaining }
}

/**
 * Helper to consume credits, run an async job, and auto-refund on failure or placeholder generation.
 * The predicate controls refund when the job succeeded but should not be charged (e.g., placeholder output).
 */
export async function withCreditConsumption<T>(
  userId: string,
  amount: number,
  job: () => Promise<T>,
  shouldRefundOnSuccess?: (result: T) => boolean,
): Promise<T> {
  await consumeCredits(userId, amount)
  try {
    const result = await job()
    const needRefund = shouldRefundOnSuccess?.(result) === true
    if (needRefund) {
      await refundCredits(userId, amount)
    }
    return result
  } catch (e) {
    try {
      await refundCredits(userId, amount)
    } catch {
      // best-effort refund
    }
    throw e
  }
}
