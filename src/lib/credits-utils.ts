import { getModelInfo } from '@/lib/fal-ai'

export class InsufficientCreditsError extends Error {
  constructor(message = 'Insufficient credits') {
    super(message)
    this.name = 'InsufficientCreditsError'
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export const CREDIT_COSTS = {
  IMAGE: parsePositiveInt(process.env.CREDIT_COST_IMAGE, 1),
  IMAGE_EDIT: parsePositiveInt(process.env.CREDIT_COST_IMAGE_EDIT, 1),
  STORYBOARD_FRAME: parsePositiveInt(process.env.CREDIT_COST_STORYBOARD_FRAME, 1),
} as const

type FallbackCategory = keyof typeof CREDIT_COSTS

/**
 * 모델 정의에 포함된 credits를 우선 사용하여 크레딧 비용을 계산합니다.
 * 모델 정보를 찾을 수 없을 때만 카테고리별 기본 비용으로 폴백합니다.
 */
export function getCreditCostForModel(
  modelId: string,
  fallbackCategory: FallbackCategory = 'IMAGE',
  options?: {
    resolution?: string
  }
): number {
  const info = getModelInfo(modelId)
  if (info && typeof info.credits === 'number' && Number.isFinite(info.credits) && info.credits > 0) {
    let cost = Math.ceil(info.credits)

    // Nano Banana Pro (nanobanana 2) 4K resolution multiplier
    if (
      (modelId === 'fal-ai/nano-banana-pro' || modelId === 'fal-ai/nano-banana-pro/edit') &&
      options?.resolution === '4K'
    ) {
      cost *= 2
    }

    return cost
  }
  return CREDIT_COSTS[fallbackCategory]
}

