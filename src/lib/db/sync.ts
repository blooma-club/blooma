import { getUserById, UserRecord } from '@/lib/db/users'

/**
 * Ensures that a user exists in the database.
 * This does not auto-create; provisioning is handled during auth.
 */
export async function ensureUserExists(userId: string): Promise<UserRecord> {
    const existingUser = await getUserById(userId)
    if (existingUser) {
        return existingUser
    }

    console.error(`[ensureUserExists] User ${userId} not found in database`)
    throw new Error(`User ${userId} not found in database. Please add the user manually or contact support.`)
}
