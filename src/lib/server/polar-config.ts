const PORTAL_SEGMENT = /\/portal(\/|$)/i

function normalizeUrl(url: URL): string {
  const normalizedPath = url.pathname.replace(/\/+$/, '')
  url.pathname = normalizedPath
  url.search = ''
  url.hash = ''

  return url.toString().replace(/\/+$/, '')
}

let cachedServerURL: string | null | undefined

export function resolvePolarServerURL(): string | undefined {
  if (cachedServerURL !== undefined) {
    return cachedServerURL ?? undefined
  }

  const raw = process.env.POLAR_API_BASE_URL
  if (!raw) {
    cachedServerURL = null
    return undefined
  }

  const trimmed = raw.trim()
  if (!trimmed) {
    cachedServerURL = null
    return undefined
  }

  try {
    const parsed = new URL(trimmed)

    if (PORTAL_SEGMENT.test(parsed.pathname)) {
      console.warn(
        'POLAR_API_BASE_URL points to a customer portal URL. API requests require the API origin (e.g. https://api.polar.sh); ignoring override.'
      )
      cachedServerURL = null
      return undefined
    }

    cachedServerURL = normalizeUrl(parsed)
    return cachedServerURL
  } catch (error) {
    console.warn('POLAR_API_BASE_URL is not a valid absolute URL. Ignoring override.', error)
    cachedServerURL = null
    return undefined
  }
}
