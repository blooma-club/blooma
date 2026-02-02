import 'server-only'

import { getSupabaseAdminClient, throwIfSupabaseError } from './db'
import type { AuthUserProfile } from '@/lib/auth'
import { recordCreditTransaction } from '@/lib/db/creditTransactions'

const FIRST_LOGIN_CREDIT_BONUS = 100

export type UserRecord = {
  id: string
  legacy_user_id?: string | null
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

export class UsersTableError extends Error {
  details?: unknown

  constructor(message: string, details?: unknown) {
    super(message)
    this.name = 'UsersTableError'
    this.details = details
  }
}

const USER_SELECT_COLUMNS =
  'id, legacy_user_id, email, name, image_url, avatar_url, subscription_tier, credits, credits_used, credits_reset_date, polar_customer_id, polar_subscription_id, subscription_status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at'

/**
 * Ensures the Auth user is present in the database users table.
 * The function attempts to locate the user by the Auth subject first,
 * then by email before falling back to inserting a new record.
 */
export async function syncAuthUser(profile: AuthUserProfile): Promise<UserRecord> {
  const existingByAuthId = await selectUserById(profile.id)

  // Always check by email (case-insensitive) to detect duplicates or migration candidates
  let existingByEmail: UserRecord | null = null
  if (profile.email) {
    existingByEmail = await selectUserByEmail(profile.email)
  }

  if (existingByAuthId) {
    // Scenario A: User exists by ID.
    // Check if there is a "Split Brain" duplicate (same email, different ID)
    if (existingByEmail && existingByEmail.id !== existingByAuthId.id) {
      console.log(`[syncAuthUser] Split account detected. Merging data from ${existingByEmail.id} to ${existingByAuthId.id}`)
      await mergeUsers(existingByAuthId.id, existingByEmail.id)
    }

    await updateAuthMapping(existingByAuthId.id, profile)
    return (await selectUserById(profile.id)) ?? existingByAuthId
  }

  // Scenario B: User does NOT exist by ID.
  if (existingByEmail) {
    // If IDs differ, migrate the old user to the new ID
    if (existingByEmail.id !== profile.id) {
      console.log(`[syncAuthUser] ID mismatch detected for email ${profile.email}. Migrating ${existingByEmail.id} to ${profile.id}`)
      await migrateUser(existingByEmail.id, profile.id)

      // Re-fetch the user after migration
      const migratedUser = await selectUserById(profile.id)
      if (migratedUser) {
        await updateAuthMapping(migratedUser.id, profile)
        return migratedUser
      }
    } else {
      await updateAuthMapping(existingByEmail.id, profile)
      return (await selectUserById(profile.id)) ?? existingByEmail
    }
  }

  return createUser(profile)
}

export async function getUserById(userId: string): Promise<UserRecord | null> {
  const byId = await selectUserById(userId)
  if (byId) {
    return byId
  }

  // Fallback to legacy ID lookup during migration
  return selectUserByLegacyId(userId)
}

async function resolveUserIdForWrite(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .or(`id.eq.${userId},legacy_user_id.eq.${userId}`)
    .maybeSingle()

  throwIfSupabaseError(error, { action: 'resolveUserIdForWrite', userId })
  return data?.id ? String(data.id) : null
}

async function selectUserByEmail(email: string): Promise<UserRecord | null> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('users')
    .select(USER_SELECT_COLUMNS)
    .ilike('email', email)
    .maybeSingle()

  throwIfSupabaseError(error, { action: 'selectUserByEmail', email })
  return data ? normaliseUserRecord(data as Record<string, unknown>) : null
}

async function selectUserByLegacyId(legacyUserId: string): Promise<UserRecord | null> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('users')
    .select(USER_SELECT_COLUMNS)
    .eq('legacy_user_id', legacyUserId)
    .maybeSingle()

  throwIfSupabaseError(error, { action: 'selectUserByLegacyId', legacyUserId })
  return data ? normaliseUserRecord(data as Record<string, unknown>) : null
}

async function selectUserById(userId: string): Promise<UserRecord | null> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('users')
    .select(USER_SELECT_COLUMNS)
    .eq('id', userId)
    .maybeSingle()

  throwIfSupabaseError(error, { action: 'selectUserById', userId })
  return data ? normaliseUserRecord(data as Record<string, unknown>) : null
}

async function updateAuthMapping(
  userId: string,
  profile: AuthUserProfile,
): Promise<void> {
  const updatePayload: Record<string, unknown> = {}

  if (profile.email !== undefined) {
    updatePayload.email = profile.email ?? null
  }

  if (profile.name !== undefined) {
    updatePayload.name = profile.name ?? null
  }

  if (profile.imageUrl !== undefined) {
    updatePayload.image_url = profile.imageUrl ?? null
    updatePayload.avatar_url = profile.imageUrl ?? null
  }

  updatePayload.updated_at = new Date().toISOString()

  if (Object.keys(updatePayload).length === 0) {
    return
  }

  try {
    const supabase = getSupabaseAdminClient()
    const { error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
    throwIfSupabaseError(error, { action: 'updateAuthMapping', userId })
  } catch (error) {
    throw new UsersTableError('Unable to update user record in database', error)
  }
}

async function createUser(profile: AuthUserProfile): Promise<UserRecord> {
  const nowDate = new Date()
  const now = nowDate.toISOString()

  const nextMonth = new Date(nowDate)
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  const payload = {
    id: profile.id,
    email: profile.email ?? null,
    name: profile.name ?? null,
    image_url: profile.imageUrl ?? null,
    avatar_url: profile.imageUrl ?? null,
    subscription_tier: 'free',
    credits: FIRST_LOGIN_CREDIT_BONUS,
    credits_used: 0,
    credits_reset_date: nextMonth.toISOString(),
    created_at: now,
    updated_at: now,
  }

  try {
    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.from('users').insert(payload)
    throwIfSupabaseError(error, { action: 'createUser', userId: profile.id })
  } catch (error) {
    throw new UsersTableError('Unable to create user record in database', error)
  }

  const created = await selectUserById(profile.id)
  if (!created) {
    throw new UsersTableError('User was inserted but could not be re-fetched from database')
  }

  if (FIRST_LOGIN_CREDIT_BONUS > 0) {
    try {
      await recordCreditTransaction({
        user_id: created.id,
        amount: FIRST_LOGIN_CREDIT_BONUS,
        type: 'grant',
        description: 'welcome_bonus',
        reference_id: `welcome_bonus:${created.id}`,
        balance_after: FIRST_LOGIN_CREDIT_BONUS,
      })
    } catch (error) {
      console.warn('[createUser] Failed to record welcome bonus transaction', error)
    }
  }

  return created
}

export async function addCreditsToUser(userId: string, amount: number): Promise<void> {
  if (amount <= 0) {
    return
  }

  const targetUserId = await resolveUserIdForWrite(userId)
  if (!targetUserId) {
    console.warn(`[addCreditsToUser] User not found for ${userId}`)
    return
  }

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.rpc('add_credits', {
    p_user_id: targetUserId,
    p_amount: amount,
  })
  throwIfSupabaseError(error, { action: 'addCreditsToUser', userId: targetUserId })
}

export async function grantCreditsWithResetDate(
  userId: string,
  amount: number,
  nextResetDate: string | null
): Promise<void> {
  const targetUserId = await resolveUserIdForWrite(userId)
  if (!targetUserId) {
    console.warn(`[grantCreditsWithResetDate] User not found for ${userId}`)
    return
  }

  if (amount === 0 && !nextResetDate) {
    return
  }

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.rpc('grant_credits_with_reset', {
    p_user_id: targetUserId,
    p_amount: amount,
    p_reset_date: nextResetDate,
  })
  throwIfSupabaseError(error, { action: 'grantCreditsWithResetDate', userId: targetUserId })
}

/**
 * ?ъ슜?먯쓽 援щ룆 ?뚮옖???낅뜲?댄듃?⑸땲??
 * @param userId Auth user ID (external_id)
 * @param planId 援щ룆 ?뚮옖 ID ('Small Brands', 'Agency', 'Studio', ?먮뒗 null濡?痍⑥냼/?댁?)
 */
export async function updateUserSubscriptionTier(
  userId: string,
  planId: string | null,
): Promise<void> {
  const targetUserId = await resolveUserIdForWrite(userId)
  if (!targetUserId) {
    console.warn(`[updateUserSubscriptionTier] User not found for ${userId}`)
    return
  }

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase
    .from('users')
    .update({
      subscription_tier: planId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetUserId)
  throwIfSupabaseError(error, { action: 'updateUserSubscriptionTier', userId: targetUserId })
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
  /** Plan tier (Small Brands, Agency, Studio) */
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
 * @param userId Auth user ID (external_id from Polar)
 * @param data Subscription data from webhook event
 */
export async function updateUserSubscription(
  userId: string,
  data: SubscriptionUpdateData
): Promise<void> {
  const targetUserId = await resolveUserIdForWrite(userId)
  if (!targetUserId) {
    console.warn(`[updateUserSubscription] User not found for ${userId}`)
    return
  }

  const updatePayload: Record<string, unknown> = {}

  if (data.subscriptionTier !== undefined) {
    updatePayload.subscription_tier = data.subscriptionTier
  }

  if (data.polarSubscriptionId !== undefined) {
    updatePayload.polar_subscription_id = data.polarSubscriptionId
  }

  if (data.polarCustomerId !== undefined) {
    updatePayload.polar_customer_id = data.polarCustomerId
  }

  if (data.subscriptionStatus !== undefined) {
    updatePayload.subscription_status = data.subscriptionStatus
  }

  if (data.currentPeriodStart !== undefined) {
    updatePayload.current_period_start = data.currentPeriodStart
  }

  if (data.currentPeriodEnd !== undefined) {
    updatePayload.current_period_end = data.currentPeriodEnd
  }

  if (data.cancelAtPeriodEnd !== undefined) {
    updatePayload.cancel_at_period_end = Boolean(data.cancelAtPeriodEnd)
  }

  updatePayload.updated_at = new Date().toISOString()

  if (Object.keys(updatePayload).length === 0) {
    return
  }

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', targetUserId)
  throwIfSupabaseError(error, { action: 'updateUserSubscription', userId: targetUserId })

  console.log(`[updateUserSubscription] Updated subscription for user ${targetUserId}`, {
    status: data.subscriptionStatus,
    tier: data.subscriptionTier,
    periodEnd: data.currentPeriodEnd,
  })
}

function normaliseUserRecord(row: Record<string, unknown>): UserRecord {
  const record = row as Record<string, unknown>
  const imageUrl = resolveImageUrl(record)

  return {
    id: String(record.id),
    legacy_user_id: toNullableString(record.legacy_user_id),
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
  // Legacy data can store booleans as integers (0/1).
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower === 'true' || lower === '1') return true
    if (lower === 'false' || lower === '0') return false
  }
  return null
}

export async function deleteUser(userId: string): Promise<void> {
  console.log(`[deleteUser] Starting deletion for user ${userId}`)

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from('users').delete().eq('id', userId)
  throwIfSupabaseError(error, { action: 'deleteUser', userId })

  console.log(`[deleteUser] Successfully deleted user ${userId}`)
}

export async function mergeUsers(targetUserId: string, sourceUserId: string): Promise<void> {
  console.log(`[mergeUsers] Merging data from ${sourceUserId} to ${targetUserId}`)

  const supabase = getSupabaseAdminClient()
  const tablesToUpdate = [
    // NOTE: 'projects' and 'cards' removed with storyboard feature
    'uploaded_models',
    'uploaded_locations',
    'credit_transactions'
  ]

  // 1. Move dependent data to target user
  for (const table of tablesToUpdate) {
    try {
      const { error } = await supabase
        .from(table)
        .update({ user_id: targetUserId })
        .eq('user_id', sourceUserId)
      throwIfSupabaseError(error, { action: 'mergeUsersUpdate', table, sourceUserId, targetUserId })
      console.log(`[mergeUsers] Moved records in ${table} from ${sourceUserId} to ${targetUserId}`)
    } catch (error) {
      console.warn(`[mergeUsers] Failed to update table ${table}`, error)
    }
  }

  // 2. Delete the source user (since target user already exists)
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', sourceUserId)
    throwIfSupabaseError(error, { action: 'mergeUsersDelete', sourceUserId })
    console.log(`[mergeUsers] Deleted source user record ${sourceUserId}`)
  } catch (error) {
    throw new UsersTableError('Unable to delete source user during merge', error)
  }
}

export async function migrateUser(oldId: string, newId: string): Promise<void> {
  console.log(`[migrateUser] Migrating user data from ${oldId} to ${newId}`)

  const supabase = getSupabaseAdminClient()
  const tablesToUpdate = [
    // NOTE: 'projects' and 'cards' removed with storyboard feature
    'uploaded_models',
    'uploaded_locations',
    'credit_transactions'
  ]

  // 1. Update dependent tables
  for (const table of tablesToUpdate) {
    try {
      const { error } = await supabase
        .from(table)
        .update({ user_id: newId })
        .eq('user_id', oldId)
      throwIfSupabaseError(error, { action: 'migrateUserUpdate', table, oldId, newId })
      console.log(`[migrateUser] Updated ${table} for user migration`)
    } catch (error) {
      console.warn(`[migrateUser] Failed to update table ${table}`, error)
      // Continue with other tables
    }
  }

  // 2. Update users table (Primary Key update)
  try {
    const { error } = await supabase
      .from('users')
      .update({ id: newId, legacy_user_id: oldId })
      .eq('id', oldId)
    throwIfSupabaseError(error, { action: 'migrateUserUpdateUser', oldId, newId })
    console.log(`[migrateUser] Updated users table primary key`)
  } catch (error) {
    throw new UsersTableError('Unable to migrate user record in database', error)
  }
}

