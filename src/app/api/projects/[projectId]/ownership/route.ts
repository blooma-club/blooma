import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { queryD1Single, D1ConfigurationError, D1QueryError } from '@/lib/db/d1'

type ProjectRecord = {
  id: string
  user_id: string
  title?: string | null
  description?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type RouteParams = { projectId?: string }
type RouteContext = { params: Promise<RouteParams> }

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { isOwner: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { projectId } = await context.params

    if (!projectId) {
      return NextResponse.json(
        { isOwner: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    console.log('[ownership] Checking ownership for project:', projectId, 'user:', userId)

    const project = await queryD1Single<ProjectRecord>(
      `
        SELECT id, user_id, title, description, created_at, updated_at
        FROM projects
        WHERE id = ?1
        LIMIT 1
      `,
      [projectId]
    )

    console.log('[ownership] Project query result:', project)

    if (!project) {
      return NextResponse.json(
        { isOwner: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    if (project.user_id !== userId) {
      console.log('[ownership] User mismatch:', project.user_id, 'vs', userId)
      return NextResponse.json(
        { isOwner: false, error: 'You do not have access to this project' },
        { status: 403 }
      )
    }

    console.log('[ownership] Ownership verified successfully')
    return NextResponse.json({
      isOwner: true,
      project,
    })
  } catch (error) {
    if (error instanceof D1ConfigurationError) {
      console.error('[projects/ownership] Missing Cloudflare D1 configuration', error)
      return NextResponse.json(
        {
          isOwner: false,
          error: 'Cloudflare D1 is not configured',
        },
        { status: 500 }
      )
    }

    if (error instanceof D1QueryError) {
      console.error('[projects/ownership] Cloudflare D1 query failed', error)
      return NextResponse.json(
        {
          isOwner: false,
          error: 'Failed to verify project ownership (D1)',
        },
        { status: 500 }
      )
    }

    console.error('[projects/ownership] Unexpected error', error)
    return NextResponse.json(
      {
        isOwner: false,
        error: 'Failed to verify project ownership',
      },
      { status: 500 }
    )
  }
}
