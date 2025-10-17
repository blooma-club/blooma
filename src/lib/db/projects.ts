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

export class ProjectOwnershipError extends Error {
  constructor() {
    super('Not authorized to modify this project')
    this.name = 'ProjectOwnershipError'
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

  if (existing.user_id !== userId) {
    throw new ProjectOwnershipError()
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

  if (existing.user_id !== userId) {
    throw new ProjectOwnershipError()
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
    await deleteRelatedRecords(
      `DELETE FROM credit_transactions WHERE project_id = ?1 AND user_id = ?2`,
      [projectId, userId],
      'credit_transactions',
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
