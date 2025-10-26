import { randomUUID } from 'crypto'
import { queryD1, queryD1Single, D1QueryError } from './d1'
import type { Project, ProjectInput } from '@/types'

type ProjectRow = {
  id: string
  user_id: string
  title: string
  description: string | null
  is_public: number | boolean | null
  created_at: string | null
  updated_at: string | null
}

type CardPreviewRow = {
  image_url?: string | null
  image_urls?: unknown
  selected_image_url?: unknown
}

type CardCloneRow = {
  id: string
  type?: string | null
  title?: string | null
  content?: string | null
  user_input?: string | null
  image_url?: string | null
  image_urls?: string | null
  selected_image_url?: number | string | null
  image_key?: string | null
  image_size?: number | string | null
  image_type?: string | null
  order_index?: number | string | null
  next_card_id?: string | null
  prev_card_id?: string | null
  scene_number?: number | string | null
  shot_type?: string | null
  angle?: string | null
  background?: string | null
  mood_lighting?: string | null
  dialogue?: string | null
  sound?: string | null
  image_prompt?: string | null
  storyboard_status?: string | null
  shot_description?: string | null
  card_width?: number | string | null
}

export class D1ProjectsTableError extends Error {
  details?: unknown

  constructor(message: string, details?: unknown) {
    super(message)
    this.name = 'D1ProjectsTableError'
    this.details = details
  }
}

export class ProjectNotFoundError extends Error {
  constructor() {
    super('Project not found')
    this.name = 'ProjectNotFoundError'
  }
}


export async function listProjectsForUser(userId: string): Promise<Project[]> {
  try {
    const rows = await queryD1<ProjectRow>(
      `SELECT id, user_id, title, description, is_public, created_at, updated_at
       FROM projects
       WHERE user_id = ?1
       ORDER BY datetime(created_at) DESC`,
      [userId],
    )

    const projects = await Promise.all(rows.map(row => enrichProjectRow(row, userId)))
    return projects
  } catch (error) {
    if (error instanceof D1ProjectsTableError) {
      throw error
    }
    throw new D1ProjectsTableError('Unable to fetch projects from Cloudflare D1', error)
  }
}

export async function createProjectForUser(userId: string, input: ProjectInput): Promise<Project> {
  const now = new Date().toISOString()
  const id = randomUUID()

  try {
    await queryD1(
      `INSERT INTO projects (id, user_id, title, description, is_public, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, 0, ?5, ?5)`,
      [id, userId, input.title, input.description ?? null, now],
    )
  } catch (error) {
    if (error instanceof D1ProjectsTableError) {
      throw error
    }
    throw new D1ProjectsTableError('Unable to create project in Cloudflare D1', error)
  }

  const created = await getProjectById(id)
  if (!created) {
    throw new D1ProjectsTableError('Project was created but could not be re-fetched from D1')
  }

  return enrichProjectRow(created, userId)
}

export async function updateProjectForUser(
  userId: string,
  projectId: string,
  updates: Partial<ProjectInput>,
): Promise<Project> {
  const existing = await getProjectById(projectId)
  if (!existing) {
    throw new ProjectNotFoundError()
  }

  const now = new Date().toISOString()

  try {
    await queryD1(
      `UPDATE projects
       SET title = COALESCE(?1, title),
           description = ?2,
           updated_at = ?3
       WHERE id = ?4`,
      [updates.title ?? null, updates.description ?? null, now, projectId],
    )
  } catch (error) {
    if (error instanceof D1ProjectsTableError) {
      throw error
    }
    throw new D1ProjectsTableError('Unable to update project in Cloudflare D1', error)
  }

  const updated = await getProjectById(projectId)
  if (!updated) {
    throw new D1ProjectsTableError('Project was updated but could not be re-fetched from D1')
  }

  return enrichProjectRow(updated, userId)
}

export async function deleteProjectForUser(userId: string, projectId: string): Promise<void> {
  const existing = await getProjectById(projectId)
  if (!existing) {
    throw new ProjectNotFoundError()
  }

  try {
    await deleteRelatedRecords(
      `DELETE FROM cards WHERE project_id = ?1 AND user_id = ?2`,
      [projectId, userId],
      'cards',
    )
    await deleteRelatedRecords(
      `DELETE FROM characters WHERE project_id = ?1 AND user_id = ?2`,
      [projectId, userId],
      'characters',
    )
    await deleteRelatedRecords(
      `DELETE FROM storyboards WHERE project_id = ?1 AND user_id = ?2`,
      [projectId, userId],
      'storyboards',
    )
    await deleteRelatedRecords(
      `DELETE FROM ai_usage WHERE project_id = ?1 AND user_id = ?2`,
      [projectId, userId],
      'ai_usage',
    )

    await queryD1(
      `DELETE FROM projects WHERE id = ?1`,
      [projectId],
    )
  } catch (error) {
    if (error instanceof D1ProjectsTableError) {
      throw error
    }
    throw new D1ProjectsTableError('Unable to delete project from Cloudflare D1', error)
  }
}

export async function duplicateProjectForUser(
  userId: string,
  projectId: string,
): Promise<Project> {
  const existing = await getProjectById(projectId)
  if (!existing) {
    throw new ProjectNotFoundError()
  }

  const now = new Date().toISOString()
  const newProjectId = randomUUID()
  const title = generateDuplicateTitle(existing.title)
  const description = existing.description ?? null
  const isPublic =
    typeof existing.is_public === 'number'
      ? existing.is_public
      : existing.is_public
        ? 1
        : 0

  try {
    await queryD1(
      `INSERT INTO projects (id, user_id, title, description, is_public, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)`,
      [newProjectId, userId, title, description, isPublic, now],
    )
  } catch (error) {
    if (error instanceof D1ProjectsTableError) {
      throw error
    }
    throw new D1ProjectsTableError('Unable to duplicate project in Cloudflare D1', error)
  }

  try {
    await duplicateProjectCards(userId, projectId, newProjectId, now)
  } catch (error) {
    try {
      await queryD1(`DELETE FROM projects WHERE id = ?1`, [newProjectId])
    } catch {
      // If cleanup fails, log and continue throwing the original error.
      console.error('[duplicateProjectForUser] Failed to clean up project after error', error)
    }

    if (error instanceof D1ProjectsTableError) {
      throw error
    }

    throw new D1ProjectsTableError('Unable to duplicate project cards in Cloudflare D1', error)
  }

  const created = await getProjectById(newProjectId)
  if (!created) {
    throw new D1ProjectsTableError('Project was duplicated but could not be re-fetched from D1')
  }

  return enrichProjectRow(created, userId)
}

async function getProjectById(projectId: string): Promise<ProjectRow | null> {
  try {
    return await queryD1Single<ProjectRow>(
      `SELECT id, user_id, title, description, is_public, created_at, updated_at
       FROM projects
       WHERE id = ?1
       LIMIT 1`,
      [projectId],
    )
  } catch (error) {
    if (error instanceof D1ProjectsTableError) {
      throw error
    }
    throw new D1ProjectsTableError('Unable to fetch project from Cloudflare D1', error)
  }
}

async function enrichProjectRow(row: ProjectRow, userId: string): Promise<Project> {
  const base: Project = {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  }

  try {
    const preview = await queryD1Single<CardPreviewRow>(
      `SELECT image_url, image_urls, selected_image_url
       FROM cards
       WHERE user_id = ?1
         AND project_id = ?2
       ORDER BY datetime(created_at) ASC
       LIMIT 1`,
      [userId, row.id],
    )

    if (!preview) {
      return {
        ...base,
        has_cards: false,
        preview_image: null,
      }
    }

    return {
      ...base,
      has_cards: true,
      preview_image: resolvePreviewImage(preview),
    }
  } catch (error) {
    if (error instanceof D1ProjectsTableError) {
      throw error
    }
    throw new D1ProjectsTableError('Unable to resolve project preview from Cloudflare D1', error)
  }
}

async function deleteRelatedRecords(sql: string, params: unknown[], tableName: string): Promise<void> {
  try {
    await queryD1(sql, params)
  } catch (error) {
    if (error instanceof D1ProjectsTableError) {
      throw error
    }

    if (error instanceof D1QueryError && isMissingSchemaResource(error)) {
      console.warn(
        `[projects] Skipping cleanup for missing table or column "${tableName}"`,
        error.details,
      )
      return
    }

    throw new D1ProjectsTableError(
      `Unable to delete related ${tableName} records from Cloudflare D1`,
      error instanceof D1QueryError ? error.details : error,
    )
  }
}

function isMissingSchemaResource(error: D1QueryError): boolean {
  const candidates: unknown[] = []
  if (typeof error.details === 'string') {
    candidates.push(error.details)
  } else if (error.details && typeof error.details === 'object') {
    const details = error.details as Record<string, unknown>
    if (typeof details.messages === 'string') {
      candidates.push(details.messages)
    }
    if (Array.isArray(details.errors)) {
      for (const entry of details.errors) {
        if (entry && typeof entry === 'object' && 'message' in entry) {
          const message = (entry as { message?: unknown }).message
          if (typeof message === 'string') {
            candidates.push(message)
          }
        }
      }
    }
  }

  candidates.push(error.message)

  return candidates.some(message => {
    if (typeof message !== 'string') return false
    const lower = message.toLowerCase()
    return lower.includes('no such table') || lower.includes('no such column')
  })
}

async function duplicateProjectCards(
  userId: string,
  sourceProjectId: string,
  targetProjectId: string,
  timestamp: string,
): Promise<void> {
  const cards = await queryD1<CardCloneRow>(
    `SELECT id, type, title, content, user_input, image_url, image_urls, selected_image_url,
            image_key, image_size, image_type, order_index, next_card_id, prev_card_id,
            scene_number, shot_type, angle, background, mood_lighting, dialogue, sound,
            image_prompt, storyboard_status, shot_description, card_width
       FROM cards
      WHERE project_id = ?1
        AND user_id = ?2
      ORDER BY order_index ASC, datetime(created_at) ASC`,
    [sourceProjectId, userId],
  )

  if (cards.length === 0) {
    return
  }

  const idMap = new Map<string, string>()
  for (const card of cards) {
    idMap.set(card.id, randomUUID())
  }

  for (const card of cards) {
    const newCardId = idMap.get(card.id)
    if (!newCardId) {
      continue
    }

    const params = [
      newCardId,
      targetProjectId,
      userId,
      card.type ?? null,
      card.title ?? null,
      card.content ?? null,
      card.user_input ?? null,
      card.image_url ?? null,
      card.image_urls ?? null,
      parseNullableNumber(card.selected_image_url),
      card.image_key ?? null,
      parseNullableNumber(card.image_size),
      card.image_type ?? null,
      parseNullableNumber(card.order_index),
      card.next_card_id ? idMap.get(card.next_card_id) ?? null : null,
      card.prev_card_id ? idMap.get(card.prev_card_id) ?? null : null,
      parseNullableNumber(card.scene_number),
      card.shot_type ?? null,
      card.angle ?? null,
      card.background ?? null,
      card.mood_lighting ?? null,
      card.dialogue ?? null,
      card.sound ?? null,
      card.image_prompt ?? null,
      card.storyboard_status ?? null,
      card.shot_description ?? null,
      parseNullableNumber(card.card_width),
      timestamp,
      timestamp,
    ]

    await queryD1(
      `INSERT INTO cards (
         id, project_id, user_id, type, title, content, user_input,
         image_url, image_urls, selected_image_url, image_key, image_size, image_type,
         order_index, next_card_id, prev_card_id, scene_number, shot_type, angle,
         background, mood_lighting, dialogue, sound, image_prompt, storyboard_status,
         shot_description, card_width, created_at, updated_at
       ) VALUES (
         ?1, ?2, ?3, ?4, ?5, ?6, ?7,
         ?8, ?9, ?10, ?11, ?12, ?13,
         ?14, ?15, ?16, ?17, ?18, ?19,
         ?20, ?21, ?22, ?23, ?24, ?25, ?26,
         ?27, ?28, ?29
       )`,
      params,
    )
  }
}

function generateDuplicateTitle(original: string): string {
  if (!original || original.trim().length === 0) {
    return 'Untitled Project (Copy)'
  }

  const trimmed = original.trim()
  return trimmed.endsWith('(Copy)') ? `${trimmed} 2` : `${trimmed} (Copy)`
}

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function resolvePreviewImage(card: CardPreviewRow): string | null {
  if (card.image_url && typeof card.image_url === 'string') {
    return card.image_url
  }

  const urls = parseImageUrls(card.image_urls)
  if (!urls || urls.length === 0) {
    return null
  }

  const selectedIndex = parseSelectedIndex(card.selected_image_url)
  return urls[selectedIndex] ?? urls[0]
}

function parseImageUrls(value: unknown): string[] | null {
  if (!value) return null
  if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
    return value as string[]
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string')
      }
    } catch {
      return null
    }
  }

  return null
}

function parseSelectedIndex(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value))
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed))
    }
  }

  return 0
}
