import { NextRequest } from 'next/server'
import { createErrorHandler, createApiResponse, requireAuth } from '@/lib/errors/handlers'
import { ApiError } from '@/lib/errors/api'
import { projectInputSchema } from '@/lib/validation/schemas'
import { ZodError } from 'zod'
import {
  createProjectForUser,
  deleteProjectForUser,
  listProjectsForUser,
  updateProjectForUser,
} from '@/lib/db/projects'

const handleError = createErrorHandler('api/projects')

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get('user_id')
    if (requestedUserId && requestedUserId !== userId) {
      throw ApiError.forbidden('Access denied for requested user')
    }

    const projects = await listProjectsForUser(userId)
    return createApiResponse(projects)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    const body = await request.json()
    const validated = projectInputSchema.parse(body)

    const project = await createProjectForUser(userId, validated)
    return createApiResponse(project)
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    const body = await request.json()
    if (!body.id || typeof body.id !== 'string') {
      throw ApiError.badRequest('Project ID is required')
    }

    const validated = projectInputSchema.partial().parse(body)
    const project = await updateProjectForUser(userId, body.id, validated)

    return createApiResponse(project)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    const body = await request.json()
    if (!body.id || typeof body.id !== 'string') {
      throw ApiError.badRequest('Project ID is required')
    }

    await deleteProjectForUser(userId, body.id)
    return createApiResponse(undefined)
  } catch (error) {
    return handleError(error)
  }
}
