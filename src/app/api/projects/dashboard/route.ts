import { createApiResponse, createErrorHandler, requireAuth } from '@/lib/errors/handlers'
import { queryD1 } from '@/lib/db/d1'

const handleError = createErrorHandler('api/projects/dashboard')

type DashboardProjectRow = {
  project_id: string
  project_title: string | null
  project_created_at: string | null
  card_title: string | null
  image_url: string | null
}

type DashboardProjectPreview = {
  project_id: string
  project_title: string | null
  card_title: string | null
  title: string
  image_url: string | null
  created_at: string | null
}

export async function GET() {
  try {
    const { userId } = await requireAuth()

    const sql = `
      WITH ranked_cards AS (
        SELECT 
          c.project_id,
          c.title AS card_title,
          c.image_url,
          ROW_NUMBER() OVER (
            PARTITION BY c.project_id 
            ORDER BY c.order_index ASC, datetime(c.created_at) ASC
          ) AS rn
        FROM cards c
        WHERE c.user_id = ?1
          AND c.order_index = 0
      )
      SELECT 
        p.id AS project_id,
        p.title AS project_title,
        p.created_at AS project_created_at,
        rc.card_title,
        rc.image_url
      FROM projects p
      LEFT JOIN ranked_cards rc
        ON rc.project_id = p.id
       AND rc.rn = 1
      WHERE p.user_id = ?1
      ORDER BY datetime(p.created_at) DESC
    `

    const rows = await queryD1<DashboardProjectRow>(sql, [userId])
    const data: DashboardProjectPreview[] = rows.map(row => ({
      project_id: row.project_id,
      project_title: row.project_title,
      card_title: row.card_title,
      title: row.card_title ?? row.project_title ?? 'Untitled Project',
      image_url: row.image_url,
      created_at: row.project_created_at,
    }))

    return createApiResponse(data)
  } catch (error) {
    return handleError(error)
  }
}
