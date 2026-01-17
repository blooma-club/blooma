import 'server-only'

import { getUserById, type UserRecord } from '@/lib/db/users'

/**
 * Checks if a subscription tier represents an active paid plan.
 */
function isActiveTier(tier: UserRecord['subscription_tier']): boolean {
  if (!tier) return false
  const normalized = tier.toLowerCase()
  // 실제 플랜: 'Small Brands', 'Agency', 'Studio'만 활성 구독으로 간주
  return normalized === 'small brands' || normalized === 'agency' || normalized === 'studio'
}

/**
 * Checks if a subscription status represents an active subscription.
 */
function isActiveStatus(status: string | null | undefined): boolean {
  if (!status) return false
  const normalized = status.toLowerCase()
  // 'active', 'trialing'은 활성 구독
  // 'canceled'는 cancel_at_period_end가 true이고 기간 내라면 여전히 활성
  return normalized === 'active' || normalized === 'trialing'
}

/**
 * Checks if the current period is still valid (not expired).
 */
function isPeriodValid(periodEnd: string | null | undefined): boolean {
  if (!periodEnd) return true // No period end means we can't check, assume valid

  try {
    const endDate = new Date(periodEnd)
    return endDate > new Date()
  } catch {
    return true // If parsing fails, assume valid
  }
}

/**
 * Evaluates subscription status from the user record with full metadata.
 * Supports cancel_at_period_end: subscription is still active until period ends.
 */
function evaluateSubscription(user: UserRecord | null): boolean {
  if (!user) return false

  const { subscription_tier, subscription_status, current_period_end, cancel_at_period_end } = user

  // Case 1: Status is explicitly active or trialing
  if (isActiveStatus(subscription_status)) {
    return true
  }

  // Case 2: Canceled but cancel_at_period_end is true and period hasn't ended
  if (
    subscription_status?.toLowerCase() === 'canceled' &&
    cancel_at_period_end === true &&
    isPeriodValid(current_period_end)
  ) {
    // User canceled but still has access until period end
    return isActiveTier(subscription_tier)
  }

  // Case 3: Fallback to tier only (for backwards compatibility with old records)
  // Only if status is not explicitly revoked/ended
  if (
    !subscription_status ||
    !['revoked', 'ended'].includes(subscription_status.toLowerCase())
  ) {
    return isActiveTier(subscription_tier)
  }

  return false
}

/**
 * Determines if a user has an active subscription.
 * 
 * Uses the following logic:
 * 1. Check database for subscription_status + current_period_end
 * 2. Support cancel_at_period_end - user retains access until period ends
 * 
 * @param userId Supabase auth user ID
 * @returns true if user has an active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  let userRecord: UserRecord | null = null

  try {
    userRecord = await getUserById(userId)
  } catch (error) {
    console.error('Unable to load user when resolving subscription status', error)
  }

  // Primary check: database with full subscription metadata
  return evaluateSubscription(userRecord)
}

/**
 * Gets detailed subscription information for a user.
 * Useful for displaying subscription status in UI.
 */
export async function getSubscriptionDetails(userId: string): Promise<{
  isActive: boolean
  tier: string | null
  status: string | null
  periodEnd: string | null
  willCancel: boolean
}> {
  let userRecord: UserRecord | null = null

  try {
    userRecord = await getUserById(userId)
  } catch (error) {
    console.error('Unable to load user for subscription details', error)
  }

  return {
    isActive: evaluateSubscription(userRecord),
    tier: userRecord?.subscription_tier ?? null,
    status: userRecord?.subscription_status ?? null,
    periodEnd: userRecord?.current_period_end ?? null,
    willCancel: userRecord?.cancel_at_period_end ?? false,
  }
}

