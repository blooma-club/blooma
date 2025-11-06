/**
 * 표준화된 에러 핸들러
 */

import { NextResponse } from 'next/server'
import { ApiError, StandardApiResponse, ErrorCodes } from './api'
import { D1ConfigurationError, D1QueryError } from '@/lib/db/d1'
import { D1ProjectsTableError, ProjectNotFoundError } from '@/lib/db/projects'
import { ZodError } from 'zod'

/**
 * 에러 핸들러 옵션
 */
type ErrorHandlerOptions = {
  /**
   * 컨텍스트 이름 (로깅용)
   */
  context?: string
  /**
   * 요청 ID (선택적)
   */
  requestId?: string
  /**
   * 개발 모드에서 스택 트레이스 포함 여부
   */
  includeStackTrace?: boolean
}

/**
 * 표준화된 API 응답 생성
 */
export function createApiResponse<T>(
  data?: T,
  options?: { requestId?: string }
): NextResponse<StandardApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(options?.requestId && { requestId: options.requestId }),
    },
  })
}

/**
 * 에러 응답 생성
 */
export function createErrorResponse(
  error: ApiError | Error,
  options?: ErrorHandlerOptions
): NextResponse<StandardApiResponse> {
  const isApiError = error instanceof ApiError
  const statusCode = isApiError ? error.statusCode : 500
  const code = isApiError ? error.code || ErrorCodes.INTERNAL_ERROR : ErrorCodes.INTERNAL_ERROR
  const message = error.message || 'An unexpected error occurred'

  const response: StandardApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(isApiError && error.details && { details: error.details }),
      ...(options?.includeStackTrace && process.env.NODE_ENV === 'development' && {
        stack: error.stack,
      }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...(options?.requestId && { requestId: options.requestId }),
    },
  }

  return NextResponse.json(response, { status: statusCode })
}

/**
 * 범용 에러 핸들러 생성
 * 
 * @example
 * ```ts
 * const handleError = createErrorHandler('api/projects')
 * try {
 *   // ...
 * } catch (error) {
 *   return handleError(error)
 * }
 * ```
 */
export function createErrorHandler(
  context?: string,
  options?: Omit<ErrorHandlerOptions, 'context'>
): (error: unknown) => NextResponse<StandardApiResponse> {
  return (error: unknown): NextResponse<StandardApiResponse> => {
    const requestId = options?.requestId || generateRequestId()

    // Zod 검증 에러 처리
    if (error instanceof ZodError) {
      const issues = Array.isArray(error.errors) && error.errors.length > 0
        ? error.errors.map(err => ({
            path: Array.isArray(err.path) ? err.path.join('.') : String(err.path || ''),
            message: err.message || 'Validation error',
          }))
        : [{ path: '', message: 'Validation failed' }]
      
      const apiError = ApiError.unprocessableEntity('Validation failed', {
        issues,
      })
      if (context) {
        console.error(`[${context}] Validation error:`, error.errors)
      }
      return createErrorResponse(apiError, { context, requestId, ...options })
    }

    // ApiError는 직접 처리
    if (error instanceof ApiError) {
      if (context) {
        console.error(`[${context}] API Error:`, {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          details: error.details,
        })
      }
      return createErrorResponse(error, { context, requestId, ...options })
    }

    // 데이터베이스 에러 처리
    if (error instanceof D1ConfigurationError) {
      const apiError = ApiError.internal('Database configuration error', {
        message: error.message,
      })
      if (context) {
        console.error(`[${context}] D1 configuration error:`, error)
      }
      return createErrorResponse(apiError, { context, requestId, ...options })
    }

    if (error instanceof D1QueryError) {
      const apiError = ApiError.internal('Database query failed', {
        details: error.details,
      })
      if (context) {
        console.error(`[${context}] D1 query failed:`, {
          message: error.message,
          details: error.details,
        })
      }
      return createErrorResponse(apiError, { context, requestId, ...options })
    }

    // 도메인 에러 처리
    if (error instanceof ProjectNotFoundError) {
      const apiError = ApiError.notFound(error.message)
      if (context) {
        console.error(`[${context}] Project not found:`, error.message)
      }
      return createErrorResponse(apiError, { context, requestId, ...options })
    }

    if (error instanceof D1ProjectsTableError) {
      const apiError = ApiError.internal('Database table operation failed', {
        details: error.details,
      })
      if (context) {
        console.error(`[${context}] Projects table operation failed:`, error.details)
      }
      return createErrorResponse(apiError, { context, requestId, ...options })
    }

    // 일반 에러 처리
    if (error instanceof Error) {
      const apiError = ApiError.internal(error.message, {
        name: error.name,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      })
      if (context) {
        console.error(`[${context}] Unexpected error:`, {
          name: error.name,
          message: error.message,
          stack: error.stack,
        })
      }
      return createErrorResponse(apiError, { context, requestId, ...options })
    }

    // 알 수 없는 에러
    const apiError = ApiError.internal('An unknown error occurred')
    if (context) {
      console.error(`[${context}] Unknown error:`, error)
    }
    return createErrorResponse(apiError, { context, requestId, ...options })
  }
}

/**
 * 요청 ID 생성 (간단한 UUID v4 기반)
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 인증 검증 헬퍼
 */
export async function requireAuth(): Promise<{ userId: string }> {
  const { auth } = await import('@clerk/nextjs/server')
  const { userId } = await auth()
  
  if (!userId) {
    throw ApiError.unauthorized()
  }
  
  return { userId }
}

/**
 * 사용자 권한 검증 헬퍼
 */
export function requireUserId(userId: string | null | undefined): string {
  if (!userId) {
    throw ApiError.unauthorized()
  }
  return userId
}

