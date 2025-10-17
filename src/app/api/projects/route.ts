import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import type { ProjectInput } from '@/types'
import {
  createProjectForUser,
  deleteProjectForUser,
  listProjectsForUser,
  updateProjectForUser,
  D1ProjectsTableError,
  ProjectNotFoundError,
  ProjectOwnershipError,
} from '@/lib/db/projects'
import { D1ConfigurationError, D1QueryError } from '@/lib/db/d1'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get('user_id')
    if (requestedUserId && requestedUserId !== userId) {
      return NextResponse.json({ error: 'Access denied for requested user' }, { status: 403 })
    }

    const projects = await listProjectsForUser(userId)
    return NextResponse.json({ data: projects, success: true })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body: ProjectInput = await request.json()
    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const project = await createProjectForUser(userId, body)
    return NextResponse.json({ data: project, success: true })
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body: Partial<ProjectInput> & { id?: string } = await request.json()
    if (!body.id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const project = await updateProjectForUser(userId, body.id, {
      title: body.title,
      description: body.description,
    })

    return NextResponse.json({ data: project, success: true })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body: { id?: string } = await request.json()
    if (!body.id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    await deleteProjectForUser(userId, body.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}

function handleError(error: unknown): NextResponse {
  if (error instanceof ProjectNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  if (error instanceof ProjectOwnershipError) {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }

  if (error instanceof D1ConfigurationError) {
    console.error('[api/projects] Cloudflare D1 is not configured', error)
    return NextResponse.json({ error: 'Cloudflare D1 is not configured' }, { status: 500 })
  }

  if (error instanceof D1QueryError) {
    console.error('[api/projects] Cloudflare D1 query failed', error)
    return NextResponse.json(
      { error: 'Failed to execute Cloudflare D1 query', details: error.details },
      { status: 500 },
    )
  }

  if (error instanceof D1ProjectsTableError) {
    console.error('[api/projects] Projects table operation failed', error)
    return NextResponse.json(
      { error: 'Failed to operate on Cloudflare D1 projects table', details: error.details },
      { status: 500 },
    )
  }

  console.error('[api/projects] Unexpected error', error)
  return NextResponse.json(
    {
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 },
  )
}
