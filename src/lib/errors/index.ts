/**
 * 에러 모듈 통합 export
 */

// Base API Error
export { ApiError, ErrorCodes, type StandardApiResponse, type ErrorCode } from './api'

// InsufficientCreditsError (기존 파일에서)
export { InsufficientCreditsError } from '@/lib/credits-utils'

// Handlers
export {
    createApiResponse,
    createErrorResponse,
    createErrorHandler,
    requireAuth,
    requireUserId,
} from './handlers'
