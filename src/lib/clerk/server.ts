'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { ClerkAuthenticationError, ClerkProfileResolutionError } from './errors'
import type { ClerkUserProfile } from './types'

/**
 * Ensures the current request is authenticated and returns the Clerk session
 * payload. Throws a {@link ClerkAuthenticationError} otherwise.
 */
export async function requireClerkAuth() {
  const authState = await auth()

  if (!authState.userId) {
    throw new ClerkAuthenticationError()
  }

  return authState
}

/**
 * Fetches the currently authenticated Clerk user and normalises it to the
 * application-level profile shape.
 */
export async function resolveClerkUserProfile(): Promise<ClerkUserProfile> {
  const authState = await requireClerkAuth()
  const user = await currentUser()

  if (!user) {
    throw new ClerkProfileResolutionError()
  }

  const primaryEmail = resolvePrimaryEmail(user.emailAddresses, user.primaryEmailAddressId)
  const fallbackEmail = user.emailAddresses.at(0)?.emailAddress ?? null

  const fullName = user.fullName || buildFullName(user.firstName, user.lastName)

  return {
    id: authState.userId,
    email: primaryEmail ?? fallbackEmail,
    name: fullName,
    imageUrl: user.imageUrl ?? null,
  }
}

function resolvePrimaryEmail(
  emailAddresses: Array<{ id: string; emailAddress: string }>,
  primaryEmailId: string | null
): string | null {
  if (!primaryEmailId) return null

  const match = emailAddresses.find(address => address.id === primaryEmailId)
  return match?.emailAddress ?? null
}

function buildFullName(firstName?: string | null, lastName?: string | null): string | null {
  const parts = [firstName, lastName].filter(Boolean)
  if (parts.length === 0) {
    return null
  }
  return parts.join(' ')
}
