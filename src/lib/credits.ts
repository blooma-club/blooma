'use server'

import { queryD1, queryD1Single } from '@/lib/db/d1'
import { getCreditsForPlan, isPlanId } from '@/lib/billing/plans'
import { grantCreditsWithResetDate, type D1UserRecord } from '@/lib/db/users'
import { ensureUserExists } from '@/lib/db/sync'
import { InsufficientCreditsError } from '@/lib/credits-utils'

async function getUsersIdColumn(): Promise<'id' | 'user_id'> {
  const rows = await queryD1<{ name?: string }>('PRAGMA table_info(users)')
  const names = new Set(rows.map(r => r.name).filter(Boolean) as string[])
  if (names.has('id')) return 'id'
  if (names.has('user_id')) return 'user_id'
  throw new Error('users table is missing an identifier column ("id" or "user_id")')
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  const day = next.getDate()
  next.setDate(1)
  next.setMonth(next.getMonth() + months)
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(day, lastDay))
  return next
}

function isActiveTier(tier: string | null | undefined): boolean {
  if (!tier) return false
  const normalized = tier.toLowerCase()
  return normalized === 'small brands' || normalized === 'agency' || normalized === 'studio'
}

function isActiveStatus(status: string | null | undefined): boolean {
  if (!status) return false
  const normalized = status.toLowerCase()
  return normalized === 'active' || normalized === 'trialing'
}

function isPeriodValid(periodEnd: string | null | undefined): boolean {
  const end = parseDate(periodEnd ?? null)
  if (!end) return true
  return end > new Date()
}

function isActiveSubscriptionRecord(user: D1UserRecord): boolean {
  const status = user.subscription_status

  if (isActiveStatus(status)) return true

  if (
    status?.toLowerCase() === 'canceled' &&
    user.cancel_at_period_end === true &&
    isPeriodValid(user.current_period_end)
  ) {
    return isActiveTier(user.subscription_tier)
  }

  if (!status || !['revoked', 'ended'].includes(status.toLowerCase())) {
    return isActiveTier(user.subscription_tier)
  }

  return false
}

function isYearlySubscription(user: D1UserRecord): boolean {
  const start = parseDate(user.current_period_start ?? null)
  const end = parseDate(user.current_period_end ?? null)
  if (!start || !end) return false
  const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  return days >= 300
}

export async function syncSubscriptionCredits(user: D1UserRecord): Promise<D1UserRecord> {
  if (!isActiveSubscriptionRecord(user)) return user
  if (!isYearlySubscription(user)) return user
  if (!isPlanId(user.subscription_tier)) return user

  const monthlyCredits = getCreditsForPlan(user.subscription_tier)
  if (monthlyCredits <= 0) return user

  const periodStart = parseDate(user.current_period_start ?? null)
  if (!periodStart) return user

  const now = new Date()
  const originalReset = parseDate(user.credits_reset_date ?? null)
  let nextReset = originalReset
  let resetAdjusted = false

  if (!nextReset || nextReset < periodStart) {
    nextReset = periodStart
    resetAdjusted = true
  }

  if (nextReset > now) {
    if (resetAdjusted) {
      const nextResetIso = nextReset.toISOString()
      await grantCreditsWithResetDate(user.id, 0, nextResetIso)
      return { ...user, credits_reset_date: nextResetIso }
    }
    return user
  }

  let grants = 0
  let cursor = nextReset
  const maxGrants = 12

  while (cursor <= now && grants < maxGrants) {
    grants += 1
    cursor = addMonths(cursor, 1)
  }

  if (grants <= 0) {
    return user
  }

  const totalGrant = monthlyCredits * grants
  const nextResetIso = cursor.toISOString()
  await grantCreditsWithResetDate(user.id, totalGrant, nextResetIso)

  const currentCredits = typeof user.credits === 'number' && Number.isFinite(user.credits)
    ? user.credits
    : 0

  return {
    ...user,
    credits: currentCredits + totalGrant,
    credits_reset_date: nextResetIso,
  }
}

export async function ensureCredits(userId: string, required: number): Promise<{
  total: number
  used: number
  remaining: number
}> {
  // Use JIT sync to ensure user exists
  const user = await ensureUserExists(userId)
  const syncedUser = await syncSubscriptionCredits(user)
  const total = typeof syncedUser?.credits === 'number' && Number.isFinite(syncedUser.credits)
    ? syncedUser.credits
    : 0
  const used = typeof syncedUser?.credits_used === 'number' && Number.isFinite(syncedUser.credits_used)
    ? syncedUser.credits_used
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
  const user = await ensureUserExists(userId)
  await syncSubscriptionCredits(user)

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
