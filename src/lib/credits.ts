import { randomUUID } from 'crypto'
import { queryD1, queryD1Single } from './db/d1'
import type { AiUsage, SubscriptionPlan } from '@/types'

type UserCreditsRow = {
  credits?: number | string | null
  subscription_tier?: string | null
}

type UsageInsertOptions = {
  userId: string
  usageId: string
  operationType: AiUsage['operation_type']
  provider: AiUsage['provider']
  credits: number
  createdAt: string
  modelName?: string
  inputTokens?: number
  outputTokens?: number
  imageCount?: number
  success?: boolean
  errorMessage?: string
  metadata?: Record<string, unknown>
}

function coerceNumber(value: unknown, defaultValue = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : defaultValue
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : defaultValue
  }
  return defaultValue
}

// 구독 플랜별 설정
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  basic: {
    tier: 'basic',
    monthly_credits: 100,
    price_per_month: 0,
    features: ['기본 스토리보드 생성', '월 100 크레딧', '기본 AI 모델'],
    credit_prices: {
      text_generation: 1,
      image_generation: 10,
      script_generation: 5,
      image_edit: 15
    }
  },
  pro: {
    tier: 'pro',
    monthly_credits: 1000,
    price_per_month: 19,
    features: ['무제한 스토리보드', '월 1000 크레딧', '고급 AI 모델', '우선 지원'],
    credit_prices: {
      text_generation: 1,
      image_generation: 8,
      script_generation: 4,
      image_edit: 12
    }
  },
  enterprise: {
    tier: 'enterprise',
    monthly_credits: 5000,
    price_per_month: 99,
    features: ['무제한 모든 기능', '월 5000 크레딧', '프리미엄 AI 모델', '전용 지원'],
    credit_prices: {
      text_generation: 1,
      image_generation: 6,
      script_generation: 3,
      image_edit: 10
    }
  }
}

/**
 * 사용자의 현재 크레딧 잔액 조회
 */
export async function getUserCredits(userId: string): Promise<{ credits: number; tier: string } | null> {
  try {
    const row = await queryD1Single<UserCreditsRow>(
      `SELECT credits, subscription_tier
       FROM users
       WHERE id = ?1
       LIMIT 1`,
      [userId],
    )

    if (!row) {
      return null
    }

    return {
      credits: coerceNumber(row.credits),
      tier: row.subscription_tier || 'basic',
    }
  } catch (error) {
    console.error('Error in getUserCredits:', error)
    return null
  }
}

/**
 * 특정 AI 작업에 필요한 크레딧 계산
 */
export function calculateRequiredCredits(
  operationType: AiUsage['operation_type'],
  tier: string = 'basic',
  quantity: number = 1
): number {
  const plan = SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS.basic
  const basePrice = plan.credit_prices[operationType] || 1
  return basePrice * quantity
}

/**
 * 크레딧 사용 가능 여부 확인
 */
export async function checkCreditsAvailable(
  userId: string,
  operationType: AiUsage['operation_type'],
  quantity: number = 1
): Promise<{ available: boolean; required: number; current: number }> {
  const userCredits = await getUserCredits(userId)
  
  if (!userCredits) {
    return { available: false, required: 0, current: 0 }
  }
  
  const required = calculateRequiredCredits(operationType, userCredits.tier, quantity)
  const available = userCredits.credits >= required
  
  return {
    available,
    required,
    current: userCredits.credits
  }
}

/**
 * 크레딧 차감 및 AI 사용량 기록
 */
export async function consumeCredits(
  userId: string,
  operationType: AiUsage['operation_type'],
  provider: AiUsage['provider'],
  options: {
    modelName?: string
    inputTokens?: number
    outputTokens?: number
    imageCount?: number
    quantity?: number
    success?: boolean
    errorMessage?: string
    metadata?: Record<string, unknown>
  } = {}
): Promise<{ success: boolean; usageId?: string; newBalance?: number }> {
  const {
    modelName,
    inputTokens,
    outputTokens,
    imageCount,
    quantity = 1,
    success = true,
    errorMessage,
    metadata
  } = options
  
  try {
    // 사용자 크레딧 확인
    const creditCheck = await checkCreditsAvailable(userId, operationType, quantity)
    
    if (!creditCheck.available) {
      return { 
        success: false,
        usageId: undefined,
        newBalance: creditCheck.current
      }
    }
    
    const creditsToConsume = creditCheck.required
    const nowIso = new Date().toISOString()

    const updateRows = await queryD1<{ credits?: number | string }>(
      `UPDATE users
       SET credits = COALESCE(credits, 0) - ?1,
           credits_used = COALESCE(credits_used, 0) + ?1,
           updated_at = ?2
       WHERE id = ?3
         AND COALESCE(credits, 0) >= ?1
       RETURNING credits`,
      [creditsToConsume, nowIso, userId],
    )

    const updatedRow = updateRows.at(0)
    if (!updatedRow) {
      console.warn('consumeCredits: concurrent update prevented deduction', { userId })
      return {
        success: false,
        usageId: undefined,
        newBalance: creditCheck.current,
      }
    }

    const usageId = randomUUID()
    await insertUsageRecord({
      userId,
      usageId,
      operationType,
      provider,
      credits: creditsToConsume,
      createdAt: nowIso,
      modelName,
      inputTokens,
      outputTokens,
      imageCount,
      success,
      errorMessage,
      metadata,
    })

    const transactionId = randomUUID()
    await queryD1(
      `INSERT INTO credit_transactions (
         id,
         user_id,
         type,
         amount,
         description,
         ai_usage_id,
         created_at
       )
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      [
        transactionId,
        userId,
        'usage',
        -creditsToConsume,
        `${operationType} (${provider})`,
        usageId,
        nowIso,
      ],
    )

    const newBalance = coerceNumber(updatedRow.credits)
    
    return {
      success: true,
      usageId,
      newBalance,
    }
    
  } catch (error) {
    console.error('Error in consumeCredits:', error)
    return { success: false }
  }
}

/**
 * 월간 크레딧 리셋 (cron job용)
 */
export async function resetMonthlyCredits(userId?: string): Promise<void> {
  try {
    const now = new Date()
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1) // 다음 달 1일

    if (userId) {
      await queryD1(
        `UPDATE users
         SET credits_used = 0,
             credits_reset_date = ?1,
             updated_at = ?2
         WHERE id = ?3`,
        [resetDate.toISOString(), now.toISOString(), userId],
      )
    } else {
      await queryD1(
        `UPDATE users
         SET credits_used = 0,
             credits_reset_date = ?1,
             updated_at = ?2
         WHERE credits_reset_date IS NULL
            OR credits_reset_date < ?3`,
        [resetDate.toISOString(), now.toISOString(), now.toISOString()],
      )
    }
  } catch (error) {
    console.error('Error in resetMonthlyCredits:', error)
  }
}

/**
 * 크레딧 충전 (결제 시스템 연동용)
 */
export async function addCredits(
  userId: string,
  amount: number,
  description: string = '크레딧 구매'
): Promise<{ success: boolean; newBalance?: number }> {
  try {
    // 현재 크레딧 조회
    const currentCredits = await getUserCredits(userId)
    if (!currentCredits) {
      return { success: false }
    }
    
    const newBalance = currentCredits.credits + amount
    const nowIso = new Date().toISOString()
    
    const updateRows = await queryD1<{ credits?: number | string }>(
      `UPDATE users
       SET credits = COALESCE(credits, 0) + ?1,
           updated_at = ?2
       WHERE id = ?3
       RETURNING credits`,
      [amount, nowIso, userId],
    )

    const updatedRow = updateRows.at(0)
    if (!updatedRow) {
      console.error('addCredits: user update failed', { userId })
      return { success: false }
    }

    const transactionId = randomUUID()
    await queryD1(
      `INSERT INTO credit_transactions (
         id,
         user_id,
         type,
         amount,
         description,
         created_at
       )
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      [transactionId, userId, 'purchase', amount, description, nowIso],
    )

    return {
      success: true,
      newBalance: coerceNumber(updatedRow.credits, newBalance),
    }
    
  } catch (error) {
    console.error('Error in addCredits:', error)
    return { success: false }
  }
}

/**
 * 사용자의 AI 사용 통계 조회
 */
export async function getUserUsageStats(
  userId: string,
  period: 'day' | 'week' | 'month' = 'month'
): Promise<{
  totalCreditsUsed: number
  operationCounts: Record<string, number>
  providerStats: Record<string, number>
} | null> {
  try {
    const now = new Date()
    let startDate: Date
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }
    
    const rows = await queryD1<{
      credits_consumed?: number | string | null
      operation_type: string
      provider: string
    }>(
      `SELECT credits_consumed, operation_type, provider
       FROM ai_usage
       WHERE user_id = ?1
         AND created_at >= ?2
         AND success = 1`,
      [userId, startDate.toISOString()],
    )

    const totalCreditsUsed = rows.reduce((sum, usage) => {
      return sum + coerceNumber(usage.credits_consumed)
    }, 0)

    const operationCounts = rows.reduce((acc, usage) => {
      const key = usage.operation_type ?? 'unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const providerStats = rows.reduce((acc, usage) => {
      const key = usage.provider ?? 'unknown'
      acc[key] = (acc[key] || 0) + coerceNumber(usage.credits_consumed)
      return acc
    }, {} as Record<string, number>)
    
    return {
      totalCreditsUsed,
      operationCounts,
      providerStats
    }
    
  } catch (error) {
    console.error('Error in getUserUsageStats:', error)
    return null
  }
}

async function insertUsageRecord({
  userId,
  usageId,
  operationType,
  provider,
  credits,
  createdAt,
  modelName,
  inputTokens,
  outputTokens,
  imageCount,
  success = true,
  errorMessage,
  metadata,
}: UsageInsertOptions) {
  await queryD1(
    `INSERT INTO ai_usage (
       id,
       user_id,
       operation_type,
       provider,
       model_name,
       credits_consumed,
       input_tokens,
       output_tokens,
       image_count,
       success,
       error_message,
       metadata,
       created_at
     )
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
    [
      usageId,
      userId,
      operationType,
      provider,
      modelName ?? null,
      credits,
      inputTokens ?? null,
      outputTokens ?? null,
      imageCount ?? null,
      success ? 1 : 0,
      errorMessage ?? null,
      metadata ? JSON.stringify(metadata) : null,
      createdAt,
    ],
  )
}
