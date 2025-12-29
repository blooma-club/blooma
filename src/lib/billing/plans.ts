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
  'Small Brands': 2000,
  'Agency': 5000,
  'Studio': 10000,
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
