import { ALLOWED_IMAGE_DOMAINS } from '@/lib/constants'

const DYNAMIC_ALLOWED_HOSTS = new Set<string>()

function addAllowedHost(urlString?: string) {
    if (!urlString) return
    try {
        const url = new URL(urlString)
        if (url.hostname) DYNAMIC_ALLOWED_HOSTS.add(url.hostname.toLowerCase())
    } catch {
        return
    }
}

addAllowedHost(process.env.R2_PUBLIC_BASE_URL)
addAllowedHost(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL)
addAllowedHost(process.env.NEXT_PUBLIC_APP_URL)
addAllowedHost(process.env.APP_URL)

// Removed local definition
const BLOCKED_PATTERNS = [
    /^localhost$/i,
    /^127\.\d+\.\d+\.\d+$/,
    /^10\.\d+\.\d+\.\d+$/,
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
    /^192\.168\.\d+\.\d+$/,
    /^0\.0\.0\.0$/,
    /^::1$/,
    /^\[::1\]$/,
    /^metadata\.google\.internal$/i,
    /^169\.254\.\d+\.\d+$/,
]

export function isBlockedHost(hostname: string): boolean {
    return BLOCKED_PATTERNS.some(pattern => pattern.test(hostname))
}

export function isAllowedDomain(urlString: string): boolean {
    try {
        const url = new URL(urlString)
        const hostname = url.hostname.toLowerCase()
        if (isBlockedHost(hostname)) return false
        if (DYNAMIC_ALLOWED_HOSTS.has(hostname)) return true
        return ALLOWED_IMAGE_DOMAINS.some(domain => {
            if (domain.endsWith('-')) return hostname.startsWith(domain)
            return hostname === domain || hostname.endsWith(`.${domain}`)
        })
    } catch { return false }
}

export type UrlValidationResult =
    | { valid: true; url: URL }
    | { valid: false; reason: string }

export function validateImageUrl(urlString: string): UrlValidationResult {
    if (!urlString || typeof urlString !== 'string') return { valid: false, reason: 'URL is required' }
    let url: URL
    try { url = new URL(urlString) } catch { return { valid: false, reason: 'Invalid URL format' } }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') return { valid: false, reason: 'Only HTTP(S) URLs are allowed' }
    if (isBlockedHost(url.hostname)) return { valid: false, reason: 'Internal hosts are not allowed' }
    if (!isAllowedDomain(urlString)) return { valid: false, reason: 'Domain not in allowlist' }

    return { valid: true, url }
}
