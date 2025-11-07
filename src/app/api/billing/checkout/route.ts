import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Polar } from '@polar-sh/sdk'
import { hasActiveSubscription } from '@/lib/billing/subscription'

type PlanId = 'blooma-1000' | 'blooma-3000' | 'blooma-5000'

const PLAN_PRODUCT_ID_MAP: Record<
  PlanId,
  { productEnvVar: string; legacyEnvVar?: string; fallbackProductId: string }
> = {
  'blooma-1000': {
    productEnvVar: 'POLAR_BLOOMA_1000_PRODUCT_ID',
    legacyEnvVar: 'POLAR_HOBBY_PRODUCT_ID',
    fallbackProductId: 'd745917d-ec02-4a2d-b7bb-fd081dc59cf9',
  },
  'blooma-3000': {
    productEnvVar: 'POLAR_BLOOMA_3000_PRODUCT_ID',
    fallbackProductId: '4afac01f-6437-41b6-9255-87114906fd4e',
  },
  'blooma-5000': {
    productEnvVar: 'POLAR_BLOOMA_5000_PRODUCT_ID',
    fallbackProductId: 'ef63cb29-ad44-4d53-baa9-023455ba81d4',
  },
}

const DEFAULT_PLAN: PlanId = 'blooma-1000'

function resolveCustomServerURL(): string | undefined {
  const baseUrl = process.env.POLAR_API_BASE_URL?.trim()
  if (!baseUrl) {
    return undefined
  }
  return baseUrl

}


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

    const supportedPlans = Object.keys(PLAN_PRODUCT_ID_MAP) as PlanId[]
    const requestedPlan =
      typeof body.plan === 'string' ? (body.plan as string) : (DEFAULT_PLAN as string)

    if (requestedPlan && !supportedPlans.includes(requestedPlan as PlanId)) {
      return NextResponse.json({ error: 'Unsupported plan requested.' }, { status: 400 })
    }

    const planId = (requestedPlan as PlanId) ?? DEFAULT_PLAN

    const alreadyActive = await hasActiveSubscription(userId)
    if (alreadyActive) {
      return NextResponse.json({ error: 'Subscription already active.' }, { status: 409 })
    }

    const accessToken = process.env.POLAR_ACCESS_TOKEN ?? process.env.POLAR_API_KEY
    if (!accessToken) {
      console.error('POLAR_ACCESS_TOKEN (or POLAR_API_KEY) is not configured')
      return NextResponse.json({ error: 'Payment provider is not configured.' }, { status: 500 })
    }

    const planProductConfig = PLAN_PRODUCT_ID_MAP[planId]
    const productId =
      process.env[planProductConfig.productEnvVar] ??
      (planProductConfig.legacyEnvVar
        ? process.env[planProductConfig.legacyEnvVar]
        : undefined) ??
      planProductConfig.fallbackProductId

    if (!productId) {
      console.error('Polar product ID is not configured for plan', {
        plan: planId,
        attemptedEnvVar: planProductConfig.productEnvVar,
        legacyEnvVar: planProductConfig.legacyEnvVar,
      })
      return NextResponse.json({ error: 'Payment provider is not configured.' }, { status: 500 })
    }

    const appBaseUrl = resolveAppBaseUrl().replace(/\/+$/, '')

    const polar = new Polar({
      accessToken,
      server: 'production',
    })

    const customServerUrl = resolveCustomServerURL()

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
