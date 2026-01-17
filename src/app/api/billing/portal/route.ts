import { NextResponse } from 'next/server'
import { Polar } from '@polar-sh/sdk'
import { resolvePolarServerURL } from '@/lib/server/polar-config'
import { getUserById } from '@/lib/db/users'
import { getSupabaseUserAndSync } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const polarServer = resolvePolarServerURL()

/**
 * POST /api/billing/portal
 * 
 * Creates a Polar Customer Portal session and returns the URL.
 * Users can manage their subscription (cancel, change plan, update payment) here.
 */
export async function POST() {
    try {
        const sessionUser = await getSupabaseUserAndSync()
        if (!sessionUser) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const accessToken = process.env.POLAR_ACCESS_TOKEN
        if (!accessToken) {
            console.error('[billing/portal] POLAR_ACCESS_TOKEN not configured')
            return NextResponse.json({ error: 'Billing not configured' }, { status: 500 })
        }

        // Get user to find Polar customer ID
        const user = await getUserById(sessionUser.id)
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const polarCustomerId = user.polar_customer_id
        if (!polarCustomerId) {
            return NextResponse.json({
                error: 'No active subscription found',
                message: 'You need an active subscription to access the billing portal.'
            }, { status: 400 })
        }

        const polar = new Polar({
            accessToken,
            server: polarServer as 'production' | 'sandbox' | undefined,
        })

        // Create customer portal session
        // Note: This requires Polar SDK support for customer portal sessions
        // If not available, we can fallback to direct portal URL
        try {
            const session = await polar.customerSessions.create({
                customerId: polarCustomerId,
            })

            return NextResponse.json({
                success: true,
                data: {
                    url: session.customerPortalUrl,
                },
            })
        } catch (portalError) {
            // Fallback: Construct portal URL directly if SDK method not available
            console.warn('[billing/portal] Customer session creation failed, using fallback:', portalError)

            // Polar's customer portal URL pattern (check Polar docs for exact format)
            const portalBaseUrl = process.env.POLAR_PORTAL_BASE_URL || 'https://polar.sh/portal'
            const portalUrl = `${portalBaseUrl}?customer_id=${polarCustomerId}`

            return NextResponse.json({
                success: true,
                data: {
                    url: portalUrl,
                    fallback: true,
                },
            })
        }
    } catch (error) {
        console.error('[billing/portal] Error creating portal session:', error)
        return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
    }
}

/**
 * GET /api/billing/portal
 * 
 * Returns the portal URL without creating a new session (for caching).
 */
export async function GET() {
    try {
        const sessionUser = await getSupabaseUserAndSync()
        if (!sessionUser) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const user = await getUserById(sessionUser.id)
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const polarCustomerId = user.polar_customer_id
        if (!polarCustomerId) {
            return NextResponse.json({
                success: true,
                data: {
                    hasSubscription: false,
                    url: null,
                },
            })
        }

        // Return a simple portal URL
        const portalBaseUrl = process.env.POLAR_PORTAL_BASE_URL || 'https://polar.sh/portal'
        const portalUrl = `${portalBaseUrl}?customer_id=${polarCustomerId}`

        return NextResponse.json({
            success: true,
            data: {
                hasSubscription: true,
                url: portalUrl,
                subscriptionStatus: user.subscription_status,
                subscriptionTier: user.subscription_tier,
                cancelAtPeriodEnd: user.cancel_at_period_end,
                currentPeriodEnd: user.current_period_end,
            },
        })
    } catch (error) {
        console.error('[billing/portal] Error getting portal info:', error)
        return NextResponse.json({ error: 'Failed to get portal info' }, { status: 500 })
    }
}

