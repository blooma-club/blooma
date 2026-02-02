import 'server-only'

import { getSupabaseAdminClient, throwIfSupabaseError } from '@/lib/db/db'
import { grantCreditsWithResetDate, type UserRecord } from '@/lib/db/users'
import { ensureUserExists } from '@/lib/db/sync'
import { recordCreditTransaction } from '@/lib/db/creditTransactions'
import { getModelInfo } from '@/lib/google-ai/client'

// ============================================================================
// Credit Utils & Types
// ============================================================================

export class InsufficientCreditsError extends Error {
  constructor(message = 'Insufficient credits') {
    super(message)
    this.name = 'InsufficientCreditsError'
  }
}

const parsePositiveInt = (val: string | undefined, def: number) => {
  const n = parseInt(val || '', 10)
  return n > 0 ? n : def
}

export const CREDIT_COSTS = {
  IMAGE: parsePositiveInt(process.env.CREDIT_COST_IMAGE, 1),
  IMAGE_EDIT: parsePositiveInt(process.env.CREDIT_COST_IMAGE_EDIT, 1),
} as const

export function getCreditCostForModel(
  modelId: string,
  fallbackCategory: keyof typeof CREDIT_COSTS = 'IMAGE',
  options?: { resolution?: string }
): number {
  const info = getModelInfo(modelId)
  if (info && info.credits > 0) {
    let cost = Math.ceil(info.credits)
    if (modelId === 'gemini-3-pro-image-preview' && options?.resolution === '4K') {
      cost *= 2
    }
    return cost
  }
  return CREDIT_COSTS[fallbackCategory]
}

// ============================================================================
// Subscription / Plan Logic (Stubbed/Simplified)
// ============================================================================
// Note: Ideally this comes from a dedicated billing module, but for single-file:

function getCreditsForPlan(planId: string | null): number {
  if (!planId) return 0
  // Simplified mapping
  const lower = planId.toLowerCase()
  if (lower.includes('pro')) return 1000
  if (lower.includes('standard')) return 500
  return 0
}

function isPlanId(planId: string | null): boolean {
  return !!planId
}

// ============================================================================
// Core Credit Logic
// ============================================================================

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

// ... helper functions like isActiveTier, etc. ...
function isActiveTier(tier: string | null | undefined): boolean {
  return !!tier // Simplified
}
function isActiveStatus(status: string | null | undefined): boolean {
  const s = status?.toLowerCase()
  return s === 'active' || s === 'trialing'
}
function isPeriodValid(endStr: string | null | undefined): boolean {
  const end = parseDate(endStr)
  return end ? end > new Date() : true
}

function isActiveSubscriptionRecord(user: UserRecord): boolean {
  if (isActiveStatus(user.subscription_status)) return true
  // Simplified logic
  return false
}

export async function syncSubscriptionCredits(user: UserRecord): Promise<UserRecord> {
  // Simplified sync logic placeholders to match original signature
  if (!user.subscription_tier) return user
  // ... Original logic ...
  return user
}

export async function ensureCredits(
  userId: string,
  required: number
): Promise<{
  total: number
  used: number
  remaining: number
}> {
  const user = await ensureUserExists(userId)
  const syncedUser = await syncSubscriptionCredits(user)

  const total = syncedUser.credits ?? 0
  const used = syncedUser.credits_used ?? 0
  const remaining = Math.max(total - used, 0)

  if (remaining < required) {
    throw new InsufficientCreditsError()
  }
  return { total, used, remaining }
}

export async function consumeCredits(
  userId: string,
  amount: number,
  options?: { description?: string; referenceId?: string }
): Promise<{ total: number; used: number; remaining: number }> {
  if (amount <= 0) return ensureCredits(userId, 0)

  let updated: { credits: number | null; credits_used: number | null } | null = null
  let resolvedUserId: string | null = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const user = await ensureUserExists(userId)
    resolvedUserId = user.id
    const total = user.credits ?? 0
    const used = user.credits_used ?? 0
    const remaining = Math.max(total - used, 0)
    if (remaining < amount) {
      throw new InsufficientCreditsError()
    }

    const nextUsed = used + amount
    const supabase = getSupabaseAdminClient()
    let query = supabase
      .from('users')
      .update({ credits_used: nextUsed, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (user.credits_used === null || user.credits_used === undefined) {
      query = query.is('credits_used', null)
    } else {
      query = query.eq('credits_used', user.credits_used)
    }

    const { data, error } = await query.select('credits, credits_used')
    throwIfSupabaseError(error, { action: 'consume', userId })

    if (Array.isArray(data) && data[0]) {
      updated = data[0]
      break
    }
  }

  if (!updated) {
    throw new Error('Failed to consume credits due to concurrent updates')
  }

  const total = updated.credits ?? 0
  const used = updated.credits_used ?? 0
  const remaining = Math.max(total - used, 0)

  await recordCreditTransaction({
    user_id: resolvedUserId || userId,
    amount: -amount,
    type: 'consume',
    description: options?.description || 'consumption',
    reference_id: options?.referenceId,
    balance_after: remaining,
  }).catch(console.warn)

  return { total, used, remaining }
}

export async function refundCredits(
  userId: string,
  amount: number,
  options?: { description?: string; referenceId?: string }
): Promise<{ total: number; used: number; remaining: number }> {
  if (amount <= 0) return ensureCredits(userId, 0)

  let updated: { credits: number | null; credits_used: number | null } | null = null
  let resolvedUserId: string | null = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const user = await ensureUserExists(userId)
    resolvedUserId = user.id
    const total = user.credits ?? 0
    const used = user.credits_used ?? 0
    const nextUsed = Math.max(used - amount, 0)

    const supabase = getSupabaseAdminClient()
    let query = supabase
      .from('users')
      .update({ credits_used: nextUsed, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (user.credits_used === null || user.credits_used === undefined) {
      query = query.is('credits_used', null)
    } else {
      query = query.eq('credits_used', user.credits_used)
    }

    const { data, error } = await query.select('credits, credits_used')
    throwIfSupabaseError(error, { action: 'refund', userId })

    if (Array.isArray(data) && data[0]) {
      updated = data[0]
      break
    }
  }

  if (!updated) {
    throw new Error('Failed to refund credits due to concurrent updates')
  }

  const total = updated.credits ?? 0
  const used = updated.credits_used ?? 0
  const remaining = Math.max(total - used, 0)

  await recordCreditTransaction({
    user_id: resolvedUserId || userId,
    amount: amount,
    type: 'refund',
    description: options?.description || 'refund',
    reference_id: options?.referenceId,
    balance_after: remaining,
  }).catch(console.warn)

  return { total, used, remaining }
}

export async function withCreditConsumption<T>(
  userId: string,
  amount: number,
  job: () => Promise<T>,
  shouldRefundOnSuccess?: (result: T) => boolean
): Promise<T> {
  await consumeCredits(userId, amount)
  try {
    const result = await job()
    if (shouldRefundOnSuccess?.(result)) {
      await refundCredits(userId, amount)
    }
    return result
  } catch (e) {
    await refundCredits(userId, amount).catch(() => {})
    throw e
  }
}
