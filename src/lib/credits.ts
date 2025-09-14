import { supabase } from './supabase'
import type { User, AiUsage, CreditTransaction, SubscriptionPlan } from '@/types'

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
    const { data, error } = await supabase
      .from('users')
      .select('credits, subscription_tier')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching user credits:', error)
      return null
    }
    
    return {
      credits: data.credits || 0,
      tier: data.subscription_tier || 'basic'
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
    
    // 트랜잭션으로 크레딧 차감 및 사용량 기록
    const { data: usageData, error: usageError } = await supabase
      .from('ai_usage')
      .insert({
        user_id: userId,
        operation_type: operationType,
        provider,
        model_name: modelName,
        credits_consumed: creditsToConsume,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        image_count: imageCount,
        success,
        error_message: errorMessage,
        metadata
      })
      .select('id')
      .single()
    
    if (usageError) {
      console.error('Error recording AI usage:', usageError)
      return { success: false }
    }
    
    // 크레딧 차감
    const newCredits = creditCheck.current - creditsToConsume
    const { data: userData, error: userError } = await supabase
      .from('users')
      .update({
        credits: newCredits,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('credits')
      .single()
    
    if (userError) {
      console.error('Error updating user credits:', userError)
      return { success: false }
    }
    
    // 크레딧 거래 내역 기록
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        type: 'usage',
        amount: -creditsToConsume,
        description: `${operationType} (${provider})`,
        ai_usage_id: usageData.id
      })
    
    return {
      success: true,
      usageId: usageData.id,
      newBalance: userData.credits
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
    
    let query = supabase
      .from('users')
      .update({
        credits_used: 0,
        credits_reset_date: resetDate.toISOString(),
        updated_at: now.toISOString()
      })
    
    if (userId) {
      query = query.eq('id', userId)
    } else {
      // 모든 사용자 리셋 (월말 배치)
      query = query.lt('credits_reset_date', now.toISOString())
    }
    
    const { error } = await query
    
    if (error) {
      console.error('Error resetting monthly credits:', error)
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
    
    // 크레딧 업데이트
    const { data, error } = await supabase
      .from('users')
      .update({
        credits: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('credits')
      .single()
    
    if (error) {
      console.error('Error adding credits:', error)
      return { success: false }
    }
    
    // 거래 내역 기록
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        type: 'purchase',
        amount,
        description
      })
    
    return {
      success: true,
      newBalance: data.credits
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
    
    const { data, error } = await supabase
      .from('ai_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .eq('success', true)
    
    if (error) {
      console.error('Error fetching usage stats:', error)
      return null
    }
    
    const totalCreditsUsed = data.reduce((sum, usage) => sum + usage.credits_consumed, 0)
    
    const operationCounts = data.reduce((acc, usage) => {
      acc[usage.operation_type] = (acc[usage.operation_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const providerStats = data.reduce((acc, usage) => {
      acc[usage.provider] = (acc[usage.provider] || 0) + usage.credits_consumed
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