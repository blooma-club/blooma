import { createClerkClient, type VerifyTokenOptions } from '@clerk/backend'

type Env = {
  CLERK_SECRET_KEY: string
  CLERK_PUBLISHABLE_KEY: string
  DB: D1Database
  ALLOWED_ORIGINS?: string
  DEFAULT_CREDITS?: string
}

type ClerkUserProfile = {
  sub: string
  email?: string
  fullName?: string
  imageUrl?: string
}

type D1UserRecord = {
  id: string
  clerk_user_id?: string | null
  email: string | null
}

type ClerkTokenVerifier = (token: string, options?: VerifyTokenOptions) => Promise<unknown>

type D1Database = {
  prepare(query: string): D1PreparedStatement
}

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  run<T = unknown>(): Promise<D1Result<T>>
  all<T = unknown>(): Promise<D1Result<T>>
}

type D1Result<T = unknown> = {
  results?: T[]
  success: boolean
  error?: string
  meta?: unknown
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}

type UsersTableMetadata = {
  columns: Set<string>
  idColumn: 'id' | 'user_id'
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
}

const buildCorsHeaders = (request: Request, allowedOrigins?: string) => {
  const origin = request.headers.get('Origin')
  const entries =
    allowedOrigins && allowedOrigins !== '*'
      ? allowedOrigins.split(',').map(o => o.trim()).filter(Boolean)
      : null

  const allowsOrigin =
    !entries || !origin
      ? allowedOrigins ?? '*'
      : entries.includes(origin)
        ? origin
        : entries[0] ?? origin

  return {
    'Access-Control-Allow-Origin': allowsOrigin ?? '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS, POST',
    'Access-Control-Max-Age': '86400',
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = buildCorsHeaders(request, env.ALLOWED_ORIGINS)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, ...JSON_HEADERS } }
      )
    }

    try {
      const token = extractBearerToken(request)
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Missing Authorization bearer token' }),
          { status: 401, headers: { ...corsHeaders, ...JSON_HEADERS } }
        )
      }

      const clerkProfile = await verifyWithClerk(token, env)
      const mappedUser = await syncD1User(clerkProfile, env)

      return new Response(
        JSON.stringify({
          message: 'Token verified',
          clerkSub: clerkProfile.sub,
          userId: mappedUser?.id ?? null,
        }),
        { status: 200, headers: { ...corsHeaders, ...JSON_HEADERS } }
      )
    } catch (error) {
      console.error('[worker] verification failed', error)

      const status = error instanceof ResponseError ? error.status : 500
      const payload =
        error instanceof ResponseError
          ? { error: error.message, details: error.details }
          : { error: 'Internal Server Error' }

      return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, ...JSON_HEADERS },
      })
    }
  },
}

class ResponseError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? request.headers.get('authorization')
  if (!header) return null

  const [scheme, token] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return null
  }
  return token.trim()
}

async function verifyWithClerk(token: string, env: Env): Promise<ClerkUserProfile> {
  if (!env.CLERK_SECRET_KEY) {
    throw new ResponseError('CLERK_SECRET_KEY is not configured', 500)
  }

  const client = createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  })

  const verify = (client as unknown as { verifyToken?: ClerkTokenVerifier }).verifyToken
  if (typeof verify !== 'function') {
    throw new ResponseError('Clerk client is missing verifyToken()', 500)
  }

  let verificationResult: any
  try {
    verificationResult = await verify.call(client, token, buildVerifyOptions())
  } catch (err) {
    throw new ResponseError('Invalid token', 401, err instanceof Error ? err.message : err)
  }

  const sub = verificationResult?.claims?.sub ?? verificationResult?.session?.sub
  if (!sub) {
    throw new ResponseError('Unable to determine Clerk subject', 400, verificationResult)
  }

  const clerkUser = await client.users.getUser(sub).catch(err => {
    throw new ResponseError('Unable to fetch Clerk user profile', 500, err)
  })

  const primaryEmail = clerkUser.emailAddresses.find(addr => addr.id === clerkUser.primaryEmailAddressId)
  const fallbackEmail = clerkUser.emailAddresses.at(0)
  const fallbackFullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || undefined

  return {
    sub,
    email: primaryEmail?.emailAddress ?? fallbackEmail?.emailAddress,
    fullName: clerkUser.fullName ?? fallbackFullName,
    imageUrl: clerkUser.imageUrl ?? undefined,
  }
}

function buildVerifyOptions(): VerifyTokenOptions {
  return {
    // default leeway provides resiliency for small clock skews
    clockSkewInMs: 5_000,
  }
}

async function syncD1User(profile: ClerkUserProfile, env: Env): Promise<D1UserRecord | null> {
  if (!env.DB) {
    throw new ResponseError('D1 database binding is not configured', 500)
  }

  const db = env.DB
  const metadata = await getUsersTableMetadata(db)

  const existingMapping = await selectUserByClerkId(db, profile.sub, metadata)
  if (existingMapping) {
    await updateClerkMapping(db, existingMapping.id, profile, metadata)

    return {
      ...existingMapping,
      clerk_user_id: profile.sub,
      email: profile.email ?? existingMapping.email ?? null,
    }
  }

  if (profile.email) {
    const existingByEmail = await selectUserByEmail(db, profile.email, metadata)
    if (existingByEmail) {
      await updateClerkMapping(db, existingByEmail.id, profile, metadata)

      return {
        ...existingByEmail,
        clerk_user_id: profile.sub,
        email: profile.email ?? existingByEmail.email ?? null,
      }
    }
  }

  return createD1User(db, profile, env, metadata)
}

async function selectUserByClerkId(
  db: D1Database,
  clerkUserId: string,
  metadata: UsersTableMetadata,
): Promise<D1UserRecord | null> {
  if (!metadata.columns.has('clerk_user_id')) {
    throw new ResponseError('users table is missing required column "clerk_user_id"', 500)
  }

  const selectColumns = buildUserSelectColumns(metadata)

  try {
    return (await db
      .prepare(`SELECT ${selectColumns} FROM users WHERE clerk_user_id = ? LIMIT 1`)
      .bind(clerkUserId)
      .first<D1UserRecord>()) ?? null
  } catch (error) {
    throw new ResponseError('Unable to query users table by clerk_user_id', 500, error)
  }
}

async function selectUserByEmail(
  db: D1Database,
  email: string,
  metadata: UsersTableMetadata,
): Promise<D1UserRecord | null> {
  if (!metadata.columns.has('email')) {
    throw new ResponseError('users table is missing required column "email"', 500)
  }

  const selectColumns = buildUserSelectColumns(metadata)

  try {
    return (await db
      .prepare(`SELECT ${selectColumns} FROM users WHERE email = ? LIMIT 1`)
      .bind(email)
      .first<D1UserRecord>()) ?? null
  } catch (error) {
    throw new ResponseError('Unable to query users table by email', 500, error)
  }
}

async function updateClerkMapping(
  db: D1Database,
  userId: string,
  profile: ClerkUserProfile,
  metadata: UsersTableMetadata,
): Promise<void> {
  const columns = metadata.columns
  const assignments: string[] = []
  const values: unknown[] = []

  if (columns.has('clerk_user_id')) {
    assignments.push('clerk_user_id = ?')
    values.push(profile.sub)
  }

  if (columns.has('email') && typeof profile.email !== 'undefined') {
    assignments.push('email = ?')
    values.push(profile.email)
  }

  if (columns.has('name')) {
    assignments.push('name = ?')
    values.push(profile.fullName ?? null)
  }

  if (columns.has('avatar_url')) {
    assignments.push('avatar_url = ?')
    values.push(profile.imageUrl ?? null)
  }

  if (columns.has('updated_at')) {
    const now = new Date().toISOString()
    assignments.push('updated_at = ?')
    values.push(now)
  }

  if (assignments.length === 0) {
    return
  }

  values.push(userId)

  const statement = db
    .prepare(`UPDATE users SET ${assignments.join(', ')} WHERE ${metadata.idColumn} = ?`)
    .bind(...values)
  const result = await statement.run()

  if (!result.success) {
    throw new ResponseError('Unable to update user mapping in D1', 500, result.error ?? result)
  }
}

async function createD1User(
  db: D1Database,
  profile: ClerkUserProfile,
  env: Env,
  metadata: UsersTableMetadata,
): Promise<D1UserRecord> {
  const columns = metadata.columns

  const generatedId =
    metadata.idColumn === 'user_id' ? profile.sub : crypto.randomUUID()
  const nowDate = new Date()
  const now = nowDate.toISOString()
  const creditsResetDate = computeNextCreditsResetDate(nowDate)
  const defaultCredits = resolveDefaultCredits(env.DEFAULT_CREDITS)

  const desiredColumns: Array<{ name: string; value: unknown; required?: boolean }> = [
    { name: metadata.idColumn, value: generatedId, required: true },
    { name: 'email', value: profile.email ?? null },
    { name: 'name', value: profile.fullName ?? null },
    { name: 'avatar_url', value: profile.imageUrl ?? null },
    { name: 'clerk_user_id', value: profile.sub, required: true },
    { name: 'created_at', value: now },
    { name: 'updated_at', value: now },
  ]

  if (columns.has('credits')) {
    desiredColumns.push({ name: 'credits', value: defaultCredits })
  }

  if (columns.has('credits_used')) {
    desiredColumns.push({ name: 'credits_used', value: 0 })
  }

  if (columns.has('credits_reset_date')) {
    desiredColumns.push({ name: 'credits_reset_date', value: creditsResetDate })
  }

  if (columns.has('subscription_tier')) {
    desiredColumns.push({ name: 'subscription_tier', value: 'free' })
  }

  const insertColumns: string[] = []
  const values: unknown[] = []

  for (const column of desiredColumns) {
    if (!columns.has(column.name)) {
      if (column.required) {
        throw new ResponseError(`users table is missing required column "${column.name}"`, 500)
      }
      continue
    }
    insertColumns.push(column.name)
    values.push(column.value)
  }

  const placeholders = insertColumns.map(() => '?').join(', ')
  const statement = db.prepare(`INSERT INTO users (${insertColumns.join(', ')}) VALUES (${placeholders})`).bind(...values)
  const result = await statement.run()

  if (!result.success) {
    throw new ResponseError('Unable to create user in D1', 500, result.error ?? result)
  }

  return { id: generatedId, clerk_user_id: profile.sub, email: profile.email ?? null }
}

async function getUsersTableMetadata(db: D1Database): Promise<UsersTableMetadata> {
  const columns = await getUsersTableColumnSet(db)
  const idColumn = columns.has('user_id') ? 'user_id' : 'id'

  if (!columns.has(idColumn)) {
    throw new ResponseError('users table is missing a user identifier column', 500)
  }

  return { columns, idColumn: idColumn as 'id' | 'user_id' }
}

async function getUsersTableColumnSet(db: D1Database): Promise<Set<string>> {
  try {
    const result = await db.prepare('PRAGMA table_info(users)').all<{ name: string }>()
    const names = result.results?.map(row => row.name).filter(Boolean) ?? []
    return new Set(names)
  } catch (error) {
    throw new ResponseError('Unable to inspect users table schema in D1', 500, error)
  }
}

function buildUserSelectColumns(metadata: UsersTableMetadata): string {
  const parts = [`${metadata.idColumn} as id`]

  if (metadata.columns.has('clerk_user_id')) {
    parts.push('clerk_user_id')
  }

  if (metadata.columns.has('email')) {
    parts.push('email')
  }

  return parts.join(', ')
}

function computeNextCreditsResetDate(reference: Date): string {
  const year = reference.getUTCFullYear()
  const month = reference.getUTCMonth()
  const reset = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0))
  return reset.toISOString()
}

function resolveDefaultCredits(value?: string): number {
  return 0
}
