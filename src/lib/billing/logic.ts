import 'server-only'
import { getUserById, type UserRecord } from '@/lib/db/users'
import {
    type PlanId,
    type BillingInterval,
    PLAN_IDS,
    PLAN_CREDIT_TOPUPS,
    PLAN_TIER_ORDER
} from '@/lib/constants'

export { type PlanId, type BillingInterval, PLAN_CREDIT_TOPUPS }

// ============================================================================
// Plans Configuration
// ============================================================================

type PlanProductConfig = {
    monthlyEnvVar: string
    yearlyEnvVar: string
    fallbackMonthlyId: string
    fallbackYearlyId: string
    legacyEnvVar?: string
}

const PLAN_PRODUCT_CONFIGS: Record<PlanId, PlanProductConfig> = {
    'Small Brands': {
        monthlyEnvVar: 'POLAR_BLOOMA_SMALL_BRANDS_PRODUCT_ID',
        yearlyEnvVar: 'POLAR_BLOOMA_SMALL_BRANDS_YEARLY_PRODUCT_ID',
        legacyEnvVar: 'POLAR_BLOOMA_STARTER_PRODUCT_ID',
        fallbackMonthlyId: 'd745917d-ec02-4a2d-b7bb-fd081dc59cf9',
        fallbackYearlyId: '7dbbd08a-5a5d-48f4-9293-beb7dfaadc6f',
    },
    'Agency': {
        monthlyEnvVar: 'POLAR_BLOOMA_AGENCY_PRODUCT_ID',
        yearlyEnvVar: 'POLAR_BLOOMA_AGENCY_YEARLY_PRODUCT_ID',
        legacyEnvVar: 'POLAR_BLOOMA_PRO_PRODUCT_ID',
        fallbackMonthlyId: '4afac01f-6437-41b6-9255-87114906fd4e',
        fallbackYearlyId: 'a7310f15-c1e0-48bf-86fe-83bdda9ace00',
    },
    'Studio': {
        monthlyEnvVar: 'POLAR_BLOOMA_STUDIO_PRODUCT_ID',
        yearlyEnvVar: 'POLAR_BLOOMA_STUDIO_YEARLY_PRODUCT_ID',
        fallbackMonthlyId: 'ef63cb29-ad44-4d53-baa9-023455ba81d4',
        fallbackYearlyId: '344185f8-b696-4c5d-baa5-3c1ac34c34a9',
    },
}

function resolveProductId(planId: PlanId, interval: BillingInterval = 'month'): string {
    const config = PLAN_PRODUCT_CONFIGS[planId]
    const envVar = interval === 'year' ? config.yearlyEnvVar : config.monthlyEnvVar
    const envValue = process.env[envVar]
    if (envValue && envValue.trim()) return envValue.trim()
    if (interval === 'month' && config.legacyEnvVar) {
        const legacy = process.env[config.legacyEnvVar]
        if (legacy && legacy.trim()) return legacy.trim()
    }
    return interval === 'year' ? config.fallbackYearlyId : config.fallbackMonthlyId
}

export function isPlanId(value: unknown): value is PlanId {
    return typeof value === 'string' && PLAN_IDS.includes(value as PlanId)
}

export function getProductIdForPlan(planId: PlanId, interval: BillingInterval = 'month'): string {
    return resolveProductId(planId, interval)
}

export function getPlanIdForProductId(productId: string | null | undefined): PlanId | undefined {
    if (!productId) return undefined
    for (const planId of PLAN_IDS) {
        if (resolveProductId(planId, 'month') === productId) return planId
        if (resolveProductId(planId, 'year') === productId) return planId
    }
    return undefined
}

export function getCreditsForPlan(planId: PlanId): number {
    return PLAN_CREDIT_TOPUPS[planId] ?? 0
}

export function getIntervalForProductId(productId: string | null | undefined): BillingInterval | undefined {
    if (!productId) return undefined
    for (const planId of PLAN_IDS) {
        if (resolveProductId(planId, 'month') === productId) return 'month'
        if (resolveProductId(planId, 'year') === productId) return 'year'
    }
    return undefined
}

// -----------------------------------------------------------------------------
// Plan Upgrade/Downgrade Policy
// -----------------------------------------------------------------------------

export function getPlanTierLevel(planId: PlanId): number {
    return PLAN_TIER_ORDER.indexOf(planId)
}

export function comparePlans(
    fromPlan: PlanId | null | undefined,
    toPlan: PlanId | null | undefined
): 'upgrade' | 'downgrade' | 'same' | 'unknown' {
    if (!fromPlan || !toPlan) return 'unknown'
    if (!isPlanId(fromPlan) || !isPlanId(toPlan)) return 'unknown'

    const fromLevel = getPlanTierLevel(fromPlan)
    const toLevel = getPlanTierLevel(toPlan)

    if (toLevel > fromLevel) return 'upgrade'
    if (toLevel < fromLevel) return 'downgrade'
    return 'same'
}

export function calculatePlanChangeCreditAdjustment(
    fromPlan: PlanId | null | undefined,
    toPlan: PlanId | null | undefined,
    options?: {
        grantProratedOnUpgrade?: boolean
        daysRemaining?: number
        totalDays?: number
    }
): { adjustment: number; reason: string } {
    const comparison = comparePlans(fromPlan, toPlan)

    if (comparison === 'unknown' || comparison === 'same') {
        return { adjustment: 0, reason: 'no_change' }
    }

    if (comparison === 'downgrade') {
        return { adjustment: 0, reason: 'downgrade_credits_retained' }
    }

    if (!options?.grantProratedOnUpgrade) {
        return { adjustment: 0, reason: 'upgrade_credits_at_renewal' }
    }

    if (fromPlan && toPlan && options.daysRemaining && options.totalDays) {
        const fromCredits = getCreditsForPlan(fromPlan)
        const toCredits = getCreditsForPlan(toPlan)
        const creditDifference = toCredits - fromCredits
        const prorationFactor = options.daysRemaining / options.totalDays
        const proratedAdjustment = Math.floor(creditDifference * prorationFactor)

        return {
            adjustment: Math.max(0, proratedAdjustment),
            reason: 'upgrade_prorated_credit_grant',
        }
    }

    return { adjustment: 0, reason: 'upgrade_missing_proration_data' }
}

// ============================================================================
// Subscription Logic
// ============================================================================

function isActiveTier(tier: UserRecord['subscription_tier']): boolean {
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
    if (!periodEnd) return true
    try {
        const endDate = new Date(periodEnd)
        return endDate > new Date()
    } catch {
        return true
    }
}

function evaluateSubscription(user: UserRecord | null): boolean {
    if (!user) return false
    const { subscription_tier, subscription_status, current_period_end, cancel_at_period_end } = user

    if (isActiveStatus(subscription_status)) return true

    if (
        subscription_status?.toLowerCase() === 'canceled' &&
        cancel_at_period_end === true &&
        isPeriodValid(current_period_end)
    ) {
        return isActiveTier(subscription_tier)
    }

    if (
        !subscription_status ||
        !['revoked', 'ended'].includes(subscription_status.toLowerCase())
    ) {
        return isActiveTier(subscription_tier)
    }

    return false
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
    let userRecord: UserRecord | null = null
    try {
        userRecord = await getUserById(userId)
    } catch (error) {
        console.error('Unable to load user when resolving subscription status', error)
    }
    return evaluateSubscription(userRecord)
}

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
