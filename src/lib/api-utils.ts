import { NextResponse } from 'next/server'

/**
 * Standardized API error responses
 * Use these functions to ensure consistent error handling across all API routes
 */

export type ApiErrorResponse = {
  success: false
  error: string
  code?: string
}

export type ApiSuccessResponse<T> = {
  success: true
  data: T
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * HTTP Status codes used across the API
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  status: number = HttpStatus.INTERNAL_SERVER_ERROR,
  code?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ success: false, error, code }, { status })
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = HttpStatus.OK
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Common error response helpers
 */
export const ApiErrors = {
  unauthorized: (message = 'Authentication required') =>
    createErrorResponse(message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED'),

  forbidden: (message = 'Access denied') =>
    createErrorResponse(message, HttpStatus.FORBIDDEN, 'FORBIDDEN'),

  notFound: (resource = 'Resource') =>
    createErrorResponse(`${resource} not found`, HttpStatus.NOT_FOUND, 'NOT_FOUND'),

  badRequest: (message = 'Invalid request') =>
    createErrorResponse(message, HttpStatus.BAD_REQUEST, 'BAD_REQUEST'),

  conflict: (message = 'Resource already exists') =>
    createErrorResponse(message, HttpStatus.CONFLICT, 'CONFLICT'),

  tooManyRequests: (message = 'Rate limit exceeded') =>
    createErrorResponse(message, HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMITED'),

  internalError: (message = 'Internal server error') =>
    createErrorResponse(message, HttpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR'),
} as const

/**
 * Handle API route errors with standardized logging
 */
export function handleApiError(
  error: unknown,
  context: string,
  consoleError: typeof console.error = console.error
): NextResponse<ApiErrorResponse> {
  if (error instanceof Error) {
    consoleError(`[API Error] ${context}:`, error.message, error.stack)
    return createErrorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
  }

  consoleError(`[API Error] ${context}:`, error)
  return ApiErrors.internalError()
}

/**
 * Wrapper for async API route handlers with automatic error handling
 */
export function withApiHandler<T>(
  handler: () => Promise<NextResponse<T>>,
  context: string
): Promise<NextResponse<T | ApiErrorResponse>> {
  return handler().catch(
    error => handleApiError(error, context) as NextResponse<T | ApiErrorResponse>
  )
}
