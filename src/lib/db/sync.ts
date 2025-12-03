import { getUserById, syncClerkUser, D1UserRecord } from '@/lib/db/users'
import { resolveClerkUserProfile } from '@/lib/clerk'

/**
 * Ensures that a user exists in the D1 database.
 * If the user is missing, it attempts to fetch the profile from Clerk and sync it.
 * 
 * @param userId The Clerk user ID (user_...)
 * @returns The D1 user record
 * @throws Error if user cannot be found or synced
 */
export async function ensureUserExists(userId: string): Promise<D1UserRecord> {
    // 1. Try to find user in D1
    const existingUser = await getUserById(userId)
    if (existingUser) {
        return existingUser
    }

    console.log(`[ensureUserExists] User ${userId} not found in D1. Attempting JIT sync...`)

    // 2. If missing, fetch from Clerk
    try {
        const profile = await resolveClerkUserProfile()

        // Safety check: ensure we fetched the correct user
        if (profile.id !== userId) {
            console.warn(`[ensureUserExists] ID mismatch. Requested: ${userId}, Resolved: ${profile.id}`)
            // Proceeding anyway as resolveClerkUserProfile returns the *current* authenticated user.
            // If the IDs don't match, it means we are trying to ensure a user that is NOT the current user,
            // which resolveClerkUserProfile cannot do (it only gets the current session user).
            // In that case, we might fail or we might need a different admin-level fetch.
            // For now, we assume this is called in the context of the current user.
            if (profile.id !== userId) {
                throw new Error('Cannot JIT sync a user different from the authenticated session user')
            }
        }

        // 3. Sync to D1
        const syncedUser = await syncClerkUser(profile)
        console.log(`[ensureUserExists] Successfully synced user ${userId}`)
        return syncedUser
    } catch (error) {
        console.error(`[ensureUserExists] Failed to JIT sync user ${userId}`, error)
        throw error
    }
}
