'use server'

import { currentUser } from '@clerk/nextjs/server'
import { getUserById, type D1UserRecord } from '@/lib/db/users'

function isActiveTier(tier: D1UserRecord['subscription_tier']): boolean {
  if (!tier) return false
  const normalized = tier.toLowerCase()
  return normalized !== 'free' && normalized !== 'basic'
}

function extractMetadataFlag(metadata: Record<string, unknown> | undefined | null): boolean {
  if (!metadata) return false

  if (metadata.subscriptionActive === true) {
    return true
  }

  if (typeof metadata.subscription_status === 'string') {
    return metadata.subscription_status === 'active'
  }

  if (typeof metadata.subscriptionTier === 'string') {
    return isActiveTier(metadata.subscriptionTier)
  }

  return false
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  let userRecord: D1UserRecord | null = null

  try {
    userRecord = await getUserById(userId)
  } catch (error) {
    console.error('Unable to load user from D1 when resolving subscription status', error)
  }

  const dbActive = isActiveTier(userRecord?.subscription_tier ?? null)

  let clerkActive = false

  try {
    const user = await currentUser()
    if (user) {
      clerkActive =
        extractMetadataFlag(user.privateMetadata as Record<string, unknown> | null | undefined) ||
        extractMetadataFlag(user.publicMetadata as Record<string, unknown> | null | undefined)
    }
  } catch (error) {
    console.warn('Unable to load Clerk user metadata when resolving subscription status', error)
  }

  return dbActive || clerkActive
}
