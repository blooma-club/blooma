import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  queryD1Single,
  D1ConfigurationError,
  D1QueryError,
} from '@/lib/db/d1'

type CountRow = {
  count?: number | string | null
}

function coerceNumber(value: unknown, defaultValue = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : defaultValue
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : defaultValue
  }

  return defaultValue
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { projectId } = await context.params
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const row = await queryD1Single<CountRow>(
      `SELECT COUNT(1) as count
       FROM cards
       WHERE project_id = ?1
         AND user_id = ?2`,
      [projectId, userId],
    )

    const count = coerceNumber(row?.count)
    return NextResponse.json({ hasCards: count > 0, count })
  } catch (error) {
    if (error instanceof D1ConfigurationError) {
      console.error('[projects/:id/cards] D1 not configured', error)
      return NextResponse.json({ error: 'Cloudflare D1 is not configured' }, { status: 500 })
    }

    if (
      error instanceof D1QueryError &&
      isMissingTableOrColumn(error)
    ) {
      console.warn(
        '[projects/:id/cards] cards table missing, treating as empty',
        error.details,
      )

      return NextResponse.json({ hasCards: false, count: 0 })
    }

    if (error instanceof D1QueryError) {
      console.error('[projects/:id/cards] D1 query failed', error)
      return NextResponse.json({ error: 'Failed to load cards for project' }, { status: 500 })
    }

    console.error('[projects/:id/cards] Unexpected error', error)
    return NextResponse.json({ error: 'Failed to load cards for project' }, { status: 500 })
  }
}

function isMissingTableOrColumn(error: D1QueryError): boolean {
  const messages: string[] = []

  if (typeof error.details === 'string') {
    messages.push(error.details)
  } else if (error.details && typeof error.details === 'object') {
    const details = error.details as Record<string, unknown>
    if (typeof details.messages === 'string') {
      messages.push(details.messages)
    }
    if (Array.isArray(details.errors)) {
      for (const entry of details.errors) {
        if (entry && typeof entry === 'object' && 'message' in entry) {
          const msg = (entry as { message?: unknown }).message
          if (typeof msg === 'string') {
            messages.push(msg)
          }
        }
      }
    }
  }

  messages.push(error.message)

  return messages.some(message => {
    const value = message.toLowerCase()
    return value.includes('no such table') || value.includes('no such column')
  })
}
