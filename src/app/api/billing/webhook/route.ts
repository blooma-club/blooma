import { NextResponse } from 'next/server'
import { Webhook } from 'standardwebhooks'
import { addCreditsToUser } from '@/lib/db/users'
import { getPlanIdForProductId, getCreditsForPlan } from '@/lib/billing/plans'

// Initialize the webhook verifier with the Polar.sh webhook secret
const webhookSecret = process.env.POLAR_WEBHOOK_SECRET
const webhook = webhookSecret ? new Webhook(webhookSecret) : null

export async function POST(request: Request) {
  if (!webhook) {
    console.error('POLAR_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  try {
    // Get the raw body and headers for verification
    const payload = await request.text()
    const headers = Object.fromEntries(request.headers)

    // Verify the webhook signature
    const verifiedPayload = webhook.verify(payload, headers)
    
    // Process the webhook event
    const event = JSON.parse(payload)
    
    // Handle different types of events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event)
        break
      case 'subscription.created':
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

async function handleCheckoutCompleted(event: any) {
  try {
    const { data } = event
    const { customer_id: customerId, product_id: productId } = data
    
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

async function handleSubscriptionCreated(event: any) {
  try {
    const { data } = event
    const { customer_id: customerId, product_id: productId } = data
    
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