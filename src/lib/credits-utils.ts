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
  VIDEO: parsePositiveInt(process.env.CREDIT_COST_VIDEO, 8),
  STORYBOARD_FRAME: parsePositiveInt(process.env.CREDIT_COST_STORYBOARD_FRAME, 1),
} as const

type FallbackCategory = keyof typeof CREDIT_COSTS

/**
 * 크레딧 계산 옵션
 */
export interface CreditCalculationOptions {
  /** 이미지 해상도 - 4K는 2배 크레딧 */
  resolution?: '1K' | '2K' | '4K'
  /** 비디오 길이 - 10초는 5초 대비 2배 크레딧 */
  duration?: '5' | '10'
}

/**
 * 모델 정의에 포함된 credits를 우선 사용하여 크레딧 비용을 계산합니다.
 * 모델 정보를 찾을 수 없을 때만 카테고리별 기본 비용으로 폴백합니다.
 * 
 * 추가 옵션:
 * - resolution: '4K' 선택 시 이미지 크레딧 2배 (Nano Banana Pro, Pro Edit)
 * - duration: '10' 선택 시 비디오 크레딧 2배 (5초 기준)
 */
export function getCreditCostForModel(
  modelId: string,
  fallbackCategory: FallbackCategory = 'IMAGE',
  options?: CreditCalculationOptions,
): number {
  const info = getModelInfo(modelId)
  let baseCost: number
  
  if (info && typeof info.credits === 'number' && Number.isFinite(info.credits) && info.credits > 0) {
    // 모델 크레딧을 정수로 반올림 (소수 비용이 올 수 있는 경우 대비)
    baseCost = Math.ceil(info.credits)
  } else {
    baseCost = CREDIT_COSTS[fallbackCategory]
  }

  // 해상도 배율 적용 (4K = 2x, 나머지 = 1x)
  // Nano Banana Pro/Edit 모델에만 적용
  if (options?.resolution === '4K') {
    const is4KMultiplierModel = modelId.includes('nano-banana-pro')
    if (is4KMultiplierModel) {
      baseCost *= 2
    }
  }

  // 비디오 길이 배율 적용 (10초 = 2x, 5초 = 1x)
  // 비디오 모델에만 적용
  if (options?.duration === '10' && info?.category === 'video-generation') {
    baseCost *= 2
  }

  return baseCost
}

