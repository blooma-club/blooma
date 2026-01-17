import 'server-only'

import { getSupabaseAdminClient, throwIfSupabaseError } from './db'

export type WebhookEventStatus = 'processing' | 'processed' | 'failed'

export type WebhookEventRecord = {
    event_id: string
    event_type: string
    status: WebhookEventStatus
    received_at: string
    processed_at: string | null
    error: string | null
    created_at: string
}

/**
 * Attempts to claim a webhook event for processing.
 * Returns true if this process successfully claimed the event.
 */
export async function tryClaimWebhookEvent(
    eventId: string,
    eventType: string
): Promise<{ claimed: boolean; existingStatus?: WebhookEventStatus }> {
    const now = new Date().toISOString()

    const supabase = getSupabaseAdminClient()
    const { data: existing, error: existingError } = await supabase
        .from('webhook_events')
        .select('event_id, status')
        .eq('event_id', eventId)
        .maybeSingle()
    throwIfSupabaseError(existingError, { action: 'tryClaimWebhookEventLookup', eventId })

    if (existing) {
        console.log(`[webhook-idempotency] Duplicate event detected: ${eventId} (status: ${existing.status})`)
        return { claimed: false, existingStatus: existing.status as WebhookEventStatus }
    }

    try {
        const { data: inserted, error: insertError } = await supabase
            .from('webhook_events')
            .upsert(
                [
                    {
                        event_id: eventId,
                        event_type: eventType,
                        status: 'processing',
                        received_at: now,
                        created_at: now,
                    },
                ],
                { onConflict: 'event_id', ignoreDuplicates: true }
            )
            .select('event_id, status')
        throwIfSupabaseError(insertError, { action: 'tryClaimWebhookEventInsert', eventId })

        if (inserted && inserted.length > 0) {
            console.log(`[webhook-idempotency] Claimed event: ${eventId}`)
            return { claimed: true }
        }

        const { data: current, error: currentError } = await supabase
            .from('webhook_events')
            .select('status')
            .eq('event_id', eventId)
            .maybeSingle()
        throwIfSupabaseError(currentError, { action: 'tryClaimWebhookEventCurrent', eventId })
        console.log(`[webhook-idempotency] Race condition - event already claimed: ${eventId}`)
        return { claimed: false, existingStatus: current?.status as WebhookEventStatus }
    } catch (error) {
        console.error(`[webhook-idempotency] Error claiming event ${eventId}:`, error)
        throw error
    }
}

/**
 * Marks a webhook event as successfully processed.
 */
export async function markWebhookEventProcessed(eventId: string): Promise<void> {
    const now = new Date().toISOString()

    const supabase = getSupabaseAdminClient()
    const { error } = await supabase
        .from('webhook_events')
        .update({ status: 'processed', processed_at: now })
        .eq('event_id', eventId)
    throwIfSupabaseError(error, { action: 'markWebhookEventProcessed', eventId })

    console.log(`[webhook-idempotency] Event processed: ${eventId}`)
}

/**
 * Marks a webhook event as failed with an error message.
 */
export async function markWebhookEventFailed(
    eventId: string,
    errorMessage: string
): Promise<void> {
    const now = new Date().toISOString()
    const truncatedError = errorMessage.slice(0, 1000)

    const supabase = getSupabaseAdminClient()
    const { error } = await supabase
        .from('webhook_events')
        .update({ status: 'failed', processed_at: now, error: truncatedError })
        .eq('event_id', eventId)
    throwIfSupabaseError(error, { action: 'markWebhookEventFailed', eventId })

    console.log(`[webhook-idempotency] Event failed: ${eventId}`)
}

/**
 * Gets a webhook event by ID.
 */
export async function getWebhookEvent(eventId: string): Promise<WebhookEventRecord | null> {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
        .from('webhook_events')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle()
    throwIfSupabaseError(error, { action: 'getWebhookEvent', eventId })
    return data ?? null
}

/**
 * Cleans up old processed webhook events.
 */
export async function cleanupOldWebhookEvents(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
    const cutoffIso = cutoffDate.toISOString()

    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
        .from('webhook_events')
        .delete()
        .eq('status', 'processed')
        .lt('processed_at', cutoffIso)
        .select('event_id')
    throwIfSupabaseError(error, { action: 'cleanupOldWebhookEvents' })

    return data?.length ?? 0
}
