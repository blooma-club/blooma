import { NextRequest } from 'next/server'
import { requireAuth, createErrorHandler, createApiResponse } from '@/lib/errors/handlers'
import { ApiError } from '@/lib/errors/api'
import { getProjectForUser } from '@/lib/db/projects'

const handleError = createErrorHandler('api/projects/[projectId]')

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await requireAuth()
    const { projectId } = await context.params

    if (!projectId) {
      throw ApiError.badRequest('Project ID is required')
    }

    const project = await getProjectForUser(userId, projectId)
    return createApiResponse(project)
  } catch (error) {
    return handleError(error)
  }
}
