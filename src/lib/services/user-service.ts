import 'server-only'

import { getSupabaseAdminClient } from '@/lib/db/db-client'
import { recordCreditTransaction } from '@/lib/db/creditTransactions'
import type { AuthUserProfile } from '@/lib/auth'
import { ApiError } from '@/lib/errors/types'

const FIRST_LOGIN_CREDIT_BONUS = 100

const USER_SELECT_COLUMNS =
  'id, legacy_user_id, email, name, image_url, avatar_url, subscription_tier, credits, credits_used, credits_reset_date, polar_customer_id, polar_subscription_id, subscription_status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at'

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
  polar_customer_id?: string | null
  polar_subscription_id?: string | null
  subscription_status?: string | null
  current_period_start?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

export type SubscriptionUpdateData = {
  polarSubscriptionId?: string | null
  polarCustomerId?: string | null
  subscriptionStatus?: string | null
  subscriptionTier?: string | null
  currentPeriodStart?: string | null
  currentPeriodEnd?: string | null
  cancelAtPeriodEnd?: boolean
}

export class UserService {
  // Sync auth user with database
  async syncAuthUser(profile: AuthUserProfile): Promise<UserRecord> {
    const existingByAuthId = await this.selectUserById(profile.id)

    let existingByEmail: UserRecord | null = null
    if (profile.email) {
      existingByEmail = await this.selectUserByEmail(profile.email)
    }

    if (existingByAuthId) {
      if (existingByEmail && existingByEmail.id !== existingByAuthId.id) {
        console.log(
          `[syncAuthUser] Split account detected. Merging data from ${existingByEmail.id} to ${existingByAuthId.id}`
        )
        await this.mergeUsers(existingByAuthId.id, existingByEmail.id)
      }

      await this.updateAuthMapping(existingByAuthId.id, profile)
      return (await this.selectUserById(profile.id)) ?? existingByAuthId
    }

    if (existingByEmail) {
      if (existingByEmail.id !== profile.id) {
        console.log(
          `[syncAuthUser] ID mismatch detected for email ${profile.email}. Migrating ${existingByEmail.id} to ${profile.id}`
        )
        await this.migrateUser(existingByEmail.id, profile.id)

        const migratedUser = await this.selectUserById(profile.id)
        if (migratedUser) {
          await this.updateAuthMapping(migratedUser.id, profile)
          return migratedUser
        }
      } else {
        await this.updateAuthMapping(existingByEmail.id, profile)
        return (await this.selectUserById(profile.id)) ?? existingByEmail
      }
    }

    return this.createUser(profile)
  }

  // Get user by ID
  async getUserById(userId: string): Promise<UserRecord | null> {
    const byId = await this.selectUserById(userId)
    if (byId) {
      return byId
    }
    return this.selectUserByLegacyId(userId)
  }

  // Add credits to user
  async addCredits(userId: string, amount: number): Promise<void> {
    if (amount <= 0) {
      return
    }

    const targetUserId = await this.resolveUserIdForWrite(userId)
    if (!targetUserId) {
      console.warn(`[addCredits] User not found for ${userId}`)
      return
    }

    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.rpc('add_credits', {
      p_user_id: targetUserId,
      p_amount: amount,
    })

    if (error) {
      throw new ApiError(500, `Failed to add credits: ${error.message}`, 'DATABASE_ERROR')
    }
  }

  // Grant credits with reset date
  async grantCreditsWithResetDate(
    userId: string,
    amount: number,
    nextResetDate: string | null
  ): Promise<void> {
    const targetUserId = await this.resolveUserIdForWrite(userId)
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

    if (error) {
      throw new ApiError(500, `Failed to grant credits: ${error.message}`, 'DATABASE_ERROR')
    }
  }

  // Update subscription tier
  async updateSubscriptionTier(userId: string, planId: string | null): Promise<void> {
    const targetUserId = await this.resolveUserIdForWrite(userId)
    if (!targetUserId) {
      console.warn(`[updateSubscriptionTier] User not found for ${userId}`)
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

    if (error) {
      throw new ApiError(
        500,
        `Failed to update subscription tier: ${error.message}`,
        'DATABASE_ERROR'
      )
    }
  }

  // Update subscription data from Polar webhook
  async updateSubscription(userId: string, data: SubscriptionUpdateData): Promise<void> {
    const targetUserId = await this.resolveUserIdForWrite(userId)
    if (!targetUserId) {
      console.warn(`[updateSubscription] User not found for ${userId}`)
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
    const { error } = await supabase.from('users').update(updatePayload).eq('id', targetUserId)

    if (error) {
      throw new ApiError(500, `Failed to update subscription: ${error.message}`, 'DATABASE_ERROR')
    }

    console.log(`[updateSubscription] Updated subscription for user ${targetUserId}`, {
      status: data.subscriptionStatus,
      tier: data.subscriptionTier,
      periodEnd: data.currentPeriodEnd,
    })
  }

  // Delete user
  async deleteUser(userId: string): Promise<void> {
    console.log(`[deleteUser] Starting deletion for user ${userId}`)

    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.from('users').delete().eq('id', userId)

    if (error) {
      throw new ApiError(500, `Failed to delete user: ${error.message}`, 'DATABASE_ERROR')
    }

    console.log(`[deleteUser] Successfully deleted user ${userId}`)
  }

  // Merge two users (move data from source to target)
  async mergeUsers(targetUserId: string, sourceUserId: string): Promise<void> {
    console.log(`[mergeUsers] Merging data from ${sourceUserId} to ${targetUserId}`)

    const supabase = getSupabaseAdminClient()
    const tablesToUpdate = ['uploaded_models', 'uploaded_locations', 'credit_transactions']

    for (const table of tablesToUpdate) {
      try {
        const { error } = await supabase
          .from(table)
          .update({ user_id: targetUserId })
          .eq('user_id', sourceUserId)

        if (error) {
          console.warn(`[mergeUsers] Failed to update table ${table}:`, error)
        } else {
          console.log(
            `[mergeUsers] Moved records in ${table} from ${sourceUserId} to ${targetUserId}`
          )
        }
      } catch (error) {
        console.warn(`[mergeUsers] Failed to update table ${table}:`, error)
      }
    }

    try {
      const { error } = await supabase.from('users').delete().eq('id', sourceUserId)

      if (error) {
        throw new ApiError(
          500,
          `Failed to delete source user during merge: ${error.message}`,
          'DATABASE_ERROR'
        )
      }
      console.log(`[mergeUsers] Deleted source user record ${sourceUserId}`)
    } catch (error) {
      throw new ApiError(500, 'Unable to delete source user during merge', 'DATABASE_ERROR', error)
    }
  }

  // Migrate user (change primary key)
  async migrateUser(oldId: string, newId: string): Promise<void> {
    console.log(`[migrateUser] Migrating user data from ${oldId} to ${newId}`)

    const supabase = getSupabaseAdminClient()
    const tablesToUpdate = ['uploaded_models', 'uploaded_locations', 'credit_transactions']

    for (const table of tablesToUpdate) {
      try {
        const { error } = await supabase.from(table).update({ user_id: newId }).eq('user_id', oldId)

        if (error) {
          console.warn(`[migrateUser] Failed to update table ${table}:`, error)
        } else {
          console.log(`[migrateUser] Updated ${table} for user migration`)
        }
      } catch (error) {
        console.warn(`[migrateUser] Failed to update table ${table}:`, error)
      }
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ id: newId, legacy_user_id: oldId })
        .eq('id', oldId)

      if (error) {
        throw new ApiError(500, `Failed to migrate user: ${error.message}`, 'DATABASE_ERROR')
      }
      console.log(`[migrateUser] Updated users table primary key`)
    } catch (error) {
      throw new ApiError(500, 'Unable to migrate user record in database', 'DATABASE_ERROR', error)
    }
  }

  // Private helper methods
  private async selectUserById(userId: string): Promise<UserRecord | null> {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('users')
      .select(USER_SELECT_COLUMNS)
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('[selectUserById] Error:', error)
      return null
    }

    return data ? this.normaliseUserRecord(data as Record<string, unknown>) : null
  }

  private async selectUserByEmail(email: string): Promise<UserRecord | null> {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('users')
      .select(USER_SELECT_COLUMNS)
      .ilike('email', email)
      .maybeSingle()

    if (error) {
      console.error('[selectUserByEmail] Error:', error)
      return null
    }

    return data ? this.normaliseUserRecord(data as Record<string, unknown>) : null
  }

  private async selectUserByLegacyId(legacyUserId: string): Promise<UserRecord | null> {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('users')
      .select(USER_SELECT_COLUMNS)
      .eq('legacy_user_id', legacyUserId)
      .maybeSingle()

    if (error) {
      console.error('[selectUserByLegacyId] Error:', error)
      return null
    }

    return data ? this.normaliseUserRecord(data as Record<string, unknown>) : null
  }

  private async resolveUserIdForWrite(userId: string): Promise<string | null> {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .or(`id.eq.${userId},legacy_user_id.eq.${userId}`)
      .maybeSingle()

    if (error) {
      console.error('[resolveUserIdForWrite] Error:', error)
      return null
    }

    return data?.id ? String(data.id) : null
  }

  private async updateAuthMapping(userId: string, profile: AuthUserProfile): Promise<void> {
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
      const { error } = await supabase.from('users').update(updatePayload).eq('id', userId)

      if (error) {
        throw new ApiError(500, `Failed to update user: ${error.message}`, 'DATABASE_ERROR')
      }
    } catch (error) {
      throw new ApiError(500, 'Unable to update user record in database', 'DATABASE_ERROR', error)
    }
  }

  private async createUser(profile: AuthUserProfile): Promise<UserRecord> {
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

      if (error) {
        throw new ApiError(500, `Failed to create user: ${error.message}`, 'DATABASE_ERROR')
      }
    } catch (error) {
      throw new ApiError(500, 'Unable to create user record in database', 'DATABASE_ERROR', error)
    }

    const created = await this.selectUserById(profile.id)
    if (!created) {
      throw new ApiError(
        500,
        'User was inserted but could not be re-fetched from database',
        'DATABASE_ERROR'
      )
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

  private normaliseUserRecord(row: Record<string, unknown>): UserRecord {
    const record = row as Record<string, unknown>
    const imageUrl = this.resolveImageUrl(record)

    return {
      id: String(record.id),
      legacy_user_id: this.toNullableString(record.legacy_user_id),
      email: this.toNullableString(record.email),
      name: this.toNullableString(record.name),
      image_url: imageUrl,
      avatar_url: this.toNullableString(record.avatar_url),
      subscription_tier: this.toNullableString(record.subscription_tier),
      credits: this.toNullableNumber(record.credits),
      credits_used: this.toNullableNumber(record.credits_used),
      credits_reset_date: this.toNullableString(record.credits_reset_date),
      polar_customer_id: this.toNullableString(record.polar_customer_id),
      polar_subscription_id: this.toNullableString(record.polar_subscription_id),
      subscription_status: this.toNullableString(record.subscription_status),
      current_period_start: this.toNullableString(record.current_period_start),
      current_period_end: this.toNullableString(record.current_period_end),
      cancel_at_period_end: this.toNullableBoolean(record.cancel_at_period_end),
      created_at: this.toNullableString(record.created_at),
      updated_at: this.toNullableString(record.updated_at),
    }
  }

  private resolveImageUrl(record: Record<string, unknown>): string | null {
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

  private toNullableString(value: unknown): string | null {
    if (typeof value === 'string') return value
    if (value === null || typeof value === 'undefined') return null
    return String(value)
  }

  private toNullableNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value)
      return Number.isNaN(parsed) ? null : parsed
    }
    return null
  }

  private toNullableBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value
    if (value === null || typeof value === 'undefined') return null
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') {
      const lower = value.toLowerCase()
      if (lower === 'true' || lower === '1') return true
      if (lower === 'false' || lower === '0') return false
    }
    return null
  }
}

// Export singleton instance
export const userService = new UserService()
