import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Polar } from '@polar-sh/sdk'

const polarServer =
  process.env.POLAR_SERVER?.toLowerCase() === 'sandbox' ? 'sandbox' : 'production'

function resolveCustomServerURL(): string | undefined {
  const baseUrl = process.env.POLAR_API_BASE_URL?.trim()
  if (!baseUrl) {
    return undefined
  }

  return baseUrl
}

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = process.env.POLAR_ACCESS_TOKEN ?? process.env.POLAR_API_KEY
  if (!accessToken) {
    console.error('POLAR_ACCESS_TOKEN (or POLAR_API_KEY) is not configured')
    return NextResponse.json({ error: 'Payment provider not configured.' }, { status: 500 })
  }

  const polar = new Polar({
    accessToken,
    server: polarServer,
  })

  const customServerUrl = resolveCustomServerURL()

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
    return NextResponse.json({ error: 'Failed to load subscription.' }, { status: 502 })
  }
}
