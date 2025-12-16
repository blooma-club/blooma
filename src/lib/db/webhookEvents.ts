'use server'

import { queryD1, queryD1Single } from './d1'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Idempotency Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempts to claim a webhook event for processing.
 * Returns true if this process successfully claimed the event (first to process).
 * Returns false if the event was already claimed/processed (duplicate).
 * 
 * This provides idempotency by using INSERT OR IGNORE with a unique event_id.
 */
export async function tryClaimWebhookEvent(
    eventId: string,
    eventType: string
): Promise<{ claimed: boolean; existingStatus?: WebhookEventStatus }> {
    const now = new Date().toISOString()

    // First, check if event already exists
    const existing = await queryD1Single<WebhookEventRecord>(
        `SELECT event_id, status FROM webhook_events WHERE event_id = ?1`,
        [eventId]
    )

    if (existing) {
        // Event already exists - this is a duplicate
        console.log(`[webhook-idempotency] Duplicate event detected: ${eventId} (status: ${existing.status})`)
        return { claimed: false, existingStatus: existing.status as WebhookEventStatus }
    }

    // Try to insert the event with 'processing' status
    // Using INSERT OR IGNORE to handle race conditions
    try {
        await queryD1(
            `INSERT OR IGNORE INTO webhook_events (event_id, event_type, status, received_at, created_at)
       VALUES (?1, ?2, 'processing', ?3, ?3)`,
            [eventId, eventType, now]
        )

        // Verify we actually inserted (in case of race condition)
        const inserted = await queryD1Single<WebhookEventRecord>(
            `SELECT event_id, status FROM webhook_events WHERE event_id = ?1 AND status = 'processing'`,
            [eventId]
        )

        if (inserted) {
            console.log(`[webhook-idempotency] Claimed event: ${eventId}`)
            return { claimed: true }
        } else {
            // Another process claimed it between our check and insert
            const current = await queryD1Single<WebhookEventRecord>(
                `SELECT status FROM webhook_events WHERE event_id = ?1`,
                [eventId]
            )
            console.log(`[webhook-idempotency] Race condition - event already claimed: ${eventId}`)
            return { claimed: false, existingStatus: current?.status as WebhookEventStatus }
        }
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

    await queryD1(
        `UPDATE webhook_events 
     SET status = 'processed', processed_at = ?1 
     WHERE event_id = ?2`,
        [now, eventId]
    )

    console.log(`[webhook-idempotency] Event processed: ${eventId}`)
}

/**
 * Marks a webhook event as failed with an error message.
 * This allows for potential retry/manual intervention.
 */
export async function markWebhookEventFailed(
    eventId: string,
    errorMessage: string
): Promise<void> {
    const now = new Date().toISOString()
    // Truncate error message to prevent DB issues
    const truncatedError = errorMessage.slice(0, 1000)

    await queryD1(
        `UPDATE webhook_events 
     SET status = 'failed', processed_at = ?1, error = ?2 
     WHERE event_id = ?3`,
        [now, truncatedError, eventId]
    )

    console.log(`[webhook-idempotency] Event failed: ${eventId}`)
}

/**
 * Gets a webhook event by ID (for debugging/admin purposes).
 */
export async function getWebhookEvent(eventId: string): Promise<WebhookEventRecord | null> {
    return queryD1Single<WebhookEventRecord>(
        `SELECT * FROM webhook_events WHERE event_id = ?1`,
        [eventId]
    )
}

/**
 * Cleans up old processed webhook events (optional maintenance).
 * Keeps events for the specified number of days.
 */
export async function cleanupOldWebhookEvents(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
    const cutoffIso = cutoffDate.toISOString()

    const result = await queryD1<{ changes: number }>(
        `DELETE FROM webhook_events 
     WHERE status = 'processed' AND processed_at < ?1`,
        [cutoffIso]
    )

    // D1 doesn't return affected rows easily, so we return 0 as placeholder
    return 0
}
