import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  duplicateProjectForUser,
  ProjectNotFoundError,
  D1ProjectsTableError,
} from '@/lib/db/projects'
import { D1ConfigurationError, D1QueryError } from '@/lib/db/d1'

export async function POST(
  request: NextRequest,
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

    const project = await duplicateProjectForUser(userId, projectId)
    return NextResponse.json({ data: project, success: true })
  } catch (error) {
    return handleDuplicateError(error)
  }
}

function handleDuplicateError(error: unknown): NextResponse {
  if (error instanceof ProjectNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  if (error instanceof D1ConfigurationError) {
    console.error('[api/projects duplicate] Cloudflare D1 is not configured', error)
    return NextResponse.json({ error: 'Cloudflare D1 is not configured' }, { status: 500 })
  }

  if (error instanceof D1QueryError) {
    console.error('[api/projects duplicate] Cloudflare D1 query failed', error)
    return NextResponse.json(
      { error: 'Failed to execute Cloudflare D1 query', details: error.details },
      { status: 500 },
    )
  }

  if (error instanceof D1ProjectsTableError) {
    console.error('[api/projects duplicate] Projects table operation failed', error)
    return NextResponse.json(
      { error: 'Failed to operate on Cloudflare D1 projects table', details: error.details },
      { status: 500 },
    )
  }

  console.error('[api/projects duplicate] Unexpected error', error)
  return NextResponse.json(
    {
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 },
  )
}
