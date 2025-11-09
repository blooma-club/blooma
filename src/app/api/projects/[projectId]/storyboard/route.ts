import { NextRequest } from 'next/server'
import { createApiResponse, createErrorHandler, requireAuth } from '@/lib/errors/handlers'
import { projectIdSchema } from '@/lib/validation/schemas'
import { queryD1 } from '@/lib/db/d1'
import { normalizeCardRow, parseNullableInteger, type CardRow } from '@/lib/db/cardRow'
import type { Card } from '@/types'

const handleError = createErrorHandler('api/projects/[projectId]/storyboard')

type BasicStoryboardCard = {
  id: string
  project_id: string
  user_id: string
  title: string
  type: Card['type']
  order_index: number
  scene_number?: number
  image_url?: string
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await requireAuth()
    const params = await context.params
    const projectId = projectIdSchema.parse(params?.projectId)

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') === 'full' ? 'full' : 'basic'

    const sql =
      scope === 'full'
        ? `SELECT *
             FROM cards
             WHERE project_id = ?1
               AND user_id = ?2
             ORDER BY order_index ASC`
        : `SELECT id, project_id, user_id, type, title, order_index, scene_number, image_url
             FROM cards
             WHERE project_id = ?1
               AND user_id = ?2
             ORDER BY order_index ASC`

    const rows = await queryD1<CardRow>(sql, [projectId, userId])

    if (scope === 'full') {
      const data = rows.map(normalizeCardRow)
      return createApiResponse(data)
    }

    const basic: BasicStoryboardCard[] = rows.map(row => ({
      id: row.id,
      project_id: row.project_id,
      user_id: row.user_id,
      title: row.title ?? 'Untitled Scene',
      type: (row.type as Card['type']) ?? 'scene',
      order_index: parseNullableInteger(row.order_index) ?? 0,
      scene_number: parseNullableInteger(row.scene_number),
      image_url: row.image_url ?? undefined,
    }))

    return createApiResponse(basic)
  } catch (error) {
    return handleError(error)
  }
}
