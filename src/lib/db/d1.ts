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

export async function queryD1<T = unknown>(
  sql: string,
  params: unknown[] = [],
  options?: QueryOptions
): Promise<T[]> {
  const { accountId, databaseId, apiToken, apiBaseUrl } = resolveConfig()

  const endpoint = `${apiBaseUrl}/accounts/${accountId}/d1/database/${databaseId}/query`

  const requestInit: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
      ...options?.requestInit?.headers,
    },
    body: JSON.stringify({ sql, params }),
    ...options?.requestInit,
  }

  const response = await fetch(endpoint, requestInit)

  const payload = await parseResponse<T>(response)

  if (!response.ok || !payload.success) {
    const messages =
      payload.errors?.map(error => error.message).join('; ') ||
      `${response.status} ${response.statusText}`

    // 더 자세한 에러 로깅 추가
    console.error('[D1 Query Error]', {
      status: response.status,
      statusText: response.statusText,
      errors: payload.errors,
      messages,
      sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''), // SQL 쿼리 일부만 로깅
      paramsCount: params.length,
      endpoint: endpoint.replace(accountId, '[ACCOUNT_ID]').replace(databaseId, '[DATABASE_ID]'),
    })

    throw new D1QueryError('Cloudflare D1 query failed', {
      status: response.status,
      statusText: response.statusText,
      errors: payload.errors,
      messages,
      sql,
      params,
    })
  }

  const statements = normalizeResults(payload.result)
  const lastStatement = statements.at(-1)

  if (!lastStatement) {
    return []
  }

  if (!lastStatement.success) {
    throw new D1QueryError('Cloudflare D1 statement failed', {
      error: lastStatement.error,
      sql,
      params,
    })
  }

  return lastStatement.results ?? []
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
