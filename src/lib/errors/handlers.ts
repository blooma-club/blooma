/**
 * 표준화된 에러 핸들러
 */

import { NextResponse } from 'next/server'
import { ApiError, StandardApiResponse, ErrorCodes } from './api'
import { D1ConfigurationError, D1QueryError } from '@/lib/db/d1'
import { ZodError } from 'zod'
import { InsufficientCreditsError } from '@/lib/credits-utils'

// 프로덕션 환경 확인
const isProduction = process.env.NODE_ENV === 'production'

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

  // error.details가 객체인지 확인
  const errorDetails = isApiError && error.details && typeof error.details === 'object' && error.details !== null
    ? error.details
    : undefined

  const response: StandardApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(errorDetails && { details: errorDetails }),
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
      const zodIssues = error.issues || []
      const issues = zodIssues.length > 0
        ? zodIssues.map((err) => ({
          path: Array.isArray(err.path) ? err.path.map(String).join('.') : String(err.path || ''),
          message: err.message || 'Validation error',
        }))
        : [{ path: '', message: 'Validation failed' }]

      const apiErr = ApiError.unprocessableEntity('Validation failed', { issues })
      if (context) {
        console.error(`[${context}] Validation error:`, zodIssues)
      }
      return createErrorResponse(apiErr, { context, requestId, ...options })
    }

    // InsufficientCreditsError 처리
    if (error instanceof InsufficientCreditsError) {
      const creditErr = new ApiError(402, 'Not enough credits', 'INSUFFICIENT_CREDITS')
      if (context) {
        console.error(`[${context}] Insufficient credits error`)
      }
      return createErrorResponse(creditErr, { context, requestId, ...options })
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

    // 데이터베이스 에러 처리 (프로덕션에서는 상세정보 숨김)
    if (error instanceof D1ConfigurationError) {
      if (context) {
        console.error(`[${context}] D1 configuration error:`, error)
      }
      const dbErr = ApiError.internal(
        isProduction ? 'Database error' : 'Database configuration error'
      )
      return createErrorResponse(dbErr, { context, requestId, ...options })
    }

    if (error instanceof D1QueryError) {
      if (context) {
        // 로그에만 상세 정보 기록 (프로덕션에서도 서버 로그에는 남김)
        console.error(`[${context}] D1 query failed:`, {
          message: error.message,
          details: error.details,
        })
      }
      // 응답에서는 상세 정보 제거
      const queryErr = ApiError.internal(
        isProduction ? 'Database error' : 'Database query failed'
      )
      return createErrorResponse(queryErr, { context, requestId, ...options })
    }



    // 일반 에러 처리 (프로덕션에서는 상세정보 숨김)
    if (error instanceof Error) {
      if (context) {
        console.error(`[${context}] Unexpected error:`, {
          name: error.name,
          message: error.message,
          stack: error.stack,
        })
      }
      const generalErr = ApiError.internal(
        isProduction ? 'An error occurred' : error.message
      )
      return createErrorResponse(generalErr, { context, requestId, ...options })
    }

    // 알 수 없는 에러
    if (context) {
      console.error(`[${context}] Unknown error:`, error)
    }
    const unknownErr = ApiError.internal('An error occurred')
    return createErrorResponse(unknownErr, { context, requestId, ...options })
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

