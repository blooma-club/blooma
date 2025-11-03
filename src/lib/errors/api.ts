/**
 * 중앙화된 API 에러 클래스 및 타입 정의
 */

/**
 * 표준화된 API 에러 클래스
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }
  }

  /**
   * Create a 400 Bad Request error
   */
  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, 'BAD_REQUEST', details)
  }

  /**
   * Create a 401 Unauthorized error
   */
  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED')
  }

  /**
   * Create a 403 Forbidden error
   */
  static forbidden(message = 'Access denied'): ApiError {
    return new ApiError(403, message, 'FORBIDDEN')
  }

  /**
   * Create a 404 Not Found error
   */
  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message, 'NOT_FOUND')
  }

  /**
   * Create a 409 Conflict error
   */
  static conflict(message: string, details?: unknown): ApiError {
    return new ApiError(409, message, 'CONFLICT', details)
  }

  /**
   * Create a 422 Unprocessable Entity error
   */
  static unprocessableEntity(message: string, details?: unknown): ApiError {
    return new ApiError(422, message, 'UNPROCESSABLE_ENTITY', details)
  }

  /**
   * Create a 500 Internal Server Error
   */
  static internal(message = 'Internal server error', details?: unknown): ApiError {
    return new ApiError(500, message, 'INTERNAL_ERROR', details)
  }

  /**
   * Create a 500 External API Error
   */
  static externalApiError(message: string, details?: unknown): ApiError {
    return new ApiError(500, message, 'EXTERNAL_SERVICE_ERROR', details)
  }

  /**
   * Create a 503 Service Unavailable error
   */
  static serviceUnavailable(message = 'Service temporarily unavailable'): ApiError {
    return new ApiError(503, message, 'SERVICE_UNAVAILABLE')
  }
}

/**
 * 표준화된 API 응답 타입
 */
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

/**
 * 에러 코드 상수
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Client Errors
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // Server Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  
  // External Service Errors
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

