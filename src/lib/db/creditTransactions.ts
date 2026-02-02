/**
 * Credit transactions database layer.
 * Provides audit logging for all credit operations.
 */

import { getSupabaseAdminClient, throwIfSupabaseError } from './db'

export type CreditTransactionType = 'grant' | 'consume' | 'refund'

export interface CreditTransaction {
    id: string
    user_id: string
    amount: number
    type: CreditTransactionType
    description: string
    reference_id: string | null
    balance_after: number | null
    created_at: string
}

export interface CreateCreditTransactionInput {
    user_id: string
    amount: number
    type: CreditTransactionType
    description: string
    reference_id?: string
    balance_after?: number
}

/**
 * Records a new credit transaction for audit purposes.
 */
export async function recordCreditTransaction(
    input: CreateCreditTransactionInput
): Promise<CreditTransaction> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.from('credit_transactions').insert({
        id,
        user_id: input.user_id,
        amount: input.amount,
        type: input.type,
        description: input.description,
        reference_id: input.reference_id ?? null,
        balance_after: input.balance_after ?? null,
        created_at: now,
    })
    throwIfSupabaseError(error, { action: 'recordCreditTransaction', userId: input.user_id })

    return {
        id,
        user_id: input.user_id,
        amount: input.amount,
        type: input.type,
        description: input.description,
        reference_id: input.reference_id ?? null,
        balance_after: input.balance_after ?? null,
        created_at: now,
    }
}

/**
 * Lists credit transactions for a user with pagination.
 */
export async function listCreditTransactions(
    userId: string,
    options?: { limit?: number; offset?: number; type?: CreditTransactionType }
): Promise<CreditTransaction[]> {
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0

    const supabase = getSupabaseAdminClient()
    let query = supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)

    if (options?.type) {
        query = query.eq('type', options.type)
    }

    const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    throwIfSupabaseError(error, { action: 'listCreditTransactions', userId })
    return data ?? []
}

/**
 * Gets a single transaction by ID.
 */
export async function getCreditTransaction(
    id: string,
    userId: string
): Promise<CreditTransaction | null> {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle()

    throwIfSupabaseError(error, { action: 'getCreditTransaction', userId, id })
    return data ?? null
}

/**
 * Checks if a transaction with the given reference already exists (for idempotency).
 */
export async function hasTransactionWithReference(
    userId: string,
    referenceId: string
): Promise<boolean> {
    const supabase = getSupabaseAdminClient()
    const { count, error } = await supabase
        .from('credit_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('reference_id', referenceId)

    throwIfSupabaseError(error, { action: 'hasTransactionWithReference', userId, referenceId })
    return (count ?? 0) > 0
}

/**
 * Gets the total credits granted to a user (for debugging/admin).
 */
export async function getTotalCreditsGranted(userId: string): Promise<number> {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
        .from('credit_transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'grant')

    throwIfSupabaseError(error, { action: 'getTotalCreditsGranted', userId })
    return (data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0)
}

/**
 * Gets the total credits consumed by a user.
 */
export async function getTotalCreditsConsumed(userId: string): Promise<number> {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
        .from('credit_transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'consume')

    throwIfSupabaseError(error, { action: 'getTotalCreditsConsumed', userId })
    return (data ?? []).reduce((sum, row) => sum + Math.abs(row.amount ?? 0), 0)
}
