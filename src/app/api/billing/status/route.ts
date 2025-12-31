import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { hasActiveSubscription } from '@/lib/billing/subscription'

export const runtime = 'nodejs'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const active = await hasActiveSubscription(userId)
    return NextResponse.json({ hasActiveSubscription: active })
  } catch (error) {
    console.error('Unable to determine subscription status', error)
    return NextResponse.json(
      { error: 'Unable to determine subscription status.' },
      { status: 500 }
    )
  }
}
