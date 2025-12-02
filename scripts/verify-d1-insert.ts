
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// --- Environment Setup ---
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
    console.log('Loading .env.local');
    dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
    console.log('Loading .env');
    dotenv.config({ path: envPath });
} else {
    console.warn('No .env or .env.local file found!');
}

// --- D1 Logic (from src/lib/db/d1.ts) ---

const DEFAULT_API_BASE_URL = 'https://api.cloudflare.com/client/v4'

type CloudflareError = {
    code?: number
    message: string
}

type D1StatementResult<T = unknown> = {
    results?: T[]
    success: boolean
    error?: string
    meta?: unknown
}

type CloudflareD1Response<T> = {
    success: boolean
    errors?: CloudflareError[]
    messages?: unknown[]
    result?: D1StatementResult<T>[] | D1StatementResult<T> | null
}

type D1Config = {
    accountId: string
    databaseId: string
    apiToken: string
    apiBaseUrl: string
}

class D1ConfigurationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'D1ConfigurationError'
    }
}

class D1QueryError extends Error {
    details?: unknown

    constructor(message: string, details?: unknown) {
        super(message)
        this.name = 'D1QueryError'
        this.details = details
    }
}

let cachedConfig: D1Config | null = null

function resolveConfig(): D1Config {
    if (cachedConfig) return cachedConfig

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID
    const apiToken = process.env.CLOUDFLARE_D1_API_TOKEN
    const apiBaseUrl = process.env.CLOUDFLARE_API_BASE_URL ?? DEFAULT_API_BASE_URL

    if (!accountId) throw new D1ConfigurationError('CLOUDFLARE_ACCOUNT_ID is not configured')
    if (!databaseId) throw new D1ConfigurationError('CLOUDFLARE_D1_DATABASE_ID is not configured')
    if (!apiToken) throw new D1ConfigurationError('CLOUDFLARE_D1_API_TOKEN is not configured')

    cachedConfig = { accountId, databaseId, apiToken, apiBaseUrl }
    return cachedConfig
}

function normalizeResults<T>(result: CloudflareD1Response<T>['result']): D1StatementResult<T>[] {
    if (!result) return []
    return Array.isArray(result) ? result : [result]
}

async function parseResponse<T>(response: Response): Promise<CloudflareD1Response<T>> {
    const text = await response.text()
    try {
        return JSON.parse(text) as CloudflareD1Response<T>
    } catch {
        throw new D1QueryError('Unable to parse Cloudflare D1 response payload', text)
    }
}

async function executeD1Request<T>(
    requestPayload: { sql: string; params?: unknown[] }
): Promise<D1StatementResult<T>[]> {
    const { accountId, databaseId, apiToken, apiBaseUrl } = resolveConfig()
    const endpoint = `${apiBaseUrl}/accounts/${accountId}/d1/database/${databaseId}/query`

    const requestInit: RequestInit = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify(requestPayload),
    }

    console.log(`Executing D1 Query: ${requestPayload.sql}`);

    const response = await fetch(endpoint, requestInit)
    const responsePayload = await parseResponse<T>(response)

    if (!response.ok || !responsePayload.success) {
        console.error('D1 Query Failed:', JSON.stringify(responsePayload, null, 2));
        throw new D1QueryError('Cloudflare D1 query failed', {
            status: response.status,
            errors: responsePayload.errors,
        })
    }

    const statements = normalizeResults(responsePayload.result)
    const lastStatement = statements.at(-1)

    if (lastStatement && !lastStatement.success) {
        throw new D1QueryError('Cloudflare D1 statement failed', {
            error: lastStatement.error,
        })
    }

    return statements
}

async function queryD1<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const statements = await executeD1Request<T>({ sql, params })
    const lastStatement = statements.at(-1)
    return lastStatement?.results ?? []
}

async function queryD1Single<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await queryD1<T>(sql, params)
    return rows.length > 0 ? rows[0] : null
}

// --- Users Logic (from src/lib/db/users.ts) ---

type ClerkUserProfile = {
    id: string
    email: string | null
    name: string | null
    imageUrl: string | null
}

type D1UserRecord = {
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
    created_at?: string | null
    updated_at?: string | null
}

type UsersTableMetadata = {
    columns: Set<string>
    idColumn: 'id' | 'user_id'
}

let cachedMetadata: UsersTableMetadata | null = null

class D1UsersTableError extends Error {
    details?: unknown
    constructor(message: string, details?: unknown) {
        super(message)
        this.name = 'D1UsersTableError'
        this.details = details
    }
}

async function syncClerkUser(profile: ClerkUserProfile): Promise<D1UserRecord> {
    const metadata = await getUsersTableMetadata()

    const existingByClerkId = await selectUserByClerkId(profile.id, metadata)
    if (existingByClerkId) {
        console.log('User found by Clerk ID, updating...');
        await updateClerkMapping(existingByClerkId.id, profile, metadata)
        return (await selectUserByClerkId(profile.id, metadata)) ?? existingByClerkId
    }

    if (profile.email) {
        const existingByEmail = await selectUserByEmail(profile.email, metadata)
        if (existingByEmail) {
            console.log('User found by Email, updating...');
            await updateClerkMapping(existingByEmail.id, profile, metadata)
            return (await selectUserByClerkId(profile.id, metadata)) ?? existingByEmail
        }
    }

    console.log('Creating new user...');
    return createD1User(profile, metadata)
}

async function getUsersTableMetadata(): Promise<UsersTableMetadata> {
    if (cachedMetadata) return cachedMetadata
    const columns = await getUsersTableColumnSet()
    const idColumn = resolveIdColumn(columns)
    cachedMetadata = { columns, idColumn }
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
    if (columns.has('id')) return 'id'
    if (columns.has('user_id')) return 'user_id'
    throw new D1UsersTableError('users table is missing an identifier column ("id" or "user_id")')
}

async function selectUserByClerkId(clerkUserId: string, metadata: UsersTableMetadata): Promise<D1UserRecord | null> {
    const selectColumns = buildUserSelectColumns(metadata)
    const whereClause = metadata.columns.has('clerk_user_id') ? 'clerk_user_id = ?1' : `${metadata.idColumn} = ?1`
    const row = await queryD1Single<Record<string, unknown>>(
        `SELECT ${selectColumns} FROM users WHERE ${whereClause} LIMIT 1`,
        [clerkUserId]
    )
    return row ? normaliseUserRecord(row) : null
}

async function selectUserByEmail(email: string, metadata: UsersTableMetadata): Promise<D1UserRecord | null> {
    if (!metadata.columns.has('email')) return null
    const selectColumns = buildUserSelectColumns(metadata)
    const row = await queryD1Single<Record<string, unknown>>(
        `SELECT ${selectColumns} FROM users WHERE email = ?1 LIMIT 1`,
        [email]
    )
    return row ? normaliseUserRecord(row) : null
}

async function updateClerkMapping(userId: string, profile: ClerkUserProfile, metadata: UsersTableMetadata): Promise<void> {
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

    if (assignments.length === 0) return

    values.push(userId)

    try {
        await queryD1(
            `UPDATE users SET ${assignments.join(', ')} WHERE ${metadata.idColumn} = ?`,
            values
        )
    } catch (error) {
        throw new D1UsersTableError('Unable to update user record in Cloudflare D1', error)
    }
}

async function createD1User(profile: ClerkUserProfile, metadata: UsersTableMetadata): Promise<D1UserRecord> {
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
        values.push('basic')
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

    const placeholders = insertColumns.map(() => '?').join(', ')

    try {
        await queryD1(
            `INSERT INTO users (${insertColumns.join(', ')}) VALUES (${placeholders})`,
            values
        )
    } catch (error) {
        throw new D1UsersTableError('Unable to create user record in Cloudflare D1', error)
    }

    const created = await selectUserByClerkId(profile.id, metadata)
    if (!created) throw new D1UsersTableError('User was inserted but could not be re-fetched from D1')
    return created
}

function buildUserSelectColumns(metadata: UsersTableMetadata): string {
    const selectColumns: string[] = [`${metadata.idColumn} as id`]
    const columns = metadata.columns
    if (columns.has('clerk_user_id')) selectColumns.push('clerk_user_id')
    if (columns.has('email')) selectColumns.push('email')
    if (columns.has('name')) selectColumns.push('name')
    if (columns.has('image_url')) selectColumns.push('image_url')
    else if (columns.has('avatar_url')) selectColumns.push('avatar_url')
    if (columns.has('subscription_tier')) selectColumns.push('subscription_tier')
    if (columns.has('credits')) selectColumns.push('credits')
    if (columns.has('credits_used')) selectColumns.push('credits_used')
    if (columns.has('credits_reset_date')) selectColumns.push('credits_reset_date')
    if (columns.has('created_at')) selectColumns.push('created_at')
    if (columns.has('updated_at')) selectColumns.push('updated_at')
    return selectColumns.join(', ')
}

function normaliseUserRecord(row: Record<string, unknown>): D1UserRecord {
    // Simplified normalization for debug script
    return row as unknown as D1UserRecord;
}

// --- Main Execution ---

async function main() {
    console.log('--- Starting D1 Verification (Standalone Insert) ---');

    try {
        const testUserId = 'test_user_' + Date.now();
        const testUser: ClerkUserProfile = {
            id: testUserId,
            email: `test_${Date.now()}@example.com`,
            name: 'Debug User',
            imageUrl: 'https://example.com/avatar.png',
        };

        console.log(`Attempting to sync user: ${testUserId}`);
        const result = await syncClerkUser(testUser);
        console.log('✅ Successfully synced user!');
        console.log('Result:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('❌ Failed to sync user.');
        if (error instanceof D1QueryError) {
            console.error('D1 Query Error Details:');
            // @ts-ignore
            console.error(JSON.stringify(error.details, null, 2));
            // @ts-ignore
            if (error.details?.errors) {
                // @ts-ignore
                console.error('Specific Errors:', JSON.stringify(error.details.errors, null, 2));
            }
        } else {
            console.error(error);
        }
    }
}

main();
