type PlanProductConfig = {
  productEnvVar: string
  fallbackProductId: string
  legacyEnvVar?: string
}

/**
 * Polar.sh에서 정의된 플랜 ID (실제 제품명과 일치)
 * - Starter: $19/month, 2,200 credits
 * - Pro: $49/month, 6,000 credits
 * - Studio: $99/month, 13,000 credits
 */
export type PlanId = 'Starter' | 'Pro' | 'Studio'

const PLAN_PRODUCT_CONFIGS: Record<PlanId, PlanProductConfig> = {
  'Starter': {
    productEnvVar: 'POLAR_BLOOMA_STARTER_PRODUCT_ID',
    legacyEnvVar: 'POLAR_BLOOMA_1000_PRODUCT_ID',
    fallbackProductId: 'd745917d-ec02-4a2d-b7bb-fd081dc59cf9',
  },
  'Pro': {
    productEnvVar: 'POLAR_BLOOMA_PRO_PRODUCT_ID',
    legacyEnvVar: 'POLAR_BLOOMA_3000_PRODUCT_ID',
    fallbackProductId: '4afac01f-6437-41b6-9255-87114906fd4e',
  },
  'Studio': {
    productEnvVar: 'POLAR_BLOOMA_STUDIO_PRODUCT_ID',
    legacyEnvVar: 'POLAR_BLOOMA_5000_PRODUCT_ID',
    fallbackProductId: 'ef63cb29-ad44-4d53-baa9-023455ba81d4',
  },
}

export const PLAN_CREDIT_TOPUPS: Record<PlanId, number> = {
  'Starter': 2200,
  'Pro': 6000,
  'Studio': 13000,
}

const PLAN_IDS: PlanId[] = ['Starter', 'Pro', 'Studio']

function resolveProductId(planId: PlanId): string {
  const config = PLAN_PRODUCT_CONFIGS[planId]
  const envValue = process.env[config.productEnvVar]
  if (envValue && envValue.trim()) {
    return envValue.trim()
  }

  if (config.legacyEnvVar) {
    const legacy = process.env[config.legacyEnvVar]
    if (legacy && legacy.trim()) {
      return legacy.trim()
    }
  }

  return config.fallbackProductId
}

const RESOLVED_PRODUCT_IDS: Record<PlanId, string> = PLAN_IDS.reduce((acc, id) => {
  acc[id] = resolveProductId(id)
  return acc
}, {} as Record<PlanId, string>)

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && PLAN_IDS.includes(value as PlanId)
}

export function getProductIdForPlan(planId: PlanId): string {
  return RESOLVED_PRODUCT_IDS[planId]
}

export function getPlanIdForProductId(productId: string | null | undefined): PlanId | undefined {
  if (!productId) {
    return undefined
  }

  return PLAN_IDS.find((planId) => RESOLVED_PRODUCT_IDS[planId] === productId)
}

export function getCreditsForPlan(planId: PlanId): number {
  return PLAN_CREDIT_TOPUPS[planId] ?? 0
}
