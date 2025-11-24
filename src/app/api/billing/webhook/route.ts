import { NextResponse } from 'next/server'
import { Webhook } from 'standardwebhooks'
import { addCreditsToUser } from '@/lib/db/users'
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
    // Get the raw body and headers for verification
    const payload = await request.text()
    const headers = Object.fromEntries(request.headers)

    // Verify the webhook signature
    const parsedEvent = webhook.verify(payload, headers)
    if (!isPolarWebhookEvent(parsedEvent)) {
      console.warn('Received webhook payload without a type property; ignoring event.')
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }
    const event = parsedEvent

    // Handle different types of events
    switch (event.type) {
      case 'checkout.session.completed':
        if (!isCheckoutEvent(event)) {
          console.warn('checkout.session.completed received without checkout payload; ignoring.')
          break
        }
        await handleCheckoutCompleted(event)
        break
      case 'subscription.created':
        if (!isCheckoutEvent(event)) {
          console.warn('subscription.created received without subscription payload; ignoring.')
          break
        }
        await handleSubscriptionCreated(event)
        break
      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

type PolarWebhookEvent = {
  type: string
  data?: Record<string, unknown>
}

function isPolarWebhookEvent(value: unknown): value is PolarWebhookEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  )
}

type CheckoutEventPayload = PolarWebhookEvent & {
  data: {
    customer_id?: string
    product_id?: string
  }
}

function isCheckoutEvent(event: PolarWebhookEvent): event is CheckoutEventPayload {
  return typeof event.data === 'object' && event.data !== null
}

async function handleCheckoutCompleted(event: CheckoutEventPayload) {
  try {
    const { data } = event
    const { customer_id: customerId, product_id: productId } = data ?? {}

    // Validate required fields
    if (!customerId || !productId) {
      console.warn('Missing required fields in checkout event', { customerId, productId })
      return
    }
    
    // Map the product ID to a plan ID
    const planId = getPlanIdForProductId(productId)
    if (!planId) {
      console.warn('Unknown product ID in checkout event', { productId })
      return
    }
    
    // Get the credit amount for this plan
    const creditAmount = getCreditsForPlan(planId)
    if (creditAmount <= 0) {
      console.warn('Invalid credit amount for plan', { planId, creditAmount })
      return
    }
    
    // Add credits to the user's account
    await addCreditsToUser(customerId, creditAmount)
    console.log(`Successfully added ${creditAmount} credits to user ${customerId} for plan ${planId}`)
  } catch (error) {
    console.error('Error handling checkout completed event:', error)
    throw error
  }
}

async function handleSubscriptionCreated(event: CheckoutEventPayload) {
  try {
    const { data } = event
    const { customer_id: customerId, product_id: productId } = data ?? {}

    // Validate required fields
    if (!customerId || !productId) {
      console.warn('Missing required fields in subscription event', { customerId, productId })
      return
    }
    
    // Map the product ID to a plan ID
    const planId = getPlanIdForProductId(productId)
    if (!planId) {
      console.warn('Unknown product ID in subscription event', { productId })
      return
    }
    
    // Get the credit amount for this plan
    const creditAmount = getCreditsForPlan(planId)
    if (creditAmount <= 0) {
      console.warn('Invalid credit amount for plan', { planId, creditAmount })
      return
    }
    
    // Add credits to the user's account
    await addCreditsToUser(customerId, creditAmount)
    console.log(`Successfully added ${creditAmount} credits to user ${customerId} for subscription to plan ${planId}`)
  } catch (error) {
    console.error('Error handling subscription created event:', error)
    throw error
  }
}
