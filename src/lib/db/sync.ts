import { getUserById, D1UserRecord } from '@/lib/db/users'

/**
 * Ensures that a user exists in the D1 database.
 * If the user is missing, throws an error.
 * 
 * Note: JIT sync logic was removed to prevent automatic user creation
 * which could overwrite manually configured user data in D1.
 * 
 * @param userId The Clerk user ID (user_...)
 * @returns The D1 user record
 * @throws Error if user cannot be found
 */
export async function ensureUserExists(userId: string): Promise<D1UserRecord> {
    const existingUser = await getUserById(userId)
    if (existingUser) {
        return existingUser
    }

    console.error(`[ensureUserExists] User ${userId} not found in D1 database`)
    throw new Error(`User ${userId} not found in D1. Please add the user manually or contact support.`)
}

