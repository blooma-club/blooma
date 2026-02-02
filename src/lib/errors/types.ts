export class ApiError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public code?: string,
        public details?: unknown
    ) {
        super(message)
        this.name = 'ApiError'
        if (Error.captureStackTrace) Error.captureStackTrace(this, ApiError)
    }

    static badRequest(message: string, details?: unknown): ApiError {
        return new ApiError(400, message, 'BAD_REQUEST', details)
    }

    static unauthorized(message = 'Authentication required'): ApiError {
        return new ApiError(401, message, 'UNAUTHORIZED')
    }

    static forbidden(message = 'Access denied'): ApiError {
        return new ApiError(403, message, 'FORBIDDEN')
    }

    static notFound(message = 'Resource not found'): ApiError {
        return new ApiError(404, message, 'NOT_FOUND')
    }

    static conflict(message: string, details?: unknown): ApiError {
        return new ApiError(409, message, 'CONFLICT', details)
    }

    static unprocessableEntity(message: string, details?: unknown): ApiError {
        return new ApiError(422, message, 'UNPROCESSABLE_ENTITY', details)
    }

    static internal(message = 'Internal server error', details?: unknown): ApiError {
        return new ApiError(500, message, 'INTERNAL_ERROR', details)
    }

    static externalApiError(message: string, details?: unknown): ApiError {
        return new ApiError(500, message, 'EXTERNAL_SERVICE_ERROR', details)
    }

    static serviceUnavailable(message = 'Service temporarily unavailable'): ApiError {
        return new ApiError(503, message, 'SERVICE_UNAVAILABLE')
    }
}

export type StandardApiResponse<T = unknown> = {
    success: boolean
    data?: T
    error?: {
        code: string
        message: string
        details?: unknown
    }
    meta?: {
        timestamp: string
        requestId?: string
    }
}

export const ErrorCodes = {
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    BAD_REQUEST: 'BAD_REQUEST',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    DATABASE_ERROR: 'DATABASE_ERROR',
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]
