import { NextResponse } from 'next/server'
import {
  resolveClerkUserProfile,
  ClerkAuthenticationError,
  ClerkProfileResolutionError,
} from '@/lib/clerk'
import {
  syncClerkUser,
  D1UsersTableError,
} from '@/lib/db/users'
import { D1ConfigurationError, D1QueryError } from '@/lib/db/d1'

export async function POST() {
  try {
    const profile = await resolveClerkUserProfile()
    const syncedUser = await syncClerkUser(profile)

    return NextResponse.json(
      {
        success: true,
        message: 'User synced successfully',
        clerkUserId: profile.id,
        userId: syncedUser.id,
        user: syncedUser,
      },
      { status: 200 },
    )
  } catch (error) {
    if (error instanceof ClerkAuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    if (error instanceof ClerkProfileResolutionError) {
      console.error('[api/sync-user] Unable to resolve Clerk profile', error)
      return NextResponse.json(
        { error: 'Unable to resolve Clerk profile for the current session' },
        { status: 500 },
      )
    }

    if (error instanceof D1ConfigurationError) {
      console.error('[api/sync-user] Cloudflare D1 is not configured', error)
      return NextResponse.json(
        { error: 'Cloudflare D1 is not configured' },
        { status: 500 },
      )
    }

    if (error instanceof D1UsersTableError) {
      console.error('[api/sync-user] Users table operation failed', error)
      return NextResponse.json(
        { error: 'Failed to sync user in Cloudflare D1', details: error.details },
        { status: 500 },
      )
    }

    if (error instanceof D1QueryError) {
      console.error('[api/sync-user] Cloudflare D1 query failed', error)
      return NextResponse.json(
        { error: 'Failed to execute Cloudflare D1 query', details: error.details },
        { status: 500 },
      )
    }

    console.error('[api/sync-user] Unexpected failure', error)
    return NextResponse.json(
      {
        error: 'Failed to sync Clerk user with Cloudflare D1',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
