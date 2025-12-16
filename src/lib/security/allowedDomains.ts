/**
 * Security: Domain Allowlist for SSRF Protection
 * 
 * 외부 URL을 가져올 때 허용된 도메인만 접근하도록 제한합니다.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Allowed Domains
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 이미지 프록시에서 허용하는 도메인 목록
 * SSRF 공격을 방지하기 위해 신뢰할 수 있는 도메인만 추가
 */
export const ALLOWED_IMAGE_DOMAINS = [
    // AI 생성 서비스
    'fal.media',
    'cdn.fal.ai',
    'v3.fal.media',
    'replicate.delivery',
    'replicate.com',

    // Cloudflare R2 (자체 스토리지)
    'r2.cloudflarestorage.com',
    'pub-', // R2 public bucket prefix

    // 기타 허용 도메인
    'storage.googleapis.com',
    'oaidalleapiprodscus.blob.core.windows.net', // OpenAI DALL-E
] as const

/**
 * 내부/로컬 IP 패턴 (SSRF 차단)
 */
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
    /^169\.254\.\d+\.\d+$/, // AWS metadata
]

// ─────────────────────────────────────────────────────────────────────────────
// Validation Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * URL이 허용된 도메인인지 확인
 */
export function isAllowedDomain(urlString: string): boolean {
    try {
        const url = new URL(urlString)
        const hostname = url.hostname.toLowerCase()

        // 내부 IP/호스트 차단
        if (isBlockedHost(hostname)) {
            return false
        }

        // 허용 도메인 확인
        return ALLOWED_IMAGE_DOMAINS.some(domain => {
            if (domain.endsWith('-')) {
                // prefix 매칭 (예: 'pub-')
                return hostname.startsWith(domain)
            }
            // 정확히 일치하거나 서브도메인
            return hostname === domain || hostname.endsWith(`.${domain}`)
        })
    } catch {
        return false
    }
}

/**
 * 내부 네트워크/로컬 호스트 확인
 */
export function isBlockedHost(hostname: string): boolean {
    return BLOCKED_PATTERNS.some(pattern => pattern.test(hostname))
}

/**
 * URL 검증 결과
 */
export type UrlValidationResult =
    | { valid: true; url: URL }
    | { valid: false; reason: string }

/**
 * URL 전체 검증 (형식 + 도메인)
 */
export function validateImageUrl(urlString: string): UrlValidationResult {
    // 빈 값 체크
    if (!urlString || typeof urlString !== 'string') {
        return { valid: false, reason: 'URL is required' }
    }

    // URL 파싱
    let url: URL
    try {
        url = new URL(urlString)
    } catch {
        return { valid: false, reason: 'Invalid URL format' }
    }

    // HTTPS만 허용
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return { valid: false, reason: 'Only HTTP(S) URLs are allowed' }
    }

    // 내부 호스트 차단
    if (isBlockedHost(url.hostname)) {
        return { valid: false, reason: 'Internal hosts are not allowed' }
    }

    // 도메인 허용 목록 확인
    if (!isAllowedDomain(urlString)) {
        return { valid: false, reason: 'Domain not in allowlist' }
    }

    return { valid: true, url }
}
