import { auth } from '@clerk/nextjs/server'
import { Polar } from '@polar-sh/sdk'
import { NextResponse } from 'next/server'
import { resolvePolarServerURL } from '@/lib/server/polar-config'

const polarServer =
  process.env.POLAR_SERVER?.toLowerCase() === 'sandbox' ? 'sandbox' : 'production'

function resolveAppBaseUrl() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  return base.replace(/\/+$/, '')
}

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = process.env.POLAR_ACCESS_TOKEN ?? process.env.POLAR_API_KEY
  if (!accessToken) {
    return NextResponse.json({ error: 'Billing provider is not configured.' }, { status: 500 })
  }

  const polar = new Polar({
    accessToken,
    server: polarServer,
  })

  const customServerUrl = resolvePolarServerURL()

  try {
    const session = await polar.customerSessions.create(
      {
        externalCustomerId: userId,
        returnUrl: `${resolveAppBaseUrl()}/dashboard`,
      },
      customServerUrl ? { serverURL: customServerUrl } : undefined
    )

    if (!session.customerPortalUrl) {
      throw new Error('Missing customer portal URL in Polar response.')
    }

    return NextResponse.redirect(session.customerPortalUrl)
  } catch (error) {
    console.error('Failed to create Polar customer session', error)
    return NextResponse.json({ error: 'Unable to open billing portal.' }, { status: 502 })
  }
}
