import { queryD1, queryD1Single } from './d1'
import type { ClerkUserProfile } from '@/lib/clerk'

export type D1UserRecord = {
  id: string
  clerk_user_id?: string | null
  email?: string | null
  name?: string | null
  image_url?: string | null
  avatar_url?: string | null
  credits?: number | null
  credits_used?: number | null
  credits_reset_date?: string | null
  subscription_tier?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type UsersTableMetadata = {
  columns: Set<string>
  idColumn: 'id' | 'user_id'
}

let cachedMetadata: UsersTableMetadata | null = null

export class D1UsersTableError extends Error {
  details?: unknown

  constructor(message: string, details?: unknown) {
    super(message)
    this.name = 'D1UsersTableError'
    this.details = details
  }
}

/**
 * Ensures the Clerk user is present in the Cloudflare D1 users table.
 * The function attempts to locate the user by the Clerk subject first,
 * then by email before falling back to inserting a new record.
 */
export async function syncClerkUser(profile: ClerkUserProfile): Promise<D1UserRecord> {
  const metadata = await getUsersTableMetadata()

  const existingByClerkId = await selectUserByClerkId(profile.id, metadata)
  if (existingByClerkId) {
    await updateClerkMapping(existingByClerkId.id, profile, metadata)
    return (await selectUserByClerkId(profile.id, metadata)) ?? existingByClerkId
  }

  if (profile.email) {
    const existingByEmail = await selectUserByEmail(profile.email, metadata)
    if (existingByEmail) {
      await updateClerkMapping(existingByEmail.id, profile, metadata)
      return (await selectUserByClerkId(profile.id, metadata)) ?? existingByEmail
    }
  }

  return createD1User(profile, metadata)
}

export async function getUserById(userId: string): Promise<D1UserRecord | null> {
  const metadata = await getUsersTableMetadata()
  const row = await selectUserById(userId, metadata)
  return row
}

async function getUsersTableMetadata(): Promise<UsersTableMetadata> {
  if (cachedMetadata) {
    return cachedMetadata
  }

  const columns = await getUsersTableColumnSet()
  const idColumn = resolveIdColumn(columns)

  cachedMetadata = {
    columns,
    idColumn,
  }

  return cachedMetadata
}

async function getUsersTableColumnSet(): Promise<Set<string>> {
  try {
    const rows = await queryD1<{ name?: string }>('PRAGMA table_info(users)')
    const names = rows.map(row => row.name).filter((name): name is string => Boolean(name))
    return new Set(names)
  } catch (error) {
    throw new D1UsersTableError('Unable to inspect Cloudflare D1 users table schema', error)
  }
}

function resolveIdColumn(columns: Set<string>): UsersTableMetadata['idColumn'] {
  if (columns.has('id')) {
    return 'id'
  }

  if (columns.has('user_id')) {
    return 'user_id'
  }

  throw new D1UsersTableError('users table is missing an identifier column ("id" or "user_id")')
}

async function selectUserByClerkId(
  clerkUserId: string,
  metadata: UsersTableMetadata,
): Promise<D1UserRecord | null> {
  const selectColumns = buildUserSelectColumns(metadata)

  const whereClause = metadata.columns.has('clerk_user_id')
    ? 'clerk_user_id = ?1'
    : `${metadata.idColumn} = ?1`

  const row = await queryD1Single<Record<string, unknown>>(
    `SELECT ${selectColumns} FROM users WHERE ${whereClause} LIMIT 1`,
    [clerkUserId],
  )

  return row ? normaliseUserRecord(row) : null
}

async function selectUserById(
  userId: string,
  metadata: UsersTableMetadata,
): Promise<D1UserRecord | null> {
  const selectColumns = buildUserSelectColumns(metadata)

  const row = await queryD1Single<Record<string, unknown>>(
    `SELECT ${selectColumns} FROM users WHERE ${metadata.idColumn} = ?1 LIMIT 1`,
    [userId],
  )

  return row ? normaliseUserRecord(row) : null
}

async function selectUserByEmail(
  email: string,
  metadata: UsersTableMetadata,
): Promise<D1UserRecord | null> {
  if (!metadata.columns.has('email')) {
    return null
  }

  const selectColumns = buildUserSelectColumns(metadata)

  const row = await queryD1Single<Record<string, unknown>>(
    `SELECT ${selectColumns} FROM users WHERE email = ?1 LIMIT 1`,
    [email],
  )

  return row ? normaliseUserRecord(row) : null
}

async function updateClerkMapping(
  userId: string,
  profile: ClerkUserProfile,
  metadata: UsersTableMetadata,
): Promise<void> {
  const assignments: string[] = []
  const values: unknown[] = []

  if (metadata.columns.has('clerk_user_id')) {
    assignments.push('clerk_user_id = ?')
    values.push(profile.id)
  }

  if (metadata.columns.has('email')) {
    assignments.push('email = ?')
    values.push(profile.email ?? null)
  }

  if (metadata.columns.has('name')) {
    assignments.push('name = ?')
    values.push(profile.name ?? null)
  }

  if (metadata.columns.has('image_url')) {
    assignments.push('image_url = ?')
    values.push(profile.imageUrl ?? null)
  } else if (metadata.columns.has('avatar_url')) {
    assignments.push('avatar_url = ?')
    values.push(profile.imageUrl ?? null)
  }

  if (metadata.columns.has('updated_at')) {
    assignments.push('updated_at = ?')
    values.push(new Date().toISOString())
  }

  if (assignments.length === 0) {
    return
  }

  values.push(userId)

  try {
    await queryD1(
      `UPDATE users SET ${assignments.join(', ')} WHERE ${metadata.idColumn} = ?`,
      values,
    )
  } catch (error) {
    throw new D1UsersTableError('Unable to update user record in Cloudflare D1', error)
  }
}

async function createD1User(
  profile: ClerkUserProfile,
  metadata: UsersTableMetadata,
): Promise<D1UserRecord> {
  const nowDate = new Date()
  const now = nowDate.toISOString()
  const creditsResetDate = computeNextCreditsResetDate(nowDate)
  const defaultCredits = resolveDefaultCredits(process.env.CLERK_SYNC_DEFAULT_CREDITS)

  const columns = metadata.columns
  const insertColumns: string[] = []
  const values: unknown[] = []

  insertColumns.push(metadata.idColumn)
  values.push(profile.id)

  if (columns.has('clerk_user_id')) {
    insertColumns.push('clerk_user_id')
    values.push(profile.id)
  }

  if (columns.has('email')) {
    insertColumns.push('email')
    values.push(profile.email ?? null)
  }

  if (columns.has('name')) {
    insertColumns.push('name')
    values.push(profile.name ?? null)
  }

  if (columns.has('image_url')) {
    insertColumns.push('image_url')
    values.push(profile.imageUrl ?? null)
  } else if (columns.has('avatar_url')) {
    insertColumns.push('avatar_url')
    values.push(profile.imageUrl ?? null)
  }

  if (columns.has('credits')) {
    insertColumns.push('credits')
    values.push(defaultCredits)
  }

  if (columns.has('credits_used')) {
    insertColumns.push('credits_used')
    values.push(0)
  }

  if (columns.has('credits_reset_date')) {
    insertColumns.push('credits_reset_date')
    values.push(creditsResetDate)
  }

  if (columns.has('subscription_tier')) {
    insertColumns.push('subscription_tier')
    values.push('basic')
  }

  if (columns.has('created_at')) {
    insertColumns.push('created_at')
    values.push(now)
  }

  if (columns.has('updated_at')) {
    insertColumns.push('updated_at')
    values.push(now)
  }

  const placeholders = insertColumns.map(() => '?').join(', ')

  try {
    await queryD1(
      `INSERT INTO users (${insertColumns.join(', ')}) VALUES (${placeholders})`,
      values,
    )
  } catch (error) {
    throw new D1UsersTableError('Unable to create user record in Cloudflare D1', error)
  }

  const created = await selectUserByClerkId(profile.id, metadata)
  if (!created) {
    throw new D1UsersTableError('User was inserted but could not be re-fetched from D1')
  }

  return created
}

function buildUserSelectColumns(metadata: UsersTableMetadata): string {
  const selectColumns: string[] = [`${metadata.idColumn} as id`]
  const columns = metadata.columns

  if (columns.has('clerk_user_id')) {
    selectColumns.push('clerk_user_id')
  }

  if (columns.has('email')) {
    selectColumns.push('email')
  }

  if (columns.has('name')) {
    selectColumns.push('name')
  }

  if (columns.has('image_url')) {
    selectColumns.push('image_url')
  } else if (columns.has('avatar_url')) {
    selectColumns.push('avatar_url')
  }

  if (columns.has('credits')) {
    selectColumns.push('credits')
  }

  if (columns.has('credits_used')) {
    selectColumns.push('credits_used')
  }

  if (columns.has('credits_reset_date')) {
    selectColumns.push('credits_reset_date')
  }

  if (columns.has('subscription_tier')) {
    selectColumns.push('subscription_tier')
  }

  if (columns.has('created_at')) {
    selectColumns.push('created_at')
  }

  if (columns.has('updated_at')) {
    selectColumns.push('updated_at')
  }

  return selectColumns.join(', ')
}

function normaliseUserRecord(row: Record<string, unknown>): D1UserRecord {
  const record = row as Record<string, unknown>
  const imageUrl = resolveImageUrl(record)

  return {
    id: String(record.id),
    clerk_user_id: toNullableString(record.clerk_user_id),
    email: toNullableString(record.email),
    name: toNullableString(record.name),
    image_url: imageUrl,
    avatar_url: toNullableString(record.avatar_url),
    credits: toNullableNumber(record.credits),
    credits_used: toNullableNumber(record.credits_used),
    credits_reset_date: toNullableString(record.credits_reset_date),
    subscription_tier: toNullableString(record.subscription_tier),
    created_at: toNullableString(record.created_at),
    updated_at: toNullableString(record.updated_at),
  }
}

function resolveImageUrl(record: Record<string, unknown>): string | null {
  const imageUrl = record.image_url
  if (typeof imageUrl === 'string') {
    return imageUrl
  }

  const avatarUrl = record.avatar_url
  if (typeof avatarUrl === 'string') {
    return avatarUrl
  }

  return null
}

function toNullableString(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value === null || typeof value === 'undefined') return null
  return String(value)
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function computeNextCreditsResetDate(reference: Date): string {
  const year = reference.getUTCFullYear()
  const month = reference.getUTCMonth()
  const reset = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0))
  return reset.toISOString()
}

function resolveDefaultCredits(value?: string): number {
  if (!value) {
    return 100
  }

  const parsed = Number(value)
  if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
    return parsed
  }

  return 100
}
