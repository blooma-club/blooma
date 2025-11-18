type PlanProductConfig = {
  productEnvVar: string
  fallbackProductId: string
  legacyEnvVar?: string
}

export type PlanId = 'blooma-1000' | 'blooma-3000' | 'blooma-5000'

const PLAN_PRODUCT_CONFIGS: Record<PlanId, PlanProductConfig> = {
  'blooma-1000': {
    productEnvVar: 'POLAR_BLOOMA_1000_PRODUCT_ID',
    legacyEnvVar: 'POLAR_HOBBY_PRODUCT_ID',
    fallbackProductId: 'd745917d-ec02-4a2d-b7bb-fd081dc59cf9',
  },
  'blooma-3000': {
    productEnvVar: 'POLAR_BLOOMA_3000_PRODUCT_ID',
    fallbackProductId: '4afac01f-6437-41b6-9255-87114906fd4e',
  },
  'blooma-5000': {
    productEnvVar: 'POLAR_BLOOMA_5000_PRODUCT_ID',
    fallbackProductId: 'ef63cb29-ad44-4d53-baa9-023455ba81d4',
  },
}

export const PLAN_CREDIT_TOPUPS: Record<PlanId, number> = {
  'blooma-1000': 1000,
  'blooma-3000': 3000,
  'blooma-5000': 5000,
}

const PLAN_IDS: PlanId[] = ['blooma-1000', 'blooma-3000', 'blooma-5000']

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
