'use server'

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

function ensureServerRuntime() {
  if (typeof window !== 'undefined') {
    throw new D1ConfigurationError('Cloudflare D1 utilities must be called from a server environment')
  }
}

function resolveConfig(): D1Config {
  if (cachedConfig) return cachedConfig

  ensureServerRuntime()

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID
  const apiToken = process.env.CLOUDFLARE_D1_API_TOKEN
  const apiBaseUrl = process.env.CLOUDFLARE_API_BASE_URL ?? DEFAULT_API_BASE_URL

  if (!accountId) {
    throw new D1ConfigurationError('CLOUDFLARE_ACCOUNT_ID is not configured')
  }
  if (!databaseId) {
    throw new D1ConfigurationError('CLOUDFLARE_D1_DATABASE_ID is not configured')
  }
  if (!apiToken) {
    throw new D1ConfigurationError('CLOUDFLARE_D1_API_TOKEN is not configured')
  }

  cachedConfig = {
    accountId,
    databaseId,
    apiToken,
    apiBaseUrl,
  }

  return cachedConfig
}

function normalizeResults<T>(
  result: CloudflareD1Response<T>['result']
): D1StatementResult<T>[] {
  if (!result) return []
  return Array.isArray(result) ? result : [result]
}

function extractMetaDuration(meta: unknown): number | null {
  if (!meta || typeof meta !== 'object') return null
  const durationValue = (meta as { duration?: unknown }).duration
  if (typeof durationValue === 'number') return durationValue
  if (typeof durationValue === 'string') {
    const parsed = Number(durationValue)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function buildSqlPreview(sql: string, maxLength = 160): string {
  const compact = sql.replace(/\s+/g, ' ').trim()
  return compact.length > maxLength ? `${compact.slice(0, maxLength)}...` : compact
}

function formatDuration(ms: number | null): number | null {
  if (typeof ms !== 'number' || Number.isNaN(ms)) return null
  return Number(ms.toFixed(2))
}

async function parseResponse<T>(response: Response): Promise<CloudflareD1Response<T>> {
  const text = await response.text()

  try {
    return JSON.parse(text) as CloudflareD1Response<T>
  } catch {
    throw new D1QueryError('Unable to parse Cloudflare D1 response payload', text)
  }
}

type QueryOptions = {
  /**
   * Optional request configuration passed to fetch.
   * Use cautiously; overriding headers may break authentication.
   */
  requestInit?: RequestInit
}

type D1BatchStatement = {
  sql: string
  params?: unknown[]
}

type D1RequestPayload =
  | {
    sql: string
    params?: unknown[]
  }
  | {
    batch: D1BatchStatement[]
  }

function isBatchPayload(payload: D1RequestPayload): payload is { batch: D1BatchStatement[] } {
  return 'batch' in payload
}

async function executeD1Request<T>(
  requestPayload: D1RequestPayload,
  options?: QueryOptions
): Promise<D1StatementResult<T>[]> {
  const batchPayload = isBatchPayload(requestPayload)
  const sqlPreview = batchPayload
    ? requestPayload.batch.map(entry => buildSqlPreview(entry.sql)).join(' | ')
    : buildSqlPreview(requestPayload.sql)
  const totalParams = batchPayload
    ? requestPayload.batch.reduce((total, statement) => total + (statement.params?.length ?? 0), 0)
    : requestPayload.params?.length ?? 0
  const sqlForLog = batchPayload
    ? requestPayload.batch.map(statement => statement.sql).join('; ')
    : requestPayload.sql
  const paramsForLog = batchPayload
    ? requestPayload.batch.map(statement => statement.params ?? [])
    : requestPayload.params ?? []
  const requestBody = batchPayload
    ? { batch: requestPayload.batch }
    : { sql: requestPayload.sql, params: requestPayload.params }
  const startedAt = performance.now()
  let fetchDurationMs: number | null = null
  let statementDurationMs: number | null = null
  let rowCount: number | null = null
  let lastError: string | null = null

  try {
    const { accountId, databaseId, apiToken, apiBaseUrl } = resolveConfig()

    const endpoint = `${apiBaseUrl}/accounts/${accountId}/d1/database/${databaseId}/query`

    const requestInit: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
        ...options?.requestInit?.headers,
      },
      body: JSON.stringify(requestBody),
      ...options?.requestInit,
    }

    const response = await fetch(endpoint, requestInit)
    fetchDurationMs = performance.now() - startedAt

    const responsePayload = await parseResponse<T>(response)

    if (!response.ok || !responsePayload.success) {
      lastError = 'HTTP_ERROR'

      const messages =
        responsePayload.errors?.map(error => error.message).join('; ') ||
        `${response.status} ${response.statusText}`

      // 더 자세한 에러 로깅 추가
      console.error('[D1 Query Error]', {
        status: response.status,
        statusText: response.statusText,
        errors: responsePayload.errors,
        messages,
        sql: sqlForLog.substring(0, 200) + (sqlForLog.length > 200 ? '...' : ''), // SQL 쿼리 일부만 로깅
        paramsCount: totalParams,
        endpoint: endpoint.replace(accountId, '[ACCOUNT_ID]').replace(databaseId, '[DATABASE_ID]'),
      })

      throw new D1QueryError('Cloudflare D1 query failed', {
        status: response.status,
        statusText: response.statusText,
        errors: responsePayload.errors,
        messages,
        sql: batchPayload ? requestPayload.batch.map(statement => statement.sql) : requestPayload.sql,
        params: paramsForLog,
      })
    }

    const statements = normalizeResults(responsePayload.result)
    const lastStatement = statements.at(-1)

    if (!lastStatement) {
      rowCount = 0
      return []
    }

    rowCount = lastStatement.results?.length ?? 0
    statementDurationMs = extractMetaDuration(lastStatement.meta)

    if (!lastStatement.success) {
      lastError = 'STATEMENT_ERROR'
      throw new D1QueryError('Cloudflare D1 statement failed', {
        error: lastStatement.error,
        sql: batchPayload ? requestPayload.batch.map(statement => statement.sql) : requestPayload.sql,
        params: paramsForLog,
      })
    }

    return statements
  } catch (error) {
    if (fetchDurationMs === null) {
      fetchDurationMs = performance.now() - startedAt
    }
    if (!lastError) {
      lastError = error instanceof Error ? error.name : 'UNKNOWN_ERROR'
    }
    throw error
  } finally {
    // Timing logs removed for production
  }
}

export async function queryD1<T = unknown>(
  sql: string,
  params: unknown[] = [],
  options?: QueryOptions
): Promise<T[]> {
  const statements = await executeD1Request<T>({ sql, params }, options)
  const lastStatement = statements.at(-1)
  return lastStatement?.results ?? []
}

export async function queryD1Batch<T = unknown>(
  statements: D1BatchStatement[],
  options?: QueryOptions
): Promise<D1StatementResult<T>[]> {
  if (statements.length === 0) {
    return []
  }

  return executeD1Request<T>({ batch: statements }, options)
}

export async function queryD1Single<T = unknown>(
  sql: string,
  params: unknown[] = [],
  options?: QueryOptions
): Promise<T | null> {
  const rows = await queryD1<T>(sql, params, options)
  return rows.length > 0 ? rows[0] : null
}

export { D1ConfigurationError, D1QueryError }
