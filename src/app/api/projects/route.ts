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
import { ensureIndexes } from '@/lib/db/indexes'
import { getUserById, syncClerkUser } from '@/lib/db/users'
import { resolveClerkUserProfile } from '@/lib/clerk'

const handleError = createErrorHandler('api/projects')

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    // 데이터베이스 인덱스 생성 보장 (한 번만 실행됨)
    await ensureIndexes()

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

    // Ensure user exists in D1 to prevent foreign key constraint errors
    const user = await getUserById(userId)
    if (!user) {
      console.log('[api/projects] User not found in D1, syncing from Clerk...', userId)
      try {
        const profile = await resolveClerkUserProfile()
        await syncClerkUser(profile)
        console.log('[api/projects] User synced successfully')
      } catch (syncError) {
        console.error('[api/projects] Failed to sync user during project creation', syncError)
        // Continue and let the DB error out if it must, or throw here
      }
    }

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
