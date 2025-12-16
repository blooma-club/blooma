'use server'

import { Polar } from '@polar-sh/sdk'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { resolvePolarServerURL } from '@/lib/server/polar-config'
import { getUserById } from '@/lib/db/users'

const polarServer =
  process.env.POLAR_SERVER?.toLowerCase() === 'sandbox' ? 'sandbox' : 'production'

/**
 * PR-5: Customer Portal - Fixed hardcoded customerId
 * 
 * Creates a customer portal session for the current authenticated user.
 * Uses the polar_customer_id stored in the users table from webhook events.
 */
export async function customerportal(): Promise<void> {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Authentication required to access customer portal')
  }

  const accessToken = process.env.POLAR_ACCESS_TOKEN ?? process.env.POLAR_API_KEY
  if (!accessToken) {
    throw new Error('Payment provider is not configured')
  }

  // Get polar_customer_id from our database
  const user = await getUserById(userId)
  const polarCustomerId = user?.polar_customer_id

  if (!polarCustomerId) {
    throw new Error('No subscription found. Please complete a subscription first.')
  }

  const polar = new Polar({
    accessToken,
    server: polarServer,
  })

  const customServerUrl = resolvePolarServerURL()

  try {
    // Create customer portal session using stored customerId
    const result = await polar.customerSessions.create(
      {
        customerId: polarCustomerId,
      },
      customServerUrl ? { serverURL: customServerUrl } : undefined
    )

    redirect(result.customerPortalUrl)
  } catch (error) {
    console.error('[customerportal] Error creating portal session:', error)
    throw error
  }
}

/**
 * Alternative: Get customer portal URL without redirecting.
 * Useful for client-side navigation.
 */
export async function getCustomerPortalUrl(): Promise<string | null> {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  const accessToken = process.env.POLAR_ACCESS_TOKEN ?? process.env.POLAR_API_KEY
  if (!accessToken) {
    return null
  }

  // Get polar_customer_id from our database
  const user = await getUserById(userId)
  const polarCustomerId = user?.polar_customer_id

  if (!polarCustomerId) {
    return null
  }

  const polar = new Polar({
    accessToken,
    server: polarServer,
  })

  const customServerUrl = resolvePolarServerURL()

  try {
    const result = await polar.customerSessions.create(
      {
        customerId: polarCustomerId,
      },
      customServerUrl ? { serverURL: customServerUrl } : undefined
    )

    return result.customerPortalUrl
  } catch (error) {
    console.error('[getCustomerPortalUrl] Error:', error)
    return null
  }
}

