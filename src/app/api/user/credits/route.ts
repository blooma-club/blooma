import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserById } from '@/lib/db/users'

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

    const total = typeof user.credits === 'number' && Number.isFinite(user.credits) ? user.credits : 0
    const used =
      typeof user.credits_used === 'number' && Number.isFinite(user.credits_used) ? user.credits_used : 0
    const remaining = Math.max(total - used, 0)
    const percentage = total > 0 ? Math.max(Math.min(Math.round((remaining / total) * 100), 100), 0) : 0

    return NextResponse.json({
      success: true,
      data: {
        total,
        used,
        remaining,
        percentage,
        resetDate: user.credits_reset_date ?? null,
        subscriptionTier: user.subscription_tier ?? null,
      },
    })
  } catch (error) {
    console.error('[api/user/credits] Failed to resolve credits', error)
    return NextResponse.json({ error: 'Failed to load credits' }, { status: 500 })
  }
}
