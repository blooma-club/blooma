import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Polar } from '@polar-sh/sdk'
import { resolvePolarServerURL } from '@/lib/server/polar-config'

export const runtime = 'nodejs'

const polarServer =
  process.env.POLAR_SERVER?.toLowerCase() === 'sandbox' ? 'sandbox' : 'production'

const EMPTY_SUBSCRIPTION = {
  productName: null,
  currentPeriodEnd: null,
}

const respondWithFallback = () => NextResponse.json(EMPTY_SUBSCRIPTION)

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = process.env.POLAR_ACCESS_TOKEN ?? process.env.POLAR_API_KEY
  if (!accessToken) {
    console.warn('POLAR_ACCESS_TOKEN (or POLAR_API_KEY) is not configured. Returning fallback summary.')
    return respondWithFallback()
  }

  const polar = new Polar({
    accessToken,
    server: polarServer,
  })

  const customServerUrl = resolvePolarServerURL()

  try {
    const iterator = await polar.subscriptions.list(
      {
        externalCustomerId: userId,
        limit: 10,
      },
      customServerUrl ? { serverURL: customServerUrl } : undefined
    )

    type SubscriptionItem = (typeof iterator.result.items)[number]
    let subscription: SubscriptionItem | null = null

    for await (const page of iterator) {
      const { items } = page.result
      if (!items?.length) {
        continue
      }

      subscription =
        items.find((item) => item.status === 'active') ??
        items.find((item) => item.status === 'trialing') ??
        items.find((item) => item.status === 'past_due') ??
        items.find((item) => item.status === 'unpaid') ??
        items[0] ??
        null

      if (subscription) {
        break
      }
    }

    return NextResponse.json({
      productName: subscription?.product?.name ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd
        ? subscription.currentPeriodEnd.toISOString()
        : null,
    })
  } catch (error) {
    console.error('Failed to load Polar subscription', error)
    return respondWithFallback()
  }
}
