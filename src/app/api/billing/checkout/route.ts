import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Polar } from '@polar-sh/sdk'
import { hasActiveSubscription } from '@/lib/billing/subscription'
import { resolvePolarServerURL } from '@/lib/server/polar-config'
import { getProductIdForPlan, isPlanId, type PlanId } from '@/lib/billing/plans'

const DEFAULT_PLAN: PlanId = 'Starter'

function resolveAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000'
}

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const requestedPlan = typeof body.plan === 'string' ? body.plan : DEFAULT_PLAN

    // plans.ts의 유효성 검사 함수 사용
    if (!isPlanId(requestedPlan)) {
      return NextResponse.json({ error: 'Unsupported plan requested.' }, { status: 400 })
    }

    const planId: PlanId = requestedPlan

    const alreadyActive = await hasActiveSubscription(userId)
    if (alreadyActive) {
      return NextResponse.json({ error: 'Subscription already active.' }, { status: 409 })
    }

    const accessToken = process.env.POLAR_ACCESS_TOKEN ?? process.env.POLAR_API_KEY
    if (!accessToken) {
      console.error('POLAR_ACCESS_TOKEN (or POLAR_API_KEY) is not configured')
      return NextResponse.json({ error: 'Payment provider is not configured.' }, { status: 500 })
    }

    // plans.ts의 중앙 집중화된 함수 사용
    const productId = getProductIdForPlan(planId)

    if (!productId) {
      console.error('Polar product ID is not configured for plan', { planId })
      return NextResponse.json({ error: 'Payment provider is not configured.' }, { status: 500 })
    }

    const appBaseUrl = resolveAppBaseUrl().replace(/\/+$/, '')

    const polar = new Polar({
      accessToken,
      server: 'production',
    })

    const customServerUrl = resolvePolarServerURL()

    try {
      const checkout = await polar.checkouts.create(
        {
          products: [productId],
          externalCustomerId: userId,
          successUrl: `${appBaseUrl}/dashboard?checkout=success`,
        },
        customServerUrl ? { serverURL: customServerUrl } : undefined
      )

      return NextResponse.json({ url: checkout.url })
    } catch (checkoutError) {
      console.error('Polar checkout session creation failed', checkoutError)
      return NextResponse.json({ error: 'Unable to create checkout session.' }, { status: 502 })
    }
  } catch (error) {
    console.error('Unexpected error while creating checkout session', error)
    return NextResponse.json(
      { error: 'Unexpected error while creating checkout session.' },
      { status: 500 }
    )
  }
}
