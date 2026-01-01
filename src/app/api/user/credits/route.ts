import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserById } from '@/lib/db/users'
import { syncSubscriptionCredits } from '@/lib/credits'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const syncedUser = await syncSubscriptionCredits(user)
    const total =
      typeof syncedUser.credits === 'number' && Number.isFinite(syncedUser.credits) ? syncedUser.credits : 0
    const used =
      typeof syncedUser.credits_used === 'number' && Number.isFinite(syncedUser.credits_used)
        ? syncedUser.credits_used
        : 0
    const remaining = Math.max(total - used, 0)
    const percentage =
      total > 0 ? Math.max(Math.min(Math.round((remaining / total) * 100), 100), 0) : 0

    return NextResponse.json(
      {
        success: true,
        data: {
          total,
          used,
          remaining,
          percentage,
          resetDate: syncedUser.credits_reset_date ?? null,
          subscriptionTier: syncedUser.subscription_tier ?? null,
        },
      },
      {
        headers: {
          // Cache for 10s (fresh), allow stale for up to 60s while revalidating
          'Cache-Control': 'private, max-age=10, stale-while-revalidate=50',
        },
      }
    )
  } catch (error) {
    console.error('[api/user/credits] Failed to resolve credits', error)
    return NextResponse.json({ error: 'Failed to load credits' }, { status: 500 })
  }
}
