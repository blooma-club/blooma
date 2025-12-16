import { NextResponse } from 'next/server'
import { Webhook } from 'standardwebhooks'
import { addCreditsToUser, updateUserSubscription } from '@/lib/db/users'
import { getPlanIdForProductId, getCreditsForPlan } from '@/lib/billing/plans'
import {
  tryClaimWebhookEvent,
  markWebhookEventProcessed,
  markWebhookEventFailed,
} from '@/lib/db/webhookEvents'

let cachedWebhook: Webhook | null | undefined

function resolveWebhook(): Webhook | null {
  if (cachedWebhook !== undefined) {
    return cachedWebhook
  }

  const secret = process.env.POLAR_WEBHOOK_SECRET?.trim()
  if (!secret) {
    cachedWebhook = null
    return null
  }

  try {
    cachedWebhook = new Webhook(secret)
    return cachedWebhook
  } catch (error) {
    if (error instanceof Error && /Base64Coder/i.test(error.message)) {
      console.warn(
        'POLAR_WEBHOOK_SECRET is not a base64 string. Falling back to raw secret handling.'
      )
      try {
        cachedWebhook = new Webhook(secret, { format: 'raw' })
        return cachedWebhook
      } catch (rawError) {
        console.error('Unable to initialize webhook verifier from raw secret', rawError)
        cachedWebhook = null
        return null
      }
    }
    console.error('Unable to initialize webhook verifier', error)
    cachedWebhook = null
    return null
  }
}

/**
 * Extracts the webhook event ID from headers.
 * Standard Webhooks spec uses 'webhook-id' header.
 */
function extractWebhookId(headers: Record<string, string>): string | null {
  // Standard Webhooks spec: webhook-id header (lowercase due to HTTP/2)
  return headers['webhook-id'] || headers['Webhook-Id'] || null
}

export async function POST(request: Request) {
  const webhook = resolveWebhook()
  if (!webhook) {
    console.error('POLAR_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  // Extract headers early for idempotency check
  const headers = Object.fromEntries(request.headers)
  const webhookId = extractWebhookId(headers)

  // If no webhook-id, we cannot guarantee idempotency but still process
  if (!webhookId) {
    console.warn('[webhook] No webhook-id header found - idempotency cannot be guaranteed')
  }

  let eventType: string | null = null

  try {
    const payload = await request.text()

    const parsedEvent = webhook.verify(payload, headers)
    if (!isPolarWebhookEvent(parsedEvent)) {
      console.warn('Received webhook payload without a type property; ignoring event.')
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    const event = parsedEvent
    eventType = event.type
    console.log(`[webhook] Received event: ${event.type}`, webhookId ? `(id: ${webhookId})` : '')

    // ─────────────────────────────────────────────────────────────────────────
    // Idempotency Check: Claim the event before processing
    // ─────────────────────────────────────────────────────────────────────────
    if (webhookId) {
      const claimResult = await tryClaimWebhookEvent(webhookId, event.type)

      if (!claimResult.claimed) {
        // Event already processed or being processed - return 200 to prevent retries
        console.log(`[webhook] Duplicate event ${webhookId} - already ${claimResult.existingStatus}`)
        return NextResponse.json({
          received: true,
          duplicate: true,
          existingStatus: claimResult.existingStatus
        })
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Process the event
    // ─────────────────────────────────────────────────────────────────────────
    switch (event.type) {
      case 'checkout.created':
        console.log('[webhook] Checkout created', extractLogInfo(event))
        break

      case 'checkout.updated':
        console.log('[webhook] Checkout updated', extractLogInfo(event))
        break

      case 'subscription.created':
        await handleSubscriptionCreated(event)
        break

      case 'subscription.updated':
        await handleSubscriptionUpdated(event)
        break

      case 'subscription.active':
        await handleSubscriptionActive(event)
        break

      case 'subscription.canceled':
        await handleSubscriptionCanceled(event)
        break

      case 'subscription.revoked':
        await handleSubscriptionRevoked(event)
        break

      case 'subscription.uncanceled':
        await handleSubscriptionUncanceled(event)
        break

      case 'order.created':
        await handleOrderCreated(event)
        break

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`)
    }

    // Mark event as successfully processed
    if (webhookId) {
      await markWebhookEventProcessed(webhookId)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[webhook] Processing error:', error)

    // Mark event as failed if we have a webhook ID
    if (webhookId && eventType) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      try {
        await markWebhookEventFailed(webhookId, errorMessage)
      } catch (markError) {
        console.error('[webhook] Failed to mark event as failed:', markError)
      }
    }

    // Return 500 to trigger retry from Polar
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions
// ─────────────────────────────────────────────────────────────────────────────

type PolarWebhookEvent = {
  type: string
  data?: Record<string, unknown>
}

type PolarCustomer = {
  id: string
  external_id?: string
  email?: string
  name?: string
}

type PolarProduct = {
  id: string
  name?: string
}

type PolarSubscription = {
  id: string
  status: string
  customer_id: string
  customer?: PolarCustomer
  product_id: string
  product?: PolarProduct
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end?: boolean
}

type SubscriptionEventPayload = PolarWebhookEvent & {
  data: PolarSubscription
}

type OrderEventPayload = PolarWebhookEvent & {
  data: {
    id: string
    customer_id: string
    customer?: PolarCustomer
    product_id: string
    product?: PolarProduct
    amount: number
    currency: string
    /** Billing reason: 'purchase', 'subscription_create', 'subscription_cycle', 'subscription_update' */
    billing_reason?: string
    /** Associated subscription ID if this order is for a subscription */
    subscription_id?: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Type guards
// ─────────────────────────────────────────────────────────────────────────────

function isPolarWebhookEvent(value: unknown): value is PolarWebhookEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  )
}

function isSubscriptionEvent(event: PolarWebhookEvent): event is SubscriptionEventPayload {
  const data = event.data as Record<string, unknown> | undefined
  return (
    typeof data === 'object' &&
    data !== null &&
    (typeof data.customer_id === 'string' || typeof data.customer === 'object')
  )
}

function isOrderEvent(event: PolarWebhookEvent): event is OrderEventPayload {
  const data = event.data as Record<string, unknown> | undefined
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    (typeof data.customer_id === 'string' || typeof data.customer === 'object')
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Polar webhook payload에서 Clerk userId (external_id) 추출
 * Polar 내부 customer_id가 아닌 external_id를 사용해야 함
 */
function extractUserId(data: Record<string, unknown>): string | null {
  // customer 객체에서 external_id 추출
  const customer = data.customer as PolarCustomer | undefined
  if (customer?.external_id) {
    return customer.external_id
  }

  // subscription 객체 내 customer에서 추출
  const subscription = data as PolarSubscription | undefined
  if (subscription?.customer?.external_id) {
    return subscription.customer.external_id
  }

  console.warn('[webhook] Could not extract external_id from payload', { data })
  return null
}

function extractProductId(data: Record<string, unknown>): string | null {
  if (typeof data.product_id === 'string') {
    return data.product_id
  }
  const product = data.product as PolarProduct | undefined
  if (product?.id) {
    return product.id
  }
  return null
}

function extractLogInfo(event: PolarWebhookEvent): Record<string, unknown> {
  const data = event.data ?? {}
  return {
    customerId: (data.customer as PolarCustomer | undefined)?.id,
    externalId: (data.customer as PolarCustomer | undefined)?.external_id,
    productId: extractProductId(data),
    productName: (data.product as PolarProduct | undefined)?.name,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Event handlers
// ─────────────────────────────────────────────────────────────────────────────

async function handleSubscriptionCreated(event: PolarWebhookEvent) {
  if (!isSubscriptionEvent(event)) {
    console.warn('[webhook] subscription.created: Invalid payload structure')
    return
  }

  const { data } = event
  const userId = extractUserId(data)
  const productId = extractProductId(data)

  console.log('[webhook] subscription.created', {
    userId,
    productId,
    status: data.status,
  })

  if (!userId || !productId) {
    console.warn('[webhook] subscription.created: Missing userId or productId')
    return
  }

  // 구독 생성 시 크레딧 지급
  const planId = getPlanIdForProductId(productId)
  if (!planId) {
    console.warn('[webhook] subscription.created: Unknown productId', { productId })
    return
  }

  const creditAmount = getCreditsForPlan(planId)
  if (creditAmount > 0) {
    await addCreditsToUser(userId, creditAmount)
    console.log(`[webhook] Added ${creditAmount} credits to user ${userId} for plan ${planId}`)
  }

  // 구독 정보를 DB에 전체 동기화
  await updateUserSubscription(userId, {
    subscriptionTier: planId,
    polarSubscriptionId: data.id,
    polarCustomerId: data.customer?.id ?? null,
    subscriptionStatus: data.status,
    currentPeriodStart: data.current_period_start ?? null,
    currentPeriodEnd: data.current_period_end ?? null,
    cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
  })
}

async function handleSubscriptionUpdated(event: PolarWebhookEvent) {
  if (!isSubscriptionEvent(event)) {
    console.warn('[webhook] subscription.updated: Invalid payload structure')
    return
  }

  const { data } = event
  const userId = extractUserId(data)
  const productId = extractProductId(data)
  const status = data.status?.toLowerCase()

  console.log('[webhook] subscription.updated', {
    userId,
    productId,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
  })

  if (!userId) {
    console.warn('[webhook] subscription.updated: Missing userId')
    return
  }

  const planId = productId ? getPlanIdForProductId(productId) : null

  // 구독 상태에 따라 처리
  if (status === 'canceled' || status === 'revoked' || status === 'ended') {
    // 구독이 취소/해지된 경우 - 상태만 업데이트, tier는 period_end까지 유지 가능
    await updateUserSubscription(userId, {
      subscriptionStatus: status,
      // tier는 cancel_at_period_end가 true면 유지, 즉시 revoke면 null
      subscriptionTier: status === 'revoked' ? null : (planId ?? undefined),
      currentPeriodEnd: data.current_period_end ?? null,
      cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
    })
    return
  }

  // 활성 구독인 경우 전체 정보 업데이트
  await updateUserSubscription(userId, {
    subscriptionTier: planId ?? undefined,
    polarSubscriptionId: data.id,
    polarCustomerId: data.customer?.id ?? null,
    subscriptionStatus: status ?? null,
    currentPeriodStart: data.current_period_start ?? null,
    currentPeriodEnd: data.current_period_end ?? null,
    cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
  })
}

async function handleSubscriptionActive(event: PolarWebhookEvent) {
  if (!isSubscriptionEvent(event)) {
    console.warn('[webhook] subscription.active: Invalid payload structure')
    return
  }

  const { data } = event
  const userId = extractUserId(data)
  const productId = extractProductId(data)

  console.log('[webhook] subscription.active', {
    userId,
    productId,
    status: data.status,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
  })

  // 구독 활성화/갱신 시 크레딧 지급 (매월 갱신)
  if (!userId || !productId) {
    console.warn('[webhook] subscription.active: Missing userId or productId')
    return
  }

  const planId = getPlanIdForProductId(productId)
  if (!planId) {
    console.warn('[webhook] subscription.active: Unknown productId', { productId })
    return
  }

  // 구독 갱신 시 크레딧 지급 (매월 갱신)
  const creditAmount = getCreditsForPlan(planId)
  if (creditAmount > 0) {
    await addCreditsToUser(userId, creditAmount)
    console.log(`[webhook] Renewed ${creditAmount} credits to user ${userId} for plan ${planId}`)
  }

  // 구독 활성화 시 전체 정보 업데이트
  await updateUserSubscription(userId, {
    subscriptionTier: planId,
    polarSubscriptionId: data.id,
    polarCustomerId: data.customer?.id ?? null,
    subscriptionStatus: 'active',
    currentPeriodStart: data.current_period_start ?? null,
    currentPeriodEnd: data.current_period_end ?? null,
    cancelAtPeriodEnd: false, // 활성화되면 취소 플래그 해제
  })
}

async function handleSubscriptionCanceled(event: PolarWebhookEvent) {
  if (!isSubscriptionEvent(event)) {
    console.warn('[webhook] subscription.canceled: Invalid payload structure')
    return
  }

  const { data } = event
  const userId = extractUserId(data)
  const productId = extractProductId(data)
  const planId = productId ? getPlanIdForProductId(productId) : null

  console.log('[webhook] subscription.canceled', {
    userId,
    productId,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
  })

  // 구독 취소 시: cancel_at_period_end가 true면 기간 끝까지 유효
  // tier는 유지하되 상태만 업데이트
  if (userId) {
    await updateUserSubscription(userId, {
      subscriptionStatus: 'canceled',
      // 기간말 취소인 경우 tier 유지, 즉시 취소면 null
      subscriptionTier: data.cancel_at_period_end ? (planId ?? undefined) : null,
      currentPeriodEnd: data.current_period_end ?? null,
      cancelAtPeriodEnd: data.cancel_at_period_end ?? true,
    })
  }
}

async function handleSubscriptionRevoked(event: PolarWebhookEvent) {
  if (!isSubscriptionEvent(event)) {
    console.warn('[webhook] subscription.revoked: Invalid payload structure')
    return
  }

  const { data } = event
  const userId = extractUserId(data)

  console.log('[webhook] subscription.revoked', {
    userId,
    status: data.status,
  })

  // 구독 즉시 해지 - 모든 권한 박탈
  if (userId) {
    await updateUserSubscription(userId, {
      subscriptionTier: null,
      subscriptionStatus: 'revoked',
      cancelAtPeriodEnd: false,
    })
  }
}

/**
 * PR-3: subscription.uncanceled 이벤트 처리
 * 사용자가 취소를 철회했을 때 구독 상태를 복구합니다.
 */
async function handleSubscriptionUncanceled(event: PolarWebhookEvent) {
  if (!isSubscriptionEvent(event)) {
    console.warn('[webhook] subscription.uncanceled: Invalid payload structure')
    return
  }

  const { data } = event
  const userId = extractUserId(data)
  const productId = extractProductId(data)
  const planId = productId ? getPlanIdForProductId(productId) : null

  console.log('[webhook] subscription.uncanceled', {
    userId,
    productId,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
  })

  if (!userId) {
    console.warn('[webhook] subscription.uncanceled: Missing userId')
    return
  }

  // 취소 철회: 구독 상태를 active로 복구하고 cancel_at_period_end를 false로
  await updateUserSubscription(userId, {
    subscriptionTier: planId ?? undefined,
    polarSubscriptionId: data.id,
    polarCustomerId: data.customer?.id ?? null,
    subscriptionStatus: data.status ?? 'active',
    currentPeriodStart: data.current_period_start ?? null,
    currentPeriodEnd: data.current_period_end ?? null,
    cancelAtPeriodEnd: false, // 취소 철회됨
  })

  console.log(`[webhook] Subscription uncanceled for user ${userId}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Credit Policy Constants (PR-4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Credit granting policy:
 * - subscription_create: Initial subscription - credits granted via subscription.created event
 * - subscription_cycle: Monthly renewal - credits granted here
 * - subscription_update: Plan change - no additional credits (handled separately if needed)
 * - purchase: One-time purchase - credits granted based on product
 */
const CREDIT_GRANTING_BILLING_REASONS = ['subscription_cycle'] as const

async function handleOrderCreated(event: PolarWebhookEvent) {
  if (!isOrderEvent(event)) {
    console.warn('[webhook] order.created: Invalid payload structure')
    return
  }

  const { data } = event
  const userId = extractUserId(data)
  const productId = extractProductId(data)
  const billingReason = data.billing_reason

  console.log('[webhook] order.created', {
    orderId: data.id,
    userId,
    productId,
    amount: data.amount,
    currency: data.currency,
    billingReason,
    subscriptionId: data.subscription_id,
  })

  // PR-4: Only grant credits for subscription_cycle (monthly renewal)
  // Initial subscription credits are handled by subscription.created event
  // This prevents duplicate credit granting
  if (
    billingReason === 'subscription_cycle' &&
    userId &&
    productId
  ) {
    const planId = getPlanIdForProductId(productId)
    if (planId) {
      const creditAmount = getCreditsForPlan(planId)
      if (creditAmount > 0) {
        await addCreditsToUser(userId, creditAmount)
        console.log(`[webhook] order.created: Renewed ${creditAmount} credits for user ${userId} (billing_reason: ${billingReason})`)
      }
    }
  } else if (billingReason) {
    console.log(`[webhook] order.created: Skipping credit grant for billing_reason: ${billingReason}`)
  }
}
