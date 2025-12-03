import { NextResponse } from 'next/server'
import { queryD1 } from '@/lib/db/d1'
import { requireAuth } from '@/lib/errors/handlers'
import { getUserById } from '@/lib/db/users'
import { resolveClerkUserProfile } from '@/lib/clerk'

export async function GET() {
    try {
        // 1. Auth Check
        let authUser
        try {
            authUser = await requireAuth()
        } catch (e) {
            return NextResponse.json({ error: 'Not authenticated', details: e }, { status: 401 })
        }

        const results: any = {
            env: {
                hasDbId: !!process.env.CLOUDFLARE_D1_DATABASE_ID,
                hasAccountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
                hasToken: !!process.env.CLOUDFLARE_D1_API_TOKEN,
            },
            auth: {
                userId: authUser.userId,
            },
            db: {},
        }

        // 2. DB Connection & Schema
        try {
            const tables = await queryD1("PRAGMA table_list")
            results.db.tables = tables

            const usersTable = await queryD1("PRAGMA table_info(users)")
            results.db.usersTableSchema = usersTable

            const projectsTable = await queryD1("PRAGMA table_info(projects)")
            results.db.projectsTableSchema = projectsTable
        } catch (e: any) {
            results.db.error = e.message
        }

        // 3. User Record Check
        try {
            const d1User = await getUserById(authUser.userId)
            results.db.userRecord = d1User || 'NOT_FOUND'

            // Check if there are ANY users
            const userCount = await queryD1("SELECT COUNT(*) as count FROM users")
            results.db.totalUserCount = userCount[0]

            // Check for email collision (if ID is different but email exists)
            const clerkProfile = await resolveClerkUserProfile()
            results.clerkProfile = {
                id: clerkProfile.id,
                email: clerkProfile.email
            }

            if (clerkProfile.email) {
                const userByEmail = await queryD1("SELECT * FROM users WHERE email = ?1", [clerkProfile.email])
                results.db.userByEmail = userByEmail.length > 0 ? userByEmail[0] : 'NOT_FOUND'
            }

        } catch (e: any) {
            results.db.userCheckError = e.message
        }

        return NextResponse.json(results, { status: 200 })
    } catch (error: any) {
        return NextResponse.json({
            error: 'Diagnostic failed',
            message: error.message,
            stack: error.stack
        }, { status: 500 })
    }
}
