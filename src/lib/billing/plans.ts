export type PlanId = 'Small Brands' | 'Agency' | 'Studio'
export type BillingInterval = 'month' | 'year'

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
    fallbackYearlyId: '7dbbd08a-5a5d-48f4-9293-beb7dfaadc6f', // Default to monthly if not set
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

export const PLAN_CREDIT_TOPUPS: Record<PlanId, number> = {
  'Small Brands': 3000,
  'Agency': 7000,
  'Studio': 14000,
}

const PLAN_IDS: PlanId[] = ['Small Brands', 'Agency', 'Studio']

function resolveProductId(planId: PlanId, interval: BillingInterval = 'month'): string {
  const config = PLAN_PRODUCT_CONFIGS[planId]
  const envVar = interval === 'year' ? config.yearlyEnvVar : config.monthlyEnvVar

  const envValue = process.env[envVar]
  if (envValue && envValue.trim()) {
    return envValue.trim()
  }

  // Fallback to legacy for monthly only
  if (interval === 'month' && config.legacyEnvVar) {
    const legacy = process.env[config.legacyEnvVar]
    if (legacy && legacy.trim()) {
      return legacy.trim()
    }
  }

  // Final fallback
  return interval === 'year' ? config.fallbackYearlyId : config.fallbackMonthlyId
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && PLAN_IDS.includes(value as PlanId)
}

export function getProductIdForPlan(planId: PlanId, interval: BillingInterval = 'month'): string {
  // Use a simple non-cached resolve since env vars can change in dev
  return resolveProductId(planId, interval)
}

export function getPlanIdForProductId(productId: string | null | undefined): PlanId | undefined {
  if (!productId) {
    return undefined
  }

  // Check all plan/interval combinations
  for (const planId of PLAN_IDS) {
    if (resolveProductId(planId, 'month') === productId) return planId
    if (resolveProductId(planId, 'year') === productId) return planId
  }

  return undefined
}

export function getCreditsForPlan(planId: PlanId): number {
  return PLAN_CREDIT_TOPUPS[planId] ?? 0
}

export function getIntervalForProductId(
  productId: string | null | undefined
): BillingInterval | undefined {
  if (!productId) return undefined

  for (const planId of PLAN_IDS) {
    if (resolveProductId(planId, 'month') === productId) return 'month'
    if (resolveProductId(planId, 'year') === productId) return 'year'
  }

  return undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan Upgrade/Downgrade Policy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Plan tier order for comparison (higher index = higher tier)
 */
const PLAN_TIER_ORDER: PlanId[] = ['Small Brands', 'Agency', 'Studio']

/**
 * Gets the tier level for a plan (0 = lowest, 2 = highest)
 */
export function getPlanTierLevel(planId: PlanId): number {
  return PLAN_TIER_ORDER.indexOf(planId)
}

/**
 * Compares two plans and returns:
 * - 'upgrade' if tooPlan is higher tier than fromPlan
 * - 'downgrade' if toPlan is lower tier than fromPlan
 * - 'same' if they are the same tier
 * - 'unknown' if either plan is not recognized
 */
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

/**
 * Credit Policy for Plan Changes:
 * 
 * UPGRADE: No immediate credit adjustment.
 *          The user already paid and will get new tier credits at next cycle.
 *          Optional: Could grant prorated difference (not implemented by default).
 * 
 * DOWNGRADE: Credits are NOT reduced.
 *            Users keep remaining credits; new tier applies at next renewal.
 * 
 * This function returns the credit adjustment (can be 0 or a positive value).
 * It does NOT handle billing; Polar handles proration.
 */
export function calculatePlanChangeCreditAdjustment(
  fromPlan: PlanId | null | undefined,
  toPlan: PlanId | null | undefined,
  options?: {
    /** If true, grant prorated credits on upgrade (default: false) */
    grantProratedOnUpgrade?: boolean
    /** Days remaining in current period (for proration) */
    daysRemaining?: number
    /** Total days in current period */
    totalDays?: number
  }
): { adjustment: number; reason: string } {
  const comparison = comparePlans(fromPlan, toPlan)

  if (comparison === 'unknown' || comparison === 'same') {
    return { adjustment: 0, reason: 'no_change' }
  }

  if (comparison === 'downgrade') {
    // On downgrade, we do NOT reduce credits
    // Credits remain until used; new tier applies at next billing cycle
    return { adjustment: 0, reason: 'downgrade_credits_retained' }
  }

  // comparison === 'upgrade'
  if (!options?.grantProratedOnUpgrade) {
    // Default behavior: No immediate credit grant on upgrade
    // User gets new tier's credits at their next billing cycle
    return { adjustment: 0, reason: 'upgrade_credits_at_renewal' }
  }

  // Optional: Grant prorated credit difference
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
