import { queryD1, queryD1Single, queryD1Batch } from './d1'
import type { ClerkUserProfile } from '@/lib/clerk'

export type D1UserRecord = {
  id: string
  clerk_user_id?: string | null
  email?: string | null
  name?: string | null
  image_url?: string | null
  avatar_url?: string | null
  subscription_tier?: string | null
  credits?: number | null
  credits_used?: number | null
  credits_reset_date?: string | null
  // Subscription metadata (from Polar)
  polar_customer_id?: string | null
  polar_subscription_id?: string | null
  subscription_status?: string | null
  current_period_start?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean | null
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

  // Always check by email (case-insensitive) to detect duplicates or migration candidates
  let existingByEmail: D1UserRecord | null = null
  if (profile.email) {
    existingByEmail = await selectUserByEmail(profile.email, metadata)
  }

  if (existingByClerkId) {
    // Scenario A: User exists by ID.
    // Check if there is a "Split Brain" duplicate (same email, different ID)
    if (existingByEmail && existingByEmail.id !== existingByClerkId.id) {
      console.log(`[syncClerkUser] Split account detected. Merging data from ${existingByEmail.id} to ${existingByClerkId.id}`)
      await mergeUsers(existingByClerkId.id, existingByEmail.id)
    }

    await updateClerkMapping(existingByClerkId.id, profile, metadata)
    return (await selectUserByClerkId(profile.id, metadata)) ?? existingByClerkId
  }

  // Scenario B: User does NOT exist by ID.
  if (existingByEmail) {
    // If IDs differ, migrate the old user to the new ID
    if (existingByEmail.id !== profile.id) {
      console.log(`[syncClerkUser] ID mismatch detected for email ${profile.email}. Migrating ${existingByEmail.id} to ${profile.id}`)
      await migrateUser(existingByEmail.id, profile.id)

      // Re-fetch the user after migration
      const migratedUser = await selectUserByClerkId(profile.id, metadata)
      if (migratedUser) {
        await updateClerkMapping(migratedUser.id, profile, metadata)
        return migratedUser
      }
    } else {
      await updateClerkMapping(existingByEmail.id, profile, metadata)
      return (await selectUserByClerkId(profile.id, metadata)) ?? existingByEmail
    }
  }

  return createD1User(profile, metadata)
}

// ... (existing functions) ...

async function selectUserByEmail(
  email: string,
  metadata: UsersTableMetadata,
): Promise<D1UserRecord | null> {
  if (!metadata.columns.has('email')) {
    return null
  }

  const selectColumns = buildUserSelectColumns(metadata)

  // Use LOWER() for case-insensitive matching
  const row = await queryD1Single<Record<string, unknown>>(
    `SELECT ${selectColumns} FROM users WHERE LOWER(email) = LOWER(?1) LIMIT 1`,
    [email],
  )

  return row ? normaliseUserRecord(row) : null
}

// ... (existing functions) ...

/**
 * Merges data from a source user to a target user, then deletes the source user.
 * Used when both old and new user records exist (Split Brain).
 */


export async function getUserById(userId: string): Promise<D1UserRecord | null> {
  const metadata = await getUsersTableMetadata()

  // Try to find by clerk_user_id first since that's what we usually pass as userId
  const byClerkId = await selectUserByClerkId(userId, metadata)
  if (byClerkId) {
    return byClerkId
  }

  // Fallback to primary key lookup
  return selectUserById(userId, metadata)
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

  if (columns.has('subscription_tier')) {
    insertColumns.push('subscription_tier')
    values.push('free')
  }

  if (columns.has('created_at')) {
    insertColumns.push('created_at')
    values.push(now)
  }

  if (columns.has('updated_at')) {
    insertColumns.push('updated_at')
    values.push(now)
  }

  if (columns.has('credits_reset_date')) {
    insertColumns.push('credits_reset_date')
    // Set reset date to 1 month from now
    const nextMonth = new Date(nowDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    values.push(nextMonth.toISOString())
  }

  // Set default credits to 0 for new users
  if (columns.has('credits')) {
    insertColumns.push('credits')
    values.push(0)
  }

  if (columns.has('credits_used')) {
    insertColumns.push('credits_used')
    values.push(0)
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

export async function addCreditsToUser(userId: string, amount: number): Promise<void> {
  if (amount <= 0) {
    return
  }

  const metadata = await getUsersTableMetadata()
  if (!metadata.columns.has('credits')) {
    return
  }

  const assignments: string[] = ['credits = COALESCE(credits, 0) + ?']
  const values: unknown[] = [amount]

  if (metadata.columns.has('updated_at')) {
    assignments.push('updated_at = ?')
    values.push(new Date().toISOString())
  }

  values.push(userId)

  await queryD1(
    `UPDATE users SET ${assignments.join(', ')} WHERE ${metadata.idColumn} = ?`,
    values,
  )
}

/**
 * 사용자의 구독 플랜을 업데이트합니다.
 * @param userId Clerk user ID (external_id)
 * @param planId 구독 플랜 ID ('Starter', 'Pro', 'Studio', 또는 null로 취소/해지)
 */
export async function updateUserSubscriptionTier(
  userId: string,
  planId: string | null,
): Promise<void> {
  const metadata = await getUsersTableMetadata()
  if (!metadata.columns.has('subscription_tier')) {
    return
  }

  const assignments: string[] = ['subscription_tier = ?']
  const values: unknown[] = [planId ?? null] // null은 구독 없음을 의미

  if (metadata.columns.has('updated_at')) {
    assignments.push('updated_at = ?')
    values.push(new Date().toISOString())
  }

  values.push(userId)

  await queryD1(
    `UPDATE users SET ${assignments.join(', ')} WHERE ${metadata.idColumn} = ?`,
    values,
  )
}

/**
 * Subscription data from Polar webhook events
 */
export type SubscriptionUpdateData = {
  /** Polar's internal subscription ID */
  polarSubscriptionId?: string | null
  /** Polar's internal customer ID */
  polarCustomerId?: string | null
  /** Subscription status (active, trialing, past_due, canceled, etc.) */
  subscriptionStatus?: string | null
  /** Plan tier (Starter, Pro, Studio) */
  subscriptionTier?: string | null
  /** Current billing period start (ISO 8601) */
  currentPeriodStart?: string | null
  /** Current billing period end (ISO 8601) */
  currentPeriodEnd?: string | null
  /** Whether subscription will be canceled at period end */
  cancelAtPeriodEnd?: boolean
}

/**
 * Updates user's subscription data from Polar webhook events.
 * This is the comprehensive update function that saves all subscription metadata.
 * 
 * @param userId Clerk user ID (external_id from Polar)
 * @param data Subscription data from webhook event
 */
export async function updateUserSubscription(
  userId: string,
  data: SubscriptionUpdateData
): Promise<void> {
  const metadata = await getUsersTableMetadata()
  const columns = metadata.columns

  const assignments: string[] = []
  const values: unknown[] = []

  // Subscription tier (Starter/Pro/Studio/null)
  if (data.subscriptionTier !== undefined && columns.has('subscription_tier')) {
    assignments.push('subscription_tier = ?')
    values.push(data.subscriptionTier)
  }

  // Polar subscription ID
  if (data.polarSubscriptionId !== undefined && columns.has('polar_subscription_id')) {
    assignments.push('polar_subscription_id = ?')
    values.push(data.polarSubscriptionId)
  }

  // Polar customer ID
  if (data.polarCustomerId !== undefined && columns.has('polar_customer_id')) {
    assignments.push('polar_customer_id = ?')
    values.push(data.polarCustomerId)
  }

  // Subscription status
  if (data.subscriptionStatus !== undefined && columns.has('subscription_status')) {
    assignments.push('subscription_status = ?')
    values.push(data.subscriptionStatus)
  }

  // Current period start
  if (data.currentPeriodStart !== undefined && columns.has('current_period_start')) {
    assignments.push('current_period_start = ?')
    values.push(data.currentPeriodStart)
  }

  // Current period end
  if (data.currentPeriodEnd !== undefined && columns.has('current_period_end')) {
    assignments.push('current_period_end = ?')
    values.push(data.currentPeriodEnd)
  }

  // Cancel at period end flag
  if (data.cancelAtPeriodEnd !== undefined && columns.has('cancel_at_period_end')) {
    assignments.push('cancel_at_period_end = ?')
    values.push(data.cancelAtPeriodEnd ? 1 : 0)
  }

  // Always update updated_at
  if (columns.has('updated_at')) {
    assignments.push('updated_at = ?')
    values.push(new Date().toISOString())
  }

  if (assignments.length === 0) {
    return
  }

  values.push(userId)

  await queryD1(
    `UPDATE users SET ${assignments.join(', ')} WHERE ${metadata.idColumn} = ?`,
    values,
  )

  console.log(`[updateUserSubscription] Updated subscription for user ${userId}`, {
    status: data.subscriptionStatus,
    tier: data.subscriptionTier,
    periodEnd: data.currentPeriodEnd,
  })
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

  if (columns.has('subscription_tier')) {
    selectColumns.push('subscription_tier')
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

  // Subscription metadata columns
  if (columns.has('polar_customer_id')) {
    selectColumns.push('polar_customer_id')
  }

  if (columns.has('polar_subscription_id')) {
    selectColumns.push('polar_subscription_id')
  }

  if (columns.has('subscription_status')) {
    selectColumns.push('subscription_status')
  }

  if (columns.has('current_period_start')) {
    selectColumns.push('current_period_start')
  }

  if (columns.has('current_period_end')) {
    selectColumns.push('current_period_end')
  }

  if (columns.has('cancel_at_period_end')) {
    selectColumns.push('cancel_at_period_end')
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
    subscription_tier: toNullableString(record.subscription_tier),
    credits: toNullableNumber(record.credits),
    credits_used: toNullableNumber(record.credits_used),
    credits_reset_date: toNullableString(record.credits_reset_date),
    // Subscription metadata
    polar_customer_id: toNullableString(record.polar_customer_id),
    polar_subscription_id: toNullableString(record.polar_subscription_id),
    subscription_status: toNullableString(record.subscription_status),
    current_period_start: toNullableString(record.current_period_start),
    current_period_end: toNullableString(record.current_period_end),
    cancel_at_period_end: toNullableBoolean(record.cancel_at_period_end),
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

function toNullableBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (value === null || typeof value === 'undefined') return null
  // SQLite stores booleans as integers (0/1)
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower === 'true' || lower === '1') return true
    if (lower === 'false' || lower === '0') return false
  }
  return null
}

export async function deleteUser(userId: string): Promise<void> {
  console.log(`[deleteUser] Starting cascading deletion for user ${userId}`)

  // Get the ID column name first
  const metadata = await getUsersTableMetadata()
  console.log(`[deleteUser] Using ID column: ${metadata.idColumn}`)

  // Build batch statements - all executed in a single request
  const statements = [
    // 1. Disable FK checks
    { sql: 'PRAGMA foreign_keys = OFF' },

    // 2. Delete from all dependent tables
    // NOTE: cards and projects tables removed with storyboard feature
    { sql: 'DELETE FROM camera_presets WHERE user_id = ?', params: [userId] },
    { sql: 'DELETE FROM uploaded_models WHERE user_id = ?', params: [userId] },
    { sql: 'DELETE FROM uploaded_backgrounds WHERE user_id = ?', params: [userId] },
    { sql: 'DELETE FROM video_jobs WHERE user_id = ?', params: [userId] },
    { sql: 'DELETE FROM credit_transactions WHERE user_id = ?', params: [userId] },

    // 3. Delete the user record
    { sql: `DELETE FROM users WHERE ${metadata.idColumn} = ?`, params: [userId] },

    // 4. Re-enable FK checks
    { sql: 'PRAGMA foreign_keys = ON' }
  ]

  try {
    console.log(`[deleteUser] Executing batch deletion (${statements.length} statements)`)
    await queryD1Batch(statements)
    console.log(`[deleteUser] Successfully deleted user ${userId} and all related data`)
  } catch (error) {
    console.error(`[deleteUser] Batch deletion failed:`, error)
    throw new D1UsersTableError('Unable to delete user from Cloudflare D1', error)
  }
}

export async function mergeUsers(targetUserId: string, sourceUserId: string): Promise<void> {
  console.log(`[mergeUsers] Merging data from ${sourceUserId} to ${targetUserId}`)

  const tablesToUpdate = [
    // NOTE: 'projects' and 'cards' removed with storyboard feature
    'camera_presets',
    'uploaded_models',
    'uploaded_backgrounds',
    'video_jobs',
    'credit_transactions'
  ]

  // 1. Move dependent data to target user
  for (const table of tablesToUpdate) {
    try {
      const tableExists = await queryD1(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table])
      if (tableExists.length > 0) {
        await queryD1(`UPDATE ${table} SET user_id = ? WHERE user_id = ?`, [targetUserId, sourceUserId])
        console.log(`[mergeUsers] Moved records in ${table} from ${sourceUserId} to ${targetUserId}`)
      }
    } catch (error) {
      console.warn(`[mergeUsers] Failed to update table ${table}`, error)
    }
  }

  // 2. Delete the source user (since target user already exists)
  const metadata = await getUsersTableMetadata()
  try {
    await queryD1(
      `DELETE FROM users WHERE ${metadata.idColumn} = ?`,
      [sourceUserId]
    )
    console.log(`[mergeUsers] Deleted source user record ${sourceUserId}`)
  } catch (error) {
    throw new D1UsersTableError('Unable to delete source user during merge', error)
  }
}

export async function migrateUser(oldId: string, newId: string): Promise<void> {
  console.log(`[migrateUser] Migrating user data from ${oldId} to ${newId}`)

  const tablesToUpdate = [
    // NOTE: 'projects' and 'cards' removed with storyboard feature
    'camera_presets',
    'uploaded_models',
    'uploaded_backgrounds',
    'video_jobs',
    'credit_transactions'
  ]

  // 1. Update dependent tables
  for (const table of tablesToUpdate) {
    try {
      // Check if table exists first to avoid errors
      const tableExists = await queryD1(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table])
      if (tableExists.length > 0) {
        await queryD1(`UPDATE ${table} SET user_id = ? WHERE user_id = ?`, [newId, oldId])
        console.log(`[migrateUser] Updated ${table} for user migration`)
      }
    } catch (error) {
      console.warn(`[migrateUser] Failed to update table ${table}`, error)
      // Continue with other tables
    }
  }

  // 2. Update users table (Primary Key update)
  const metadata = await getUsersTableMetadata()
  try {
    await queryD1(
      `UPDATE users SET ${metadata.idColumn} = ?, clerk_user_id = ? WHERE ${metadata.idColumn} = ?`,
      [newId, newId, oldId]
    )
    console.log(`[migrateUser] Updated users table primary key`)
  } catch (error) {
    throw new D1UsersTableError('Unable to migrate user record in Cloudflare D1', error)
  }
}

