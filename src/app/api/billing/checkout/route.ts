import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { hasActiveSubscription } from '@/lib/billing/subscription'

const POLAR_DEFAULT_BASE_URL = 'https://api.polar.sh'

function resolveAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000'
}

function resolvePolarCheckoutUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>

  if (typeof record.url === 'string') {
    return record.url
  }

  const checkoutSession = record.checkout_session as Record<string, unknown> | undefined
  if (checkoutSession && typeof checkoutSession.url === 'string') {
    return checkoutSession.url
  }

  const result = record.result as Record<string, unknown> | undefined
  if (result && typeof result.url === 'string') {
    return result.url
  }

  return null
}

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))

    if (body.plan && body.plan !== 'hobby') {
      return NextResponse.json({ error: 'Unsupported plan requested.' }, { status: 400 })
    }

    const alreadyActive = await hasActiveSubscription(userId)
    if (alreadyActive) {
      return NextResponse.json({ error: 'Subscription already active.' }, { status: 409 })
    }

    const apiKey = process.env.POLAR_API_KEY
    const priceId = process.env.POLAR_HOBBY_PRICE_ID
    const apiBaseUrl = process.env.POLAR_API_BASE_URL ?? POLAR_DEFAULT_BASE_URL

    if (!apiKey) {
      console.error('POLAR_API_KEY is not configured')
      return NextResponse.json({ error: 'Payment provider is not configured.' }, { status: 500 })
    }

    if (!priceId) {
      console.error('POLAR_HOBBY_PRICE_ID is not configured')
      return NextResponse.json({ error: 'Payment provider is not configured.' }, { status: 500 })
    }

    const appBaseUrl = resolveAppBaseUrl().replace(/\/+$/, '')

    const checkoutResponse = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/v1/checkout-sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_price_id: priceId,
        customer_external_id: userId,
        success_url: `${appBaseUrl}/dashboard?checkout=success`,
        cancel_url: `${appBaseUrl}/pricing?checkout=cancelled`,
      }),
    })

    const payload = await checkoutResponse.json().catch(() => null)

    if (!checkoutResponse.ok) {
      console.error('Polar checkout session creation failed', {
        status: checkoutResponse.status,
        statusText: checkoutResponse.statusText,
        payload,
      })

      const message =
        (payload && typeof payload.error === 'string' && payload.error) ||
        'Unable to create checkout session.'

      return NextResponse.json({ error: message }, { status: 502 })
    }

    const checkoutUrl = resolvePolarCheckoutUrl(payload)

    if (!checkoutUrl) {
      console.error('Polar checkout session response missing URL', payload)
      return NextResponse.json(
        { error: 'Payment provider did not return a checkout URL.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ url: checkoutUrl })
  } catch (error) {
    console.error('Unexpected error while creating checkout session', error)
    return NextResponse.json(
      { error: 'Unexpected error while creating checkout session.' },
      { status: 500 }
    )
  }
}
