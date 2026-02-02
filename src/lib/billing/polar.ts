/**
 * Polar Configuration
 */

export function resolvePolarServerURL(): string | undefined {
    // Allow overriding the Polar API URL (e.g. for testing or proxies)
    if (process.env.POLAR_SERVER_URL) {
        return process.env.POLAR_SERVER_URL
    }

    // Default let SDK handle it (production or sandbox based on 'server' param)
    return undefined
}
