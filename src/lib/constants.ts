// ============================================================================
// Billing / Plans
// ============================================================================

export type PlanId = 'Small Brands' | 'Agency' | 'Studio'
export type BillingInterval = 'month' | 'year'

export const PLAN_IDS: PlanId[] = ['Small Brands', 'Agency', 'Studio']

export const PLAN_CREDIT_TOPUPS: Record<PlanId, number> = {
    'Small Brands': 3000,
    'Agency': 7000,
    'Studio': 14000,
}

export const PLAN_TIER_ORDER: PlanId[] = ['Small Brands', 'Agency', 'Studio']


// ============================================================================
// Security / Domains
// ============================================================================

export const ALLOWED_IMAGE_DOMAINS = [
    'fal.media',
    'cdn.fal.ai',
    'v3.fal.media',
    'replicate.delivery',
    'replicate.com',
    'r2.cloudflarestorage.com',
    'pub-',
    'storage.googleapis.com',
    'oaidalleapiprodscus.blob.core.windows.net',
] as const

// ============================================================================
// Rate Limits
// ============================================================================

export type RateLimitType = 'imageGeneration' | 'scriptGeneration'

// ============================================================================
// Composition Presets
// ============================================================================

export type CompositionPreset = {
    id: string
    title: string
    prompt: string
    image?: string
    isBuiltIn?: boolean
}

export const COMPOSITION_PRESETS: CompositionPreset[] = [
    {
        id: 'front',
        title: 'Front',
        prompt: 'eye-level shot, 50mm lens, centered framing, soft studio lighting, sharp focus',
        image: '/front-view-v2-thumb.png',
        isBuiltIn: true,
    },
    {
        id: 'behind',
        title: 'Rear',
        prompt: 'centered framing, 50mm lens, soft studio lighting, clear posture',
        image: '/behind-view-v2-thumb.png',
        isBuiltIn: true,
    },
    {
        id: 'side',
        title: 'Side',
        prompt: '35mm lens, clear silhouette, soft studio lighting, minimalist framing',
        image: '/side-view-v2-thumb.png',
        isBuiltIn: true,
    },
    {
        id: 'quarter',
        title: 'Quarter',
        prompt: '35mm lens, soft studio lighting, clean background, professional lookbook style',
        image: '/front-side-view-v2-thumb.png',
        isBuiltIn: true,
    },
]
