import { NextResponse } from 'next/server'
import { Webhook } from 'standardwebhooks'
import { addCreditsToUser, updateUserSubscriptionTier } from '@/lib/db/users'
import { getPlanIdForProductId, getCreditsForPlan } from '@/lib/billing/plans'

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

export async function POST(request: Request) {
  const webhook = resolveWebhook()
  if (!webhook) {
    console.error('POLAR_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  try {
    const payload = await request.text()
    const headers = Object.fromEntries(request.headers)

    const parsedEvent = webhook.verify(payload, headers)
    if (!isPolarWebhookEvent(parsedEvent)) {
      console.warn('Received webhook payload without a type property; ignoring event.')
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    const event = parsedEvent
    console.log(`[webhook] Received event: ${event.type}`)

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

      case 'order.created':
        await handleOrderCreated(event)
        break

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[webhook] Processing error:', error)
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

  // 구독 플랜 정보를 DB에 동기화
  await updateUserSubscriptionTier(userId, planId)
  console.log(`[webhook] Updated subscription_tier to ${planId} for user ${userId}`)
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
  })

  if (!userId) {
    console.warn('[webhook] subscription.updated: Missing userId')
    return
  }

  // 구독 상태에 따라 처리
  if (status === 'canceled' || status === 'revoked' || status === 'ended') {
    // 구독이 취소/해지된 경우
    await updateUserSubscriptionTier(userId, null)
    console.log(`[webhook] Updated subscription_tier to null for user ${userId} (status: ${status})`)
    return
  }

  // 활성 구독인 경우 (active, trialing 등)
  if (productId && (status === 'active' || status === 'trialing')) {
    const planId = getPlanIdForProductId(productId)
    if (planId) {
      // 플랜 정보 업데이트
      await updateUserSubscriptionTier(userId, planId)
      console.log(`[webhook] Updated subscription_tier to ${planId} for user ${userId}`)

      // subscription.updated가 갱신을 의미할 수 있으므로 크레딧 지급 여부 확인
      // 주의: 매월 갱신 시 중복 지급을 방지하기 위해 current_period_start를 확인해야 할 수 있음
      // 현재는 subscription.active 이벤트에서 처리하므로 여기서는 플랜만 업데이트
    }
  } else if (productId) {
    // 기타 상태 (past_due, unpaid 등)에서도 플랜 정보는 유지
    const planId = getPlanIdForProductId(productId)
    if (planId) {
      await updateUserSubscriptionTier(userId, planId)
      console.log(`[webhook] Updated subscription_tier to ${planId} for user ${userId} (status: ${status})`)
    }
  }
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

  // 구독 활성화 시 플랜 정보 업데이트
  await updateUserSubscriptionTier(userId, planId)
  console.log(`[webhook] Updated subscription_tier to ${planId} for user ${userId}`)
}

async function handleSubscriptionCanceled(event: PolarWebhookEvent) {
  if (!isSubscriptionEvent(event)) {
    console.warn('[webhook] subscription.canceled: Invalid payload structure')
    return
  }

  const { data } = event
  const userId = extractUserId(data)
  const productId = extractProductId(data)

  console.log('[webhook] subscription.canceled', {
    userId,
    productId,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
  })

  // 구독 취소 시 subscription_tier를 null로 설정 (구독 없음)
  if (userId) {
    await updateUserSubscriptionTier(userId, null)
    console.log(`[webhook] Updated subscription_tier to null for user ${userId} (subscription canceled)`)
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

  // 구독 즉시 해지 시 subscription_tier를 null로 설정 (구독 없음)
  if (userId) {
    await updateUserSubscriptionTier(userId, null)
    console.log(`[webhook] Updated subscription_tier to null for user ${userId} (subscription revoked)`)
  }
}

async function handleOrderCreated(event: PolarWebhookEvent) {
  if (!isOrderEvent(event)) {
    console.warn('[webhook] order.created: Invalid payload structure')
    return
  }

  const { data } = event
  const userId = extractUserId(data)
  const productId = extractProductId(data)

  console.log('[webhook] order.created', {
    orderId: data.id,
    userId,
    productId,
    amount: data.amount,
    currency: data.currency,
  })

  // 일회성 구매 처리 (필요시)
}
