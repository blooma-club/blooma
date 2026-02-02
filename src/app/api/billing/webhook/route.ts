import { NextResponse } from 'next/server'
import { Webhook } from 'standardwebhooks'
import { getUserById, grantCreditsWithResetDate, updateUserSubscription } from '@/lib/db/users'
import { getPlanIdForProductId, getCreditsForPlan, getIntervalForProductId } from '@/lib/billing/logic'
import {
  tryClaimWebhookEvent,
  markWebhookEventProcessed,
  markWebhookEventFailed,
} from '@/lib/db/webhookEvents'
import { recordCreditTransaction, hasTransactionWithReference } from '@/lib/db/creditTransactions'

export const runtime = 'nodejs'

type PolarWebhookEvent = {
  id?: string
  type: string
  data?: Record<string, unknown>
  created_at?: string
}

type PolarCustomer = {
  id?: string
  external_id?: string | null
}

type PolarProduct = {
  id?: string
  name?: string | null
}

type PolarSubscription = {
  id?: string
  status?: string
  customer?: PolarCustomer
  product_id?: string
  product?: PolarProduct
  current_period_start?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean
}

type PolarOrder = {
  id?: string
  amount?: number
  currency?: string
  billing_reason?: string | null
  subscription_id?: string | null
  product_id?: string
  product?: PolarProduct
  customer?: PolarCustomer
}

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

function getWebhookHeaders(request: Request): Record<string, string> | null {
  const webhookId = request.headers.get('webhook-id')
  const webhookTimestamp = request.headers.get('webhook-timestamp')
  const webhookSignature = request.headers.get('webhook-signature')

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return null
  }

  return {
    'webhook-id': webhookId,
    'webhook-timestamp': webhookTimestamp,
    'webhook-signature': webhookSignature,
  }
}

function isSubscriptionEvent(event: PolarWebhookEvent): event is PolarWebhookEvent & { data: PolarSubscription } {
  return Boolean(event.data && typeof event.data === 'object')
}

function isOrderEvent(event: PolarWebhookEvent): event is PolarWebhookEvent & { data: PolarOrder } {
  return Boolean(event.data && typeof event.data === 'object')
}

/**
 * Extract Supabase auth user ID (external_id) from Polar webhook payload.
 * Polar customer payload includes external_id when available.
 */
function extractUserId(data: Record<string, unknown>): string | null {
  const customer = data.customer as PolarCustomer | undefined
  if (customer?.external_id) {
    return customer.external_id
  }

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

// Event handlers

async function handleSubscriptionCreated(event: PolarWebhookEvent) {
  if (!isSubscriptionEvent(event)) {
    console.warn('[webhook] subscription.created: Invalid payload structure')
    return
  }

  const data = event.data
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

  const planId = getPlanIdForProductId(productId)
  if (!planId) {
    console.warn('[webhook] subscription.created: Unknown productId', { productId })
    return
  }

  await updateUserSubscription(userId, {
    subscriptionTier: planId,
    polarSubscriptionId: data.id ?? null,
    polarCustomerId: data.customer?.id ?? null,
    subscriptionStatus: data.status ?? null,
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

  const data = event.data
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

  if (status === 'canceled' || status === 'revoked' || status === 'ended') {
    await updateUserSubscription(userId, {
      subscriptionStatus: status,
      subscriptionTier: status === 'revoked' ? null : (planId ?? undefined),
      currentPeriodEnd: data.current_period_end ?? null,
      cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
    })
    return
  }

  await updateUserSubscription(userId, {
    subscriptionTier: planId ?? undefined,
    polarSubscriptionId: data.id ?? null,
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

  const data = event.data
  const userId = extractUserId(data)
  const productId = extractProductId(data)

  console.log('[webhook] subscription.active', {
    userId,
    productId,
    status: data.status,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
  })

  if (!userId || !productId) {
    console.warn('[webhook] subscription.active: Missing userId or productId')
    return
  }

  const planId = getPlanIdForProductId(productId)
  if (!planId) {
    console.warn('[webhook] subscription.active: Unknown productId', { productId })
    return
  }

  await updateUserSubscription(userId, {
    subscriptionTier: planId,
    polarSubscriptionId: data.id ?? null,
    polarCustomerId: data.customer?.id ?? null,
    subscriptionStatus: 'active',
    currentPeriodStart: data.current_period_start ?? null,
    currentPeriodEnd: data.current_period_end ?? null,
    cancelAtPeriodEnd: false,
  })
}

async function handleSubscriptionCanceled(event: PolarWebhookEvent) {
  if (!isSubscriptionEvent(event)) {
    console.warn('[webhook] subscription.canceled: Invalid payload structure')
    return
  }

  const data = event.data
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

  if (userId) {
    await updateUserSubscription(userId, {
      subscriptionStatus: 'canceled',
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

  const data = event.data
  const userId = extractUserId(data)

  console.log('[webhook] subscription.revoked', {
    userId,
    status: data.status,
  })

  if (userId) {
    await updateUserSubscription(userId, {
      subscriptionTier: null,
      subscriptionStatus: 'revoked',
      cancelAtPeriodEnd: false,
    })
  }
}

async function handleSubscriptionUncanceled(event: PolarWebhookEvent) {
  if (!isSubscriptionEvent(event)) {
    console.warn('[webhook] subscription.uncanceled: Invalid payload structure')
    return
  }

  const data = event.data
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

  await updateUserSubscription(userId, {
    subscriptionTier: planId ?? undefined,
    polarSubscriptionId: data.id ?? null,
    polarCustomerId: data.customer?.id ?? null,
    subscriptionStatus: data.status ?? 'active',
    currentPeriodStart: data.current_period_start ?? null,
    currentPeriodEnd: data.current_period_end ?? null,
    cancelAtPeriodEnd: false,
  })

  console.log(`[webhook] Subscription uncanceled for user ${userId}`)
}

/**
 * Credit granting policy:
 * - subscription_create: Initial subscription - credits granted on order.paid
 * - subscription_cycle: Monthly renewal - credits granted on order.paid
 * - subscription_update: Plan change - no additional credits (handled separately if needed)
 * - purchase: One-time purchase - credits granted based on product
 */
const CREDIT_GRANTING_BILLING_REASONS = ['subscription_create', 'subscription_cycle'] as const

async function handleOrderPaid(event: PolarWebhookEvent) {
  if (!isOrderEvent(event)) {
    console.warn('[webhook] order.paid: Invalid payload structure')
    return
  }

  const data = event.data
  const userId = extractUserId(data)
  const productId = extractProductId(data)
  const billingReason = data.billing_reason ?? undefined

  console.log('[webhook] order.paid', {
    orderId: data.id,
    userId,
    productId,
    amount: data.amount,
    currency: data.currency,
    billingReason,
    subscriptionId: data.subscription_id,
  })

  if (!data.id) {
    console.warn('[webhook] order.paid: Missing order id')
    return
  }

  if (
    billingReason &&
    CREDIT_GRANTING_BILLING_REASONS.includes(
      billingReason as (typeof CREDIT_GRANTING_BILLING_REASONS)[number]
    ) &&
    userId &&
    productId
  ) {
    let userRecord: Awaited<ReturnType<typeof getUserById>> = null

    try {
      userRecord = await getUserById(userId)
    } catch (error) {
      console.warn('[webhook] order.paid: Unable to resolve user for credit grant', error)
    }

    if (!userRecord) {
      console.warn('[webhook] order.paid: User not found for credit grant', { userId })
      return
    }

    const targetUserId = userRecord.id
    const alreadyGranted = await hasTransactionWithReference(targetUserId, data.id)
    if (alreadyGranted) {
      console.log('[webhook] order.paid: Credits already granted for order', { orderId: data.id })
      return
    }

    const planId = getPlanIdForProductId(productId)
    if (planId) {
      const creditAmount = getCreditsForPlan(planId)
      const interval = getIntervalForProductId(productId)
      if (interval === 'year') {
        if (creditAmount > 0) {
          const hasPeriod = Boolean(
            userRecord.current_period_start && userRecord.current_period_end
          )
          if (!hasPeriod) {
            const nextResetDate = addMonths(new Date(), 1).toISOString()
            await grantCreditsWithResetDate(targetUserId, creditAmount, nextResetDate)
            await recordCreditTransaction({
              user_id: targetUserId,
              amount: creditAmount,
              type: 'grant',
              description: 'subscription_create_yearly_initial',
              reference_id: data.id,
            }).catch(err => console.warn('[webhook] Failed to record transaction:', err))
            console.log(
              `[webhook] order.paid: Granted initial credits for yearly plan (missing period metadata) for user ${targetUserId}`
            )
            return
          }
        }

        console.log('[webhook] order.paid: yearly plan detected; credits granted monthly.')
        return
      }

      if (creditAmount > 0) {
        const nextResetDate = addMonths(new Date(), 1).toISOString()
        await grantCreditsWithResetDate(targetUserId, creditAmount, nextResetDate)
        await recordCreditTransaction({
          user_id: targetUserId,
          amount: creditAmount,
          type: 'grant',
          description: `${billingReason}`,
          reference_id: data.id,
        }).catch(err => console.warn('[webhook] Failed to record transaction:', err))
        console.log(
          `[webhook] order.paid: Granted ${creditAmount} credits for user ${userId} (billing_reason: ${billingReason})`
        )
      }
    }
  } else if (billingReason) {
    console.log(`[webhook] order.paid: Skipping credit grant for billing_reason: ${billingReason}`)
  }
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  const day = next.getDate()
  next.setDate(1)
  next.setMonth(next.getMonth() + months)
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(day, lastDay))
  return next
}

export async function POST(request: Request) {
  const webhook = resolveWebhook()
  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const rawBody = await request.text()
  const headers = getWebhookHeaders(request)

  if (!headers) {
    return NextResponse.json({ error: 'Missing webhook headers' }, { status: 400 })
  }

  let event: PolarWebhookEvent
  try {
    event = webhook.verify(rawBody, headers) as PolarWebhookEvent
  } catch (error) {
    console.error('[webhook] signature verification failed', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const eventId = headers['webhook-id'] || event.id || `${event.type}:${Date.now()}`
  const claim = await tryClaimWebhookEvent(eventId, event.type)
  if (!claim.claimed) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      status: claim.existingStatus ?? 'unknown',
    })
  }

  try {
    switch (event.type) {
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
      case 'order.paid':
        await handleOrderPaid(event)
        break
      default:
        console.log('[webhook] Unhandled event type', event.type, extractLogInfo(event))
        break
    }

    await markWebhookEventProcessed(eventId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown webhook handler error'
    await markWebhookEventFailed(eventId, message)
    console.error('[webhook] Handler failed', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

