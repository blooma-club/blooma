import { NextResponse } from 'next/server'
import { hasActiveSubscription } from '@/lib/billing/logic'
import { getSupabaseUserAndSync } from '@/lib/db/supabase-server'

export const runtime = 'nodejs'

export async function GET() {
  const sessionUser = await getSupabaseUserAndSync()

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const active = await hasActiveSubscription(sessionUser.id)
    return NextResponse.json({ hasActiveSubscription: active })
  } catch (error) {
    console.error('Unable to determine subscription status', error)
    return NextResponse.json(
      { error: 'Unable to determine subscription status.' },
      { status: 500 }
    )
  }
}



